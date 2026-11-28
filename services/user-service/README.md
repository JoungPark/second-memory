# User Service

Resolves Firebase ID tokens to the existing PostgreSQL user and tenant IDs. Run `pnpm --filter @second-memory/user-service dev` after configuring `.env` from `.env.example`. Local requests use loopback port 3003.

`POST /internal/v1/auth/resolve` accepts `{ "idToken": "<Firebase ID token>" }` and returns HTTP 200 with `userId` and `tenantId`. Invalid bodies return 400, invalid tokens return 401, and dependency failures return 503.

The AWS endpoint uses IAM authentication. Local development assumes a trusted local caller. The Lambda runtime reads `DATABASE_URL_PARAMETER_NAME` from SSM and uses verified PostgreSQL TLS with the packaged database CA.

Build with `pnpm --filter @second-memory/aws build:zip:user`. The build validates the extracted Arm64 Prisma engine and application imports. The temporary adapter uses a local Prisma client for `users` and `tenants`. Apply database migrations from the Memory Service workspace.

To test the PostgreSQL adapter, set `MEMORY_E2E_DATABASE_URL` to a migrated disposable database, then run `pnpm --filter @second-memory/user-service test:e2e` from the repository root.

For a future authorized deployment, record `UserServiceUrl`, `UserServiceEndpointArn`, `UserServiceRevision`, and `IdentityTableName` from `SecondMemoryUserService`. The identity table is reserved for the later DynamoDB migration.

Verify with an operator principal granted `lambda:InvokeWebFunctionEndpoint` on the exact endpoint ARN. Sign requests for service `lambda` in the deployed Region, including `X-Amz-Content-SHA256`. Resolve an existing test account and compare the IDs with those recorded before deployment. Verify unsigned access returns 403 and a signed request with an invalid Firebase token returns 401. Keep tokens and credentials out of logs and shell history.

Pushes to `main` trigger AWS deployment through the existing workflow. Local synthesis and ZIP builds support verification before a rollout is authorized.
