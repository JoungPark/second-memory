# AWS Migration Decisions

These decisions cover the Phase 1 deployment of memory-service. The [AWS migration plan](aws-migration-plan.md) describes rollout and rollback. The [deployment README](../../infra/aws/README.md) provides build and deployment instructions.

## 1. Run memory-service on Lambda Web Functions

**Decision.** Deploy the existing NestJS HTTP server as a Lambda Web Function. Lambda provides the HTTPS endpoint and scales the service to zero when idle. NestJS continues to own routing, validation, and Firebase authentication. [Lambda Web Functions](https://docs.aws.amazon.com/lambda/latest/dg/web-functions.html)

**Alternatives.** ECS on Fargate also runs the server directly and gives us control over its container image and task lifecycle. Even with Express Mode handling ingress and scaling configuration, ECS uses a deployed image and a task-based service. An event-based Lambda behind API Gateway adds gateway-managed API features and requires a handler or adapter to translate gateway events for NestJS. The current API can use the Web Function endpoint and the middleware it already has. [ECS Express Mode](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/express-service-overview.html) · [API Gateway Lambda proxy integration](https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html)

**Consequence.** The deployment follows Lambda Web's supported runtimes, ZIP packaging, and startup deadline. Revisit ECS if memory-service needs container-level control or continuous background work. Revisit API Gateway if we need a policy or API management feature at the gateway. [Lambda Web execution lifecycle](https://docs.aws.amazon.com/lambda/latest/dg/web-functions-env-lifecycle.html)

## 2. Store credentials in SSM Parameter Store

**Decision.** Store the database URL and embedding API key in separate regional `SecureString` parameters. Lambda reads and decrypts them at startup with IAM access scoped to their names. Separate values let a future ask deployment read the shared database URL independently of the embedding key. [Parameter Store reference](https://docs.aws.amazon.com/systems-manager/latest/userguide/what-is-a-parameter.html)

**Alternative.** Secrets Manager provides a managed rotation workflow and cross-Region replication. The current database and provider credentials are managed by operators, so encrypted storage and per-parameter access cover the present requirements. [Secret rotation](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html) · [Cross-Region replication](https://docs.aws.amazon.com/secretsmanager/latest/userguide/replicate-secrets.html)

**Consequence.** Existing execution environments keep the credentials they read on startup. Rotation requires fresh environments and a check that the rollback revision can use an active credential. Revisit Secrets Manager when managed rotation or cross-Region replication becomes a requirement.

## 3. Build the Lambda ZIP in Docker

**Decision.** Build with the Lambda Node.js 24 base image for Linux Arm64. Use the pnpm lockfile, generate Prisma Client on the target platform, and package the application and its production dependencies into the ZIP that Lambda Web deploys. The build extracts the finished ZIP and checks that the startup modules and native Prisma engine load. [Lambda Web Functions packaging](https://docs.aws.amazon.com/lambda/latest/dg/web-functions.html)

**Alternative.** A host-side build could also produce a ZIP. On a host with a different OS or architecture, it would need to target the Linux Arm64 engine explicitly and verify native dependencies in a compatible environment. Docker gives developers and CI the same environment for generation and packaging.

**Consequence.** The build requires Docker Buildx, and Arm64 emulation can add build time on other architectures. Revisit this approach if a simpler build can produce and smoke-test the same target artifact.

## 4. Generate Prisma Client inside `server-db`

**Decision.** Generate Prisma Client and its native engine into `prisma/generated` in the `server-db` workspace package. The package exports the generated client and its types, and its package file list includes the generated output. `pnpm deploy` then carries it into the deployment with the rest of the package. [Prisma Client generation](https://www.prisma.io/docs/orm/v6/prisma-client/setup-and-configuration/generating-prisma-client) · [pnpm deploy file selection](https://pnpm.io/cli/deploy#files-included-in-the-deployed-project)

**Alternative.** Prisma 6's default output lives under `node_modules/.prisma/client`. A separate packaging step could copy it from there, with the build responsible for locating it in pnpm's dependency layout and keeping the copied client and engine aligned. Generating inside the workspace package makes the file location explicit and keeps packaging on the normal workspace path.

**Consequence.** Regenerate the client when the schema changes and build it for the deployment platform. Revisit the layout if a Prisma generator or engine upgrade changes what the runtime needs packaged.

## 5. Connect Prisma on the first Lambda query

**Decision.** Construct Prisma Client during NestJS startup and open the connection on the first database query. This keeps the database handshake outside Lambda Web's ten-second deadline to start listening. [Lambda Web execution lifecycle](https://docs.aws.amazon.com/lambda/latest/dg/web-functions-env-lifecycle.html) · [Prisma connection management](https://www.prisma.io/docs/orm/v6/prisma-client/setup-and-configuration/databases-connections/connection-management)

**Alternative.** The standalone server profile calls `$connect()` during startup. Eager connection exposes database failures before the server starts listening and moves connection latency ahead of the first query. On Lambda Web, it also puts database latency and availability on the startup path.

**Consequence.** The first database request in an execution environment pays the connection cost. `/health` runs a real query and returns HTTP 503 if the database probe fails. Revisit eager connection on Lambda only if first-query latency becomes a problem and measurements show the handshake consistently fits the startup budget.
