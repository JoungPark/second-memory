FROM public.ecr.aws/lambda/nodejs:24 AS build

RUN dnf install -y openssl zip unzip && dnf clean all \
    && npm install --global pnpm@12.21.0

WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json turbo.json ./
COPY packages/shared-types packages/shared-types
COPY packages/server-db packages/server-db
COPY packages/nest-auth packages/nest-auth
COPY services/user-service services/user-service

RUN pnpm install --frozen-lockfile \
    && pnpm exec turbo run build --filter=@second-memory/user-service \
    && pnpm --filter @second-memory/user-service deploy --legacy --prod --node-linker hoisted --ignore-scripts /package

WORKDIR /package
RUN --mount=type=bind,source=infra/aws,target=/deployment \
    if [ -f /deployment/database-ca.pem ]; then \
      node /deployment/copy-database-ca.mjs /deployment/database-ca.pem dist; \
    fi \
    && mkdir /asset /unpacked \
    && zip -qr /asset/user-service.zip dist node_modules package.json \
    && unzip -q /asset/user-service.zip -d /unpacked \
    && cd /unpacked \
    && node --no-experimental-require-module -e "require('@aws-sdk/client-ssm'); require('@second-memory/server-db'); require('./node_modules/@second-memory/server-db/prisma/generated/libquery_engine-linux-arm64-openssl-3.0.x.so.node'); require('./dist/app.module');" \
    && test -f dist/main.js

FROM scratch AS artifact
COPY --from=build /asset/ /
