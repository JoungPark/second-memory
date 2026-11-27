# AWS migration plan

Move the public Memory and Ask APIs from Render to AWS while existing clients continue using their configured URLs. The web app stays on Vercel. During coexistence, both Memory deployments use the existing PostgreSQL database. Lambda Ask reaches that data through internal Memory. Render Ask continues its existing database lookup for identity. New client releases can switch Memory and Ask independently.

## 1. Verify public and internal Memory

The Memory stack runs two Lambda Web Functions from the same Memory ZIP by default. Public Memory exposes health, Firebase-authenticated capture and listing, and public Swagger docs. Internal Memory exposes three IAM-protected POST routes for Firebase identity resolution, scoped search, and idempotent summary writes. Its identity module can move to User Service when that work proceeds. [Memory operations](../../infra/aws/README.md#memory-service) · [User Service proposal](user-service-proposal.md)

Complete these checks before switching Memory clients or relying on the internal API from Ask.

1. Run Memory lint and unit tests, then the end-to-end suite against a disposable PostgreSQL database with pgvector. The suite applies migrations and deletes test data. Verify public health reports database availability and CORS accepts the approved browser origins. Check that public Swagger lists only `/health` and `/v1/memories`.
2. Use a dedicated test account to capture through Lambda and recall through Render Ask. Capture through Render Memory and list through Lambda. Verify the stored embedding against the existing 1536-dimensional vectors and check that a capture retry with the same key creates one entry. With a stalled test embedding provider, verify that capture returns HTTP 503 without leaving a partial entry.
3. Run the signed internal checks with two Firebase test accounts. Resolve both identities, retrieve a note as its owner, and retry a summary write with the same key. Confirm that the second account cannot see either entry, unsigned calls receive HTTP 403 internally, and all three internal paths return HTTP 404 on public Memory. [Internal Memory verification](../../infra/aws/README.md#verify-internal-memory)
4. Confirm the target account has a budget alert. Record cold and warm latency, errors, throttles, and database connections while Render is serving. Each Memory endpoint can run up to five environments with one Prisma connection each. Retain the serving ZIPs and configuration and rehearse rolling back on the same endpoint. [Revision rollback](../../infra/aws/README.md#roll-back-a-revision-or-rotate-credentials)

## 2. Deploy and verify Lambda Ask

The Ask stack consumes the internal endpoint exported by Memory. Ask resolves each caller's Firebase token over that endpoint and signs search and summary requests with the resolved tenant and user IDs. Lambda Ask uses its own chat credential and shares sessions across execution environments through DynamoDB. Render and local Ask store sessions in process memory. The two deployments have separate session histories. [Ask operations](../../infra/aws/README.md#ask-service)

Complete these checks before switching Ask clients.

1. Verify the public SDK receives HTTP 200 from Ask health and the approved Vercel origins pass CORS preflight. Health confirms that the process is listening. Use an authenticated message to exercise identity resolution, DynamoDB, retrieval, and the chat provider together.
2. Recall a known memory as its owner, verify its citation, and send a follow-up in a different Lambda execution environment using the same session ID. Check that the earlier turn is available and a second account cannot resume the conversation.
3. End the session and verify exactly one summary appears in the owner's Memory listing. In separate sessions, verify that explicit close discards the conversation and inactivity expires it after the sliding TTL (one hour by default).
4. Exercise slow or unavailable Memory and chat providers. Record latency, errors and throttling before sending client traffic to Ask.

## 3. Switch client traffic while both endpoint sets are live

1. After the public Memory checks pass, deploy a Vercel preview with `NEXT_PUBLIC_MEMORY_API_URL` and a mobile preview build with `EXPO_PUBLIC_MEMORY_API_URL` pointing to Lambda memory. Keep ask on its existing URL. Verify sign-in, both health checks, capture, listing, and recall on web and mobile. Then deploy the production web release and roll out the mobile build.
2. After the internal Memory and Ask checks pass, repeat preview and production rollout for `NEXT_PUBLIC_ASK_API_URL` and `EXPO_PUBLIC_ASK_API_URL`. Bind each conversation to the ask URL used for its first message. Send all follow-ups, end, and close requests for that session to the same URL. Apply the new default to the next conversation.
3. Test a conversation already open during the switch and a new one afterward. Verify health, sending, and recall on both clients, including a supported release using the existing URLs. Monitor errors, latency, and traffic by endpoint throughout coexistence.

**Client rollback.** Restore the prior Vercel deployment and issue a corrective mobile build using the previous URLs. Apply the same session routing rule during rollback. Verify that an open Lambda conversation can finish on Lambda and a new conversation can start on existing ask. Keep both endpoint sets serving throughout the rollback window.

## 4. Retire the existing endpoints and deployments

1. **Existing ask first.** Wait for the ask rollback window to close. Confirm that supported client releases have moved off the existing URL and use existing traffic records to verify that active conversations have drained. Allow at least the configured session TTL after the last session activity for abandoned conversations to expire. Verify Lambda ask, remove the existing ask route or hostname mapping, and retire its backing deployment.
2. **Existing memory second.** Wait for the memory rollback window to close. Check supported client URLs and existing traffic records for public and internal callers. Confirm that no active Ask deployment or planned rollback depends on the Render Memory endpoint. Restoring Render Ask also requires a Memory endpoint compatible with its standalone internal requests. Verify Lambda capture, listing, and recall, then remove the existing memory route or hostname mapping and retire its backing deployment.
3. A supported client or internal caller that still needs an existing URL postpones that endpoint's retirement. After each removal, verify that the retired URL has stopped serving the API and repeat the client health, capture, and recall checks.

## 5. Move PostgreSQL to Amazon RDS after both retirements

1. Prepare a private RDS target in the services' AWS Region with an engine version that supports the existing schema and `vector` extension. Attach a VPC egress network connector to the memory Web Function revisions. Permit database access from Lambda, the migration runner, and any retained workers. Preserve outbound access to SSM Parameter Store, Firebase, and the model providers. Configure each database client to connect using the RDS endpoint hostname and verify its certificate against the appropriate RDS root CA. [Lambda Web networking](https://docs.aws.amazon.com/lambda/latest/dg/web-functions-networking.html) · [Amazon RDS PostgreSQL TLS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html)
2. Rehearse backup and restore with a migration role. Compare Prisma migration history, row counts, the `vector(1536)` column, and representative vector search results between source and target.
3. Put the public Lambda APIs into maintenance mode, including authenticated reads because a first request can create a user and tenant. Stop any active outbox relays and workers, drain in-flight requests and jobs, and block application writes on the source database. Take the final backup, restore it into RDS, and repeat the database checks.
4. Store the RDS database URL in a separate SSM `SecureString` parameter. Deploy fresh public and internal memory revisions that use the RDS connection and CA. Route the memory Web Function endpoints to those revisions and update any retained workers while they are paused. Through a restricted test path, capture, list, and recall a uniquely identifiable memory. Confirm the record directly on RDS and verify that the source accepted no writes during the freeze.
5. Reopen public traffic and restart workers after verification. Repeat client health, capture, and recall checks and monitor errors, latency, and database connections.

**Database rollback.** Before public writes resume, restore the source database connection and CA for both memory functions and any retained workers. Verify against the source before reopening. After public writes resume, RDS is authoritative. To switch back, repeat the freeze and drain, reconcile RDS changes into the source, and repeat database and endpoint checks before reopening on the source.

**Database retirement.** After the rollback window closes, verify all remaining services and workers use RDS, retain a final source backup, and retire the source database.
