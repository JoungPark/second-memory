# AWS Migration Plan

Deploy Lambda memory first, then Lambda ask. During rollout, each existing endpoint continues serving its clients at its current URL, with its current deployment, configuration, and database connection. Both endpoint sets use the current PostgreSQL database. New web and mobile releases select the Lambda URLs. The web app stays on Vercel. Retirement is the first change to either existing endpoint.

## 1. Deploy and verify Lambda memory

1. Choose the AWS account and region, verify the account with `aws sts get-caller-identity`, set a budget alert, and run `cdk bootstrap aws://<account-id>/<region>`.
2. Add a Lambda entry point that reuses NestJS validation and initializes the app once per execution environment. Keep the local HTTP entry point. Package Prisma Client and its query engine for the Lambda Linux runtime and architecture.
3. Configure inline embeddings using the model that produced the existing search vectors. Load the embedding credentials and current `DATABASE_URL` from Secrets Manager. Verify database connectivity and TLS from Lambda, along with outbound access to Firebase and the embedding provider. Start with reserved concurrency of five and Prisma `connection_limit=1`.
4. Expose unauthenticated `GET /health` and Firebase-authenticated `GET /v1/memories` and `POST /v1/memories` through API Gateway. Allow the Vercel preview and production origins. Keep internal routes unavailable until phase 2. Review `cdk synth` and `cdk diff`, deploy, and configure CloudWatch alarms for API 5xx responses and Lambda errors.

**Acceptance before client rollout**

- Verify that the SDK receives HTTP 200 and `status: "ok"` from the Lambda health route and that the Vercel preview passes CORS preflight.
- With a dedicated account, capture through Lambda and recall the memory through existing ask. Capture a second memory through the existing memory endpoint and list it through Lambda. Verify the Lambda-created embedding with a SQL similarity query.
- Verify that the memory routes reject unauthenticated requests, each account sees only its own entries, and the internal routes are unreachable even with supplied identity headers.
- Record cold and warm latency, errors, throttles, and database connections under concurrent load while the existing services are running.

## 2. Deploy and verify Lambda ask

1. Give Lambda ask a dedicated Redis session store accessible to all its instances. Disable disk persistence and backups for this store. Preserve tenant and user ownership, turn order, and the sliding `SESSION_TTL_MS`. Delete the session after a successful summary save or explicit close. Existing ask continues to own its sessions in process memory.
2. Protect the Lambda memory routes `POST /internal/v1/memories` and `POST /internal/v1/memories/search` with IAM. Grant the ask Lambda role `execute-api:Invoke` on those routes and sign its requests with SigV4.
3. Deploy Lambda ask with the current database and LLM provider. Set its `MEMORY_SERVICE_URL` to Lambda memory. Verify connectivity to Redis, PostgreSQL, Firebase, the LLM provider, and the signed memory API from the deployed function.
4. Expose unauthenticated `GET /health` and Firebase-authenticated `POST /v1/ask/messages`, `POST /v1/ask/end`, and `POST /v1/ask/close`. Enable CORS for the Vercel preview and production origins.

**Acceptance before client rollout**

- Verify the ask health response with the SDK. Recall an AWS-captured memory as its owner and verify isolation with a second account. Confirm the internal memory routes reject unsigned calls and callers without route permissions.
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

1. Prepare a private RDS target in the services' AWS region with an engine version that supports the existing schema and `vector` extension. Permit database access from Lambda, the migration runner, and any retained workers. Preserve outbound access to Firebase and the model providers. Configure Prisma and the migration runner to verify the database certificate with the RDS CA bundle. [AWS Lambda VPC networking](https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html), [Amazon RDS PostgreSQL TLS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html)
2. Rehearse backup and restore with a migration role. Compare Prisma migration history, row counts, the `vector(1536)` column, and representative vector search results between source and target.
3. Put the public Lambda APIs into maintenance mode, including authenticated reads because a first request can create a user and tenant. Stop any active outbox relays and workers, drain in-flight requests and jobs, and block application writes on the source database. Take the final backup, restore it into RDS, and repeat the database checks.
4. Update `DATABASE_URL` in Secrets Manager and deploy fresh versions of both Lambdas that load the RDS connection. Route the gateways to those versions and update any retained workers while they are paused. Through a restricted test path, capture, list, and recall a uniquely identifiable memory. Confirm the record directly on RDS and verify that the source accepted no writes during the freeze.
5. Reopen public traffic and restart workers after verification. Repeat client health, capture, and recall checks and monitor errors, latency, and database connections.

**Database rollback.** Before public writes resume, restore the source configuration for both Lambdas and workers, deploy fresh versions, and verify them against the source before reopening. After public writes resume, RDS is authoritative. To switch back, repeat the freeze and drain, reconcile RDS changes into the source, and repeat database and endpoint checks before reopening on the source.

**Database retirement.** After the rollback window closes, verify all remaining services and workers use RDS, retain a final source backup, and retire the source database.
