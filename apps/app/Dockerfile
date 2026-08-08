FROM node:22-alpine AS build

WORKDIR /app
RUN corepack enable

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/app/package.json apps/app/
RUN pnpm install --frozen-lockfile --filter @rentqil/app --filter @rentqil/shared

COPY packages/shared packages/shared
COPY apps/app apps/app

# baked into the bundle at build time
ARG EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
ARG EXPO_PUBLIC_YANDEX_MAPS_KEY
ENV EXPO_PUBLIC_YANDEX_MAPS_KEY=$EXPO_PUBLIC_YANDEX_MAPS_KEY
ARG EXPO_PUBLIC_YANDEX_SUGGEST_KEY
ENV EXPO_PUBLIC_YANDEX_SUGGEST_KEY=$EXPO_PUBLIC_YANDEX_SUGGEST_KEY

WORKDIR /app/apps/app
RUN pnpm exec expo export --platform web

FROM nginx:1.27-alpine
COPY apps/app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/app/dist /usr/share/nginx/html
EXPOSE 80
