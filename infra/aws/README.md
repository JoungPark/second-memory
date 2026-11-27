# AWS deployment and operations

One CDK app deploys three stacks. `SecondMemoryMemoryService` runs the public Memory API and the IAM-protected internal API as separate Lambda Web Functions. `SecondMemoryAskService` runs public Ask, stores sessions in an on-demand DynamoDB table, and calls internal Memory for identity, search, and summary writes. Each endpoint has CloudWatch alarms for HTTP 5xx responses and throttling. For client cutover and retirement, see the [AWS migration plan](../../docs/architecture/aws-migration-plan.md).

## Workspace setup

Use Node.js, the pnpm version pinned in the root `package.json`, Docker Buildx with Linux Arm64 support, and an AWS CLI profile for the target account. Use the same profile for CDK and choose a Region that supports Lambda Web Functions. [Supported Regions](https://docs.aws.amazon.com/lambda/latest/dg/web-functions.html)

Copy `infra/aws/.env.example` to `infra/aws/.env` for a new workspace. Set the AWS account, Region, and exact HTTPS origins for browser clients. Set `ALARM_TOPIC_ARN` to an existing SNS topic if you want alarm notifications. [Example configuration](.env.example)

CDK synthesizes all stacks even when you select one. Configure both services and make both ZIPs available before running a diff or deploy. For subsequent updates, rebuild the ZIPs affected by your changes.

Both providers require an HTTPS base URL without credentials, a query, or a fragment, and a nonempty model name. Before starting the functions, create three separate, nonempty SSM Parameter Store `SecureString` values in the target account and Region. The settings in `infra/aws/.env` identify existing parameters.

| CDK setting                         | Parameter value            | Read at startup by    |
| ----------------------------------- | -------------------------- | --------------------- |
| `DATABASE_URL_PARAMETER_NAME`       | PostgreSQL connection URL  | Both Memory functions |
| `EMBEDDING_API_KEY_PARAMETER_NAME`  | Embedding provider API key | Both Memory functions |
| `ASK_OPENAI_API_KEY_PARAMETER_NAME` | Chat provider API key      | Ask                   |

Run the commands in this README from the repository root. Install dependencies and confirm the active AWS identity.

```powershell
aws sts get-caller-identity
pnpm install --frozen-lockfile
```

If the account and Region need CDK bootstrapping, run these commands with the values from `infra/aws/.env`.

```powershell
pnpm --filter @second-memory/aws build
pnpm --filter @second-memory/aws cdk bootstrap "aws://<account-id>/<region>"
```

## Automatic deployment from GitHub

For AWS deployment on pushes to `main`, see the [GitHub Actions deployment guide](github-actions-deployment.md).

## Deploy both services

If PostgreSQL uses a private CA, place the certificate at `infra/aws/database-ca.pem` before building Memory. From the repository root, build both Linux Arm64 ZIPs into `infra/aws/dist/assets` and compile the CDK app. The TypeScript build and ZIP builds are independent. Recompile the CDK app after stack changes because the CLI runs `dist/bin/second-memory.js`.

```powershell
pnpm --filter @second-memory/aws build:zips
pnpm --filter @second-memory/aws build
pnpm --filter @second-memory/aws cdk diff --method=template
pnpm --filter @second-memory/aws cdk deploy --all
```

The diff compares the synthesized and deployed templates for all stacks. Use `--all` on deploy to select both. CDK deploys Memory first because Ask imports the internal endpoint URL for requests and its ARN for the execution role's invoke permission.

## Memory service

Set `FIREBASE_PROJECT_ID`, `EMBEDDING_BASE_URL`, and `EMBEDDING_MODEL`. Use the model that produced the existing vectors. Memory requires PostgreSQL with the Prisma migrations applied and pgvector enabled. The database must accept verified TLS connections from Lambda's public IPv4 egress.

If the Memory parameters use a customer-managed KMS key, set `SSM_PARAMETER_KMS_KEY_ARN` to its ARN.

If PostgreSQL uses a private CA, save the certificate as `infra/aws/database-ca.pem` before building. For Aiven, download the **CA Certificate** from **Connection information** on the PostgreSQL service’s **Overview** page. For RDS, use the root CA that matches the instance's configured CA. The Docker build validates and packages the certificate for Prisma TLS verification. [CA copy script](copy-database-ca.mjs)

### Deploy Memory

Both Memory functions use `infra/aws/dist/assets/memory-service.zip` by default. To update one independently, point the other at the ZIP for its serving revision using `MEMORY_ARTIFACT_PATH` for public Memory or `INTERNAL_MEMORY_ARTIFACT_PATH` for internal Memory. Archive the serving ZIP before rebuilding if it is at the default output path.

Build the ZIP and review the stack diff before deploying. The build checks that the extracted ZIP loads the Linux Arm64 Prisma engine and startup modules with `require(esm)` disabled.

```powershell
pnpm --filter @second-memory/aws build:zip:memory
pnpm --filter @second-memory/aws build
pnpm --filter @second-memory/aws cdk diff SecondMemoryMemoryService --method=template
pnpm --filter @second-memory/aws cdk deploy SecondMemoryMemoryService
```

Record `MemoryServiceUrl`, `MemoryServiceRevision`, `InternalMemoryServiceUrl`, `InternalMemoryServiceEndpointArn`, and `InternalMemoryServiceRevision` from the stack outputs.

### Verify public Memory

Send `GET /health` to `MemoryServiceUrl` and check for HTTP 200 with `status: "ok"` and `database: "ok"`. For a Lambda 502, inspect the `lambda-web-error-type` response header and the serving revision's CloudWatch logs. If the app returns HTTP 503 with `database: "unavailable"`, check PostgreSQL connectivity and certificate trust.

Test capture and listing at `/v1/memories` with a Firebase bearer token from a dedicated test account. [Memory end-to-end test instructions](../../services/memory-service/README.md#e2e-tests)

Open `/docs` on `MemoryServiceUrl` for Swagger UI or fetch `/docs-json` for the public OpenAPI document. Use **Authorize** with a Firebase ID token to try the memory routes.

To smoke-test the extracted ZIP locally on Arm64, rebuild the Dockerfile with `--target build --load -t second-memory-memory-smoke`. Run that image with `--workdir /unpacked --entrypoint node` and the command `dist/main.js`. Publish port 3001 and pass a `DATABASE_URL` that points to a migrated disposable database reachable from the container.

### Verify internal Memory

Use two dedicated Firebase test accounts. Capture a uniquely identifiable note through public Memory with the first account and record its ID. For signed requests to `InternalMemoryServiceUrl`, use AWS credentials with `lambda:InvokeWebFunctionEndpoint` on `InternalMemoryServiceEndpointArn`. Send JSON with `Content-Type: application/json` and sign for `lambda` in the stack Region using SigV4 and `X-Amz-Content-SHA256`. [Lambda Web endpoint access control](https://docs.aws.amazon.com/lambda/latest/dg/web-functions-endpoint-access-control.html)

1. Call `POST /internal/v1/auth/resolve` with each account's Firebase ID token in the JSON field `idToken`. Verify that both requests return HTTP 200 with distinct user IDs. Record each account's `tenantId` and `userId`.
2. Call `POST /internal/v1/memories/search` with the note text in `query`. Include each account's IDs in the signed `x-tenant-id` and `x-user-id` headers. Verify that the note ID appears only in the owner's results.
3. Call `POST /internal/v1/memories` twice with the owner's signed headers and the same body. Set `entryType` to `conversation_summary`, put a unique marker in `content`, and reuse the same `idempotencyKey`. Verify that both responses return the same ID. Use each account's Firebase bearer token on public `GET /v1/memories` with the marker as `keyword` to verify that only the owner sees the single synthetic summary.
4. Verify that unsigned requests to the three internal routes return HTTP 403 on `InternalMemoryServiceUrl` and HTTP 404 on `MemoryServiceUrl`.

## Ask service

Set `ASK_OPENAI_BASE_URL` and `ASK_OPENAI_MODEL` to the chat provider and model. Set `ASK_SSM_PARAMETER_KMS_KEY_ARN` if the chat parameter uses a customer-managed key. Lambda Ask accesses PostgreSQL-backed data through the signed internal API. Render and local Ask keep sessions in process memory. Lambda execution environments share sessions in the DynamoDB table set by CDK through `SESSION_TABLE_NAME`.

### Deploy Ask

Build the ZIP and review the stack diff before deploying. CDK includes Memory when deploying Ask, so review all stacks. After Memory has published the endpoint exports, add `--exclusively` to deploy only Ask.

```powershell
pnpm --filter @second-memory/aws build:zip:ask
pnpm --filter @second-memory/aws build
pnpm --filter @second-memory/aws cdk diff --method=template
pnpm --filter @second-memory/aws cdk deploy SecondMemoryAskService
```

Record `AskServiceUrl` and `AskServiceRevision` from the stack outputs.

### Verify Ask

Send `GET /health` to `AskServiceUrl` and check for HTTP 200 with `status: "ok"`. This checks that the process is running. Confirm CORS preflight from the approved browser origins. With dedicated Firebase test accounts, verify that Ask can recall a memory, follow up from another execution environment, save a summary, close a session, expire an idle session, and prevent a second account from resuming it.

### Troubleshoot an Ask health check returning 502

Check the `lambda-web-error-type` response header and the serving Ask revision's CloudWatch logs. `Application.TimeoutListenError` means the process failed to start listening in time. Ask loads its chat key before opening the HTTP port, so a startup failure can also affect `/health`.

If the log says `Unable to read the chat API key SecureString from SSM Parameter Store`, check the serving revision's `OPENAI_API_KEY_PARAMETER_NAME`. Verify the exact path exists in the same account and Region, contains a nonempty `SecureString`, and the execution role can read and decrypt it. If the parameter is missing, create it at the configured path and retry `GET /health`. A fresh environment reads it on startup. If the path or KMS key in the stack configuration changes, redeploy Ask.

## Roll back a revision or rotate credentials

Archive each verified ZIP and its CDK inputs. To roll back, set the corresponding artifact path in `infra/aws/.env` to the absolute path of the archived ZIP.

| Function        | Artifact path setting           |
| --------------- | ------------------------------- |
| Public Memory   | `MEMORY_ARTIFACT_PATH`          |
| Internal Memory | `INTERNAL_MEMORY_ARTIFACT_PATH` |
| Ask             | `ASK_ARTIFACT_PATH`             |

Restore compatible inputs. For a Memory rollback, use a ZIP with the CA that matches the database endpoint and keep the other function pointed at its serving ZIP. For Ask, use a ZIP compatible with the deployed DynamoDB session table. Review the diff for endpoint replacement before deploying, then verify the restored revision serves the same URL and passes its smoke checks.

Running environments keep the credentials they loaded at startup. To rotate a credential, store the new value at a new SSM parameter path and update the corresponding setting in `infra/aws/.env`. Deploy fresh revisions for the functions that use it, then verify connectivity with the appropriate smoke checks.
