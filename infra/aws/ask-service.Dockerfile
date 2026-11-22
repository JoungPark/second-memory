FROM public.ecr.aws/lambda/nodejs:24 AS build

RUN dnf install -y openssl zip unzip && dnf clean all \
    && npm install --global pnpm@12.21.0

WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json turbo.json ./
COPY packages/shared-types packages/shared-types
COPY packages/server-db packages/server-db
COPY packages/nest-auth packages/nest-auth
COPY services/ask-service services/ask-service

RUN pnpm install --frozen-lockfile \
    && pnpm exec turbo run build --filter=@second-memory/ask-service \
    && pnpm --filter @second-memory/ask-service deploy --legacy --prod --node-linker hoisted --ignore-scripts /package

WORKDIR /package
RUN mkdir /asset /unpacked \
    && zip -qr /asset/ask-service.zip dist node_modules package.json \
    && unzip -q /asset/ask-service.zip -d /unpacked \
    && cd /unpacked \
    && node --no-experimental-require-module -e "require('@valkey/valkey-glide'); require('./dist/app.module'); require('./dist/config/lambda-web');" \
    && test -f dist/main.js

FROM scratch AS artifact
COPY --from=build /asset/ /
