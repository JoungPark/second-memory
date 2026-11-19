# AWS Migration Plan

Move `memory-service` to Lambda first so `ask-service` can use the verified AWS memory API when it moves. Switch each client API URL after its service passes acceptance. Both services use the current PostgreSQL database until the RDS cutover. The web app stays on Vercel.

## 1. Move `memory-service` to Lambda

1. Choose the AWS account and region, verify the account with `aws sts get-caller-identity`, set a budget alert, and run `cdk bootstrap aws://<account-id>/<region>`.
2. Add a Lambda entry point that reuses NestJS validation and initializes the app once per execution environment. Keep the local HTTP entry point. Package Prisma Client and its query engine for the Lambda Linux runtime and architecture.
3. Configure inline embeddings and load the embedding credentials and current `DATABASE_URL` from Secrets Manager. Verify database connectivity and TLS from Lambda, along with outbound access to Firebase and the embedding provider. Start with reserved concurrency of five and Prisma `connection_limit=1`.
4. Expose `GET /v1/memories` and `POST /v1/memories` through API Gateway. Keep Firebase authentication in NestJS and configure CORS for the Vercel preview and production origins. Leave the internal routes unavailable until the next phase. Review `cdk synth` and `cdk diff`, deploy, and configure CloudWatch alarms for API 5xx responses and Lambda errors.

**Acceptance**

- A dedicated Firebase test account can create and list a memory. A SQL similarity query retrieves it using the stored embedding.
- Unauthenticated requests and cross-user reads fail. Internal routes are unreachable, including with forged identity headers.
- Vercel preview passes CORS preflight.
- Record cold and warm latency, errors, throttles, and database connections under a small concurrent load.

**Client cutover**

1. Set `NEXT_PUBLIC_MEMORY_API_URL` on a Vercel preview. Check sign-in, capture, and listing. Confirm that the existing ask endpoint can recall a memory captured through AWS.
2. Switch the production web memory URL, then roll out `EXPO_PUBLIC_MEMORY_API_URL` to mobile. Verify capture and listing on each client and monitor API errors, latency, and database connections. Keep the previous memory endpoint available for the existing ask deployment and older mobile builds.

**Rollback.** Restore the previous web memory URL and roll back the mobile update or issue a corrective build.

**Retirement.** Retire the previous memory deployment once its rollback window closes, its public traffic has moved to AWS, any legacy URLs still used by supported clients have been verified against AWS, and no active or rollback ask deployment needs its internal routes. Recheck these conditions after the ask cutover.

## 2. Move `ask-service` to Lambda

1. Add IAM authorization to the AWS memory API's internal `POST /internal/v1/memories` and `POST /internal/v1/memories/search` routes. Grant the ask Lambda role `execute-api:Invoke` for those routes.
2. Deploy the existing `ask-service` behind API Gateway with Firebase authentication. Keep its current `DATABASE_URL` and LLM provider. Set `MEMORY_SERVICE_URL` to the AWS memory endpoint and sign service-to-service requests with SigV4.

**Acceptance**

- The AWS ask API recalls a memory captured through the AWS memory API for its owner. Another user cannot retrieve it.
- The internal memory routes reject unsigned calls and callers without route permissions.
- Test how ask responds when the LLM provider or memory API is slow or unavailable. Record ask latency, Lambda duration and errors, and database connections.

**Client cutover**

1. Set `NEXT_PUBLIC_ASK_API_URL` on a Vercel preview and verify recall through the AWS ask API.
2. Switch the production web ask URL, then roll out `EXPO_PUBLIC_ASK_API_URL` to mobile. Verify recall on each client and monitor the same metrics. Keep the previous ask endpoint available for older mobile builds.

**Rollback.** Restore the previous web ask URL and roll back the mobile update or issue a corrective build.

**Retirement.** Retire the previous ask deployment once its rollback window closes and its client traffic has moved to AWS. If supported clients still use the previous ask URL, route it to AWS and verify recall through it before shutting down the old deployment. Check the previous memory API for remaining internal callers and retire it as soon as its own retirement conditions are met. Either service can retire before the RDS cutover.

## 3. Move PostgreSQL to Amazon RDS

1. Prepare a private RDS target in the services' AWS region with an engine version that supports the existing schema and `vector` extension.
2. Allow PostgreSQL traffic from the Lambda and migration runner security groups. Preserve outbound access from VPC-attached Lambdas to Firebase and the model providers. Configure Prisma and the migration runner to verify the database certificate with the RDS CA bundle. [AWS Lambda VPC networking](https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html), [Amazon RDS PostgreSQL TLS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html)
3. Rehearse the backup and restore with a migration role. Run the database checks below and confirm that every legacy endpoint still in use can route to AWS or connect to RDS.

**Acceptance**

- The restore preserves Prisma migration history, row counts, the `vector(1536)` column, and vector search results.
- A dedicated test account can capture and recall memories through every active endpoint using RDS.

**Database cutover**

1. Pause user writes on all active endpoints and stop workers that write to PostgreSQL. Take a final backup, restore it into RDS, and run the database checks.
2. Set `DATABASE_URL` to the RDS connection string in Secrets Manager for both Lambda services and any workers. Route legacy endpoints to AWS or configure them to use RDS.
3. Run the endpoint checks with user writes still paused. Once they pass, resume writes and restart the workers.

**Rollback.** Keep the source available through the rollback window. If verification fails before writes resume, restore the source connection for all affected deployments. If RDS has accepted user writes, pause writes and reconcile changes into the source before switching back.

**Retirement.** Once the database rollback window closes, verify that all remaining services and workers use RDS, retain a final source backup, and retire the source database.
