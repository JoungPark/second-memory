# AWS Migration Plan

Deploy Lambda memory first, then Lambda ask. During rollout, each existing endpoint continues serving its clients at its current URL, with its current deployment, configuration, and database connection. Both endpoint sets use the current PostgreSQL database. New web and mobile releases select the Lambda URLs. The web app stays on Vercel. Retirement is the first change to either existing endpoint.

## 1. Deploy and verify Lambda memory

Use AWS CDK to deploy memory-service as a native Lambda Web Function on Node.js 24 and Arm64. Configure a regional HTTPS endpoint with application-managed authentication. Expose unauthenticated `GET /health` and Firebase-authenticated `GET /v1/memories` and `POST /v1/memories`. Document these routes in Swagger UI at `/docs` and serve the OpenAPI document at `/docs-json`. Allow the approved Vercel origins through CORS.

### Configure and deploy

Set a budget alert in the target AWS account. Store the database URL and embedding API key as separate regional SSM Parameter Store `SecureString` parameters. Scope the execution role's reads to those parameters and grant decryption permission if they use a customer-managed key. Load the credentials at startup and connect to PostgreSQL on the first query.

Package and verify the application and its native Prisma engine for the Lambda runtime. Require PostgreSQL TLS with strict certificate verification. Give Prisma the database provider's trusted CA when the provider uses a private CA. For Aiven, use the project CA. Verify that the existing database accepts TLS connections from Lambda's public IPv4 egress during coexistence. [Lambda Web networking](https://docs.aws.amazon.com/lambda/latest/dg/web-functions-networking.html)

Start with up to five execution environments, one concurrent request and one Prisma connection per environment, and a 30-second request timeout. Generate embeddings inline with a 15-second provider timeout. Use the model that produced the existing 1536-dimensional vectors. Record the endpoint URL and deployed revision. Configure CloudWatch alarms for HTTP 5xx responses and environment throttling.

### Verify and roll back

Run memory-service lint and unit tests. Run the end-to-end suite against a disposable PostgreSQL database with pgvector because the suite applies migrations and deletes its test data. Use authenticated API smoke checks and read-only SQL verification for the shared database.

**Acceptance before client rollout**

- Verify that the SDK receives HTTP 200 with `status: "ok"` and `database: "ok"` from `/health`. Verify that the endpoint reports HTTP 503 if its database probe fails.
- Verify CORS preflight with `Authorization` and `Content-Type` from the approved Vercel preview and production origins. Verify capture and listing on the Vercel and Expo previews.
- With a dedicated account, capture through Lambda and recall the memory through existing ask. Capture a second memory through the existing memory endpoint and list it through Lambda. Verify the Lambda-created embedding with a SQL similarity query.
- Verify that both memory routes reject unauthenticated requests, each test account sees only its own entries, and both internal POST routes return HTTP 404 with supplied identity headers.
- Open `/docs` and verify `/docs-json` lists only `/health` and `/v1/memories`. Use **Authorize** with a Firebase ID token to test the documented memory routes.
- Exercise an idempotent capture retry with the same key. With a test embedding provider that stalls, verify a capture returns HTTP 503 and leaves no partial entry. Verify the function can start within Lambda Web’s ten-second initialization limit and record cold and warm latency, errors, throttles, and database connections while the existing services are running.

**Memory revision rollback.** Retain each verified deployment artifact and its configuration. Rehearse restoring the previous revision on the same endpoint in the same Region. Verify that the URL stays the same and the restored revision uses credentials and a CA that match its database endpoint. [AWS revision rollback](https://docs.aws.amazon.com/lambda/latest/dg/web-functions-deployment.html)

**Credential rotation.** Roll out rotated credentials to fresh execution environments and verify connectivity before retiring the prior credential where the rotation permits. Ensure the rollback revision can use an active credential.

## 2. Deploy and verify Lambda ask

1. Give Lambda ask a dedicated Redis session store accessible to all its instances. Disable disk persistence and backups for this store. Preserve tenant and user ownership, turn order, and the sliding `SESSION_TTL_MS`. Delete the session after a successful summary save or explicit close. Existing ask continues to own its sessions in process memory.
2. Create a dedicated IAM-authenticated Lambda Web endpoint for the internal memory service, with its own deployment that registers `POST /internal/v1/memories` and `POST /internal/v1/memories/search`. Grant the ask Lambda role `lambda:InvokeWebFunctionEndpoint` on that endpoint ARN. Sign calls with regional SigV4 for the `lambda` service and include `X-Amz-Content-SHA256`. [Lambda Web endpoint access control](https://docs.aws.amazon.com/lambda/latest/dg/web-functions-endpoint-access-control.html)
3. Deploy Lambda ask with the current database and LLM provider. Grant its execution role read access to the shared `DATABASE_URL` parameter in SSM and configure the database provider's CA for verified TLS. Set its `MEMORY_SERVICE_URL` to the IAM-authenticated internal memory endpoint. Verify connectivity to Redis, PostgreSQL, Firebase, the LLM provider, and the signed memory API from the deployed function.
4. Expose unauthenticated `GET /health` and Firebase-authenticated `POST /v1/ask/messages`, `POST /v1/ask/end`, and `POST /v1/ask/close`. Enable CORS for the Vercel preview and production origins.
5. Generate a separate OpenAPI document from the internal memory deployment profile and publish it where only the team can access it, such as a private CI artifact. Document the required tenant and user headers and SigV4 signing for live requests.

**Acceptance before client rollout**

- Verify the ask health response with the SDK. Recall an AWS-captured memory as its owner and verify isolation with a second account. Confirm the internal memory routes reject unsigned calls and callers without route permissions.
- Verify the private memory OpenAPI document describes both internal routes and the public document lists only public routes.
- Start a conversation and send a follow-up on a different Lambda execution environment. Verify that the follow-up uses the first turn and that ending the conversation creates exactly one summary visible through memory. In separate sessions, verify that closing discards the turns, inactivity expires the session, and another user cannot resume it.
- Exercise slow and unavailable memory and LLM providers. Record ask latency, Lambda duration, errors, and database connections.

## 3. Switch client traffic while both endpoint sets are live

1. After phase 1 passes, deploy a Vercel preview with `NEXT_PUBLIC_MEMORY_API_URL` and a mobile preview build with `EXPO_PUBLIC_MEMORY_API_URL` pointing to Lambda memory. Keep ask on its existing URL. Verify sign-in, both health checks, capture, listing, and recall on web and mobile. Then deploy the production web release and roll out the mobile build.
2. After phase 2 passes, repeat preview and production rollout for `NEXT_PUBLIC_ASK_API_URL` and `EXPO_PUBLIC_ASK_API_URL`. Bind each conversation to the ask URL used for its first message. Send all follow-ups, end, and close requests for that session to the same URL. Apply the new default to the next conversation.
3. Test a conversation already open during the switch and a new one afterward. Verify health, sending, and recall on both clients, including a supported release using the existing URLs. Monitor errors, latency, and traffic by endpoint throughout coexistence.

**Client rollback.** Restore the prior Vercel deployment and issue a corrective mobile build using the previous URLs. Apply the same session routing rule during rollback. Verify that an open Lambda conversation can finish on Lambda and a new conversation can start on existing ask. Keep both endpoint sets serving throughout the rollback window.

## 4. Retire the existing endpoints and deployments

1. **Existing ask first.** Wait for the ask rollback window to close. Confirm that supported client releases have moved off the existing URL and use existing traffic records to verify that active conversations have drained. Allow at least the configured session TTL after the last session activity for abandoned conversations to expire. Verify Lambda ask, remove the existing ask route or hostname mapping, and retire its backing deployment.
2. **Existing memory second.** Wait for the memory rollback window to close. Check supported client URLs and existing traffic records for public and internal callers. Verify that every active or rollback ask deployment uses Lambda memory. Verify Lambda capture, listing, and recall, then remove the existing memory route or hostname mapping and retire its backing deployment.
3. A supported client or internal caller that still needs an existing URL postpones that endpoint's retirement. After each removal, verify that the retired URL has stopped serving the API and repeat the client health, capture, and recall checks.

## 5. Move PostgreSQL to Amazon RDS after both retirements

1. Prepare a private RDS target in the services' AWS Region with an engine version that supports the existing schema and `vector` extension. Attach a VPC egress network connector to the memory Web Function revisions. Permit database access from Lambda, the migration runner, and any retained workers. Preserve outbound access to SSM Parameter Store, Firebase, and the model providers. Configure each database client to connect using the RDS endpoint hostname and verify its certificate against the appropriate RDS root CA. [Lambda Web networking](https://docs.aws.amazon.com/lambda/latest/dg/web-functions-networking.html) · [Amazon RDS PostgreSQL TLS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html)
2. Rehearse backup and restore with a migration role. Compare Prisma migration history, row counts, the `vector(1536)` column, and representative vector search results between source and target.
3. Put the public Lambda APIs into maintenance mode, including authenticated reads because a first request can create a user and tenant. Stop any active outbox relays and workers, drain in-flight requests and jobs, and block application writes on the source database. Take the final backup, restore it into RDS, and repeat the database checks.
4. Store the RDS database URL in a separate SSM `SecureString` parameter. Deploy fresh memory and ask revisions that use the RDS connection and CA. Route the Web Function endpoints and the ask API to those deployments and update any retained workers while they are paused. Through a restricted test path, capture, list, and recall a uniquely identifiable memory. Confirm the record directly on RDS and verify that the source accepted no writes during the freeze.
5. Reopen public traffic and restart workers after verification. Repeat client health, capture, and recall checks and monitor errors, latency, and database connections.

**Database rollback.** Before public writes resume, restore the source database connection and CA for both Lambdas and any retained workers. Verify against the source before reopening. After public writes resume, RDS is authoritative. To switch back, repeat the freeze and drain, reconcile RDS changes into the source, and repeat database and endpoint checks before reopening on the source.

**Database retirement.** After the rollback window closes, verify all remaining services and workers use RDS, retain a final source backup, and retire the source database.
