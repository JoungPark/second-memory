# Deploy memory-service with AWS CDK

This workspace deploys memory-service as a native AWS Lambda Web Function. The stack creates the HTTPS endpoint, its execution role, versioned S3 code storage, and CloudWatch alarms for 5xx responses and throttling.

The [CDK app entry point](bin/second-memory.ts) loads the environment settings and instantiates [`MemoryServiceStack`](lib/memory-service-stack.ts) with typed configuration.

## Prerequisites

- Node.js, the pnpm version pinned in the root `package.json`, and Docker Buildx with Linux Arm64 support.
- An authenticated AWS CLI profile for an account and [Region that supports Lambda Web Functions](https://docs.aws.amazon.com/lambda/latest/dg/web-functions.html). Use the same profile for the AWS CLI and CDK.
- The existing Firebase project, approved Vercel origins, and embedding provider and model. Match the embedding model to the existing vectors.
- An existing PostgreSQL database with the Prisma migrations applied and pgvector available. Its address must accept verified TLS connections from Lambda's public IPv4 egress.
- Two SSM Parameter Store `SecureString` parameters in the deployment Region, one for `DATABASE_URL` and one for `EMBEDDING_API_KEY`.

## Configure and deploy

If PostgreSQL uses a private CA, download the CA certificate from your database provider and save it as `infra/aws/database-ca.pem` before building the ZIP. For Aiven, download the **CA Certificate** from **Connection information** on the PostgreSQL service’s **Overview** page. For RDS, use the root CA that matches the instance's configured CA. The Docker build runs [the CA copy script](copy-database-ca.mjs) to validate and package the certificate at `dist/database-ca.pem`. Prisma uses it for strict TLS verification.

Copy [`.env.example`](.env.example) to `infra/aws/.env` and fill in the deployment settings. Set `DATABASE_URL_PARAMETER_NAME` and `EMBEDDING_API_KEY_PARAMETER_NAME` to the full SSM parameter paths. Supply `SSM_PARAMETER_KMS_KEY_ARN` if the parameters use a customer-managed key. To send notifications from the CloudWatch alarms, set `ALARM_TOPIC_ARN` to an existing SNS topic.

Each new Lambda environment reads the latest values at those parameter paths with a three-second deadline before listening on `AWS_LAMBDA_HTTP_ENDPOINT`. Prisma opens the PostgreSQL connection on the first query with a five-second connection timeout.

Run from the repository root. Replace the account and Region placeholders with the values from `infra/aws/.env`. Run `cdk bootstrap` for the target account and Region if it needs the standard CDK bootstrap stack.

```powershell
aws sts get-caller-identity
pnpm install --frozen-lockfile
docker buildx build --platform linux/arm64 --file infra/aws/memory-service.Dockerfile --output type=local,dest=infra/aws/dist/assets .
pnpm --filter @second-memory/aws build
pnpm --filter @second-memory/aws cdk bootstrap "aws://<account-id>/<region>"
pnpm --filter @second-memory/aws cdk synth
pnpm --filter @second-memory/aws cdk diff
pnpm --filter @second-memory/aws cdk deploy
```

The Docker build writes `infra/aws/dist/assets/memory-service.zip` and checks that the extracted package loads its Linux Arm64 Prisma engine and startup modules with `require(esm)` disabled. CDK prints `MemoryServiceUrl` and `MemoryServiceRevision` after deployment.

## Verify the deployment

Send `GET /health` to `MemoryServiceUrl` and check for HTTP 200 with `status: "ok"` and `database: "ok"`. For a Lambda 502, inspect the `lambda-web-error-type` response header and the serving revision's CloudWatch logs. If the app returns HTTP 503 with `database: "unavailable"`, check PostgreSQL connectivity and certificate trust.

Test capture and listing at `/v1/memories` with a Firebase bearer token from a dedicated test account. See the [memory-service test instructions](../../services/memory-service/README.md#e2e-tests) and the [migration plan](../../docs/architecture/aws-migration-plan.md#verify-and-roll-back) for rollout checks.

Open `/docs` on `MemoryServiceUrl` for Swagger UI or fetch `/docs-json` for the public OpenAPI document. Use **Authorize** with a Firebase ID token to try the memory routes.

To smoke-test the extracted ZIP locally on Arm64, rebuild the Dockerfile with `--target build --load -t second-memory-memory-smoke`. Run that image with `--workdir /unpacked --entrypoint node` and the command `dist/main.js`. Publish port 3001 and pass a `DATABASE_URL` reachable from the container that points to a migrated disposable database. After deployment, use the public health endpoint to verify the Lambda Web startup path and TLS connection.

## Roll back a revision or rotate credentials

Archive the deployed ZIP and its CDK inputs. To roll back, set `MEMORY_ARTIFACT_PATH` in `infra/aws/.env` to the absolute path of the archived ZIP and restore compatible inputs. Review `cdk diff` for endpoint replacement before deploying and verify that the restored revision serves the same URL. Use a ZIP with the CA that matches the database endpoint.

Running environments keep the credentials they loaded at startup. To deploy a new revision for a rotation, store the rotated credential at a new SSM parameter path and update the corresponding parameter name in `infra/aws/.env` before deploying.
