# User Service

Resolves Firebase ID tokens to the existing PostgreSQL user and tenant IDs using the shared transactional resolver. Run `pnpm --filter @second-memory/user-service dev` after configuring `.env` from `.env.example`. Local requests use loopback port 3003.

`POST /internal/v1/auth/resolve` accepts `{ "idToken": "<Firebase ID token>" }` and returns HTTP 200 with `userId` and `tenantId`. Invalid bodies return 400, invalid tokens return 401, and dependency failures return 503.

The AWS endpoint uses IAM authentication. Local development assumes a trusted local caller. The Lambda runtime reads `DATABASE_URL_PARAMETER_NAME` from SSM and uses verified PostgreSQL TLS with the packaged database CA.

Build with `pnpm --filter @second-memory/aws build:zip:user`. The build validates the extracted Arm64 Prisma engine and application imports. The service requires the existing database migrations and performs no migrations at startup.

For a future authorized deployment, record `UserServiceUrl`, `UserServiceEndpointArn`, `UserServiceRevision`, and `IdentityTableName` from `SecondMemoryUserService`. The identity table is reserved for the later DynamoDB migration.

Verify with an operator principal granted `lambda:InvokeWebFunctionEndpoint` on the exact endpoint ARN. Sign requests for service `lambda` in the deployed Region, including `X-Amz-Content-SHA256`. Send the same fresh Firebase token for an existing test account to this endpoint and internal Memory's resolver. Both responses must contain identical IDs. Verify unsigned access returns 403 and a signed request with an invalid Firebase token returns 401. Keep tokens and credentials out of logs and shell history.

Pushes to `main` trigger AWS deployment through the existing workflow. Local synthesis and ZIP builds support verification before a rollout is authorized.
