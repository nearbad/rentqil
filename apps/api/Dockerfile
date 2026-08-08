FROM node:22-alpine

WORKDIR /app
RUN corepack enable

# install with just the manifests first to keep the layer cache useful
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @rentqil/api --filter @rentqil/shared

# tsconfig.base.json is needed because apps/api/tsconfig.json extends it
# and prisma loads prisma.config.ts through the ts toolchain
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api

WORKDIR /app/apps/api
RUN pnpm exec prisma generate

EXPOSE 3001

# migrations run on every start, they are cheap when nothing changed
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && pnpm exec tsx src/index.ts"]
