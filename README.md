# rentqil

Online booking for sports venues in Uzbekistan: football pitches, tennis and padel courts, basketball and volleyball halls, gyms. Players find a venue, pick free slots, pay the full price online and can split the bill with their team through a share link that needs no account. Partners (venue owners) manage schedules, prices, cancellation policies and booking conditions. The platform takes a percent service fee from the player, it is never refunded.

Payments run against a mock provider for now (Click / Payme / Uzum / Paynet / Uzum Nasiya are selectable, real adapter skeletons are in `apps/api/src/payments`), but all the money logic is production grade: full upfront payments, exact split shares, policy driven refunds, idempotent webhooks. Sign in works by email code or Google, a phone number is only asked at booking time.

## Stack

- `apps/app` - Expo (React Native + react-native-web), TypeScript, expo-router. Only the web target is built and deployed today, mobile builds will come from the same codebase later.
- `apps/api` - Fastify + TypeScript, REST.
- `packages/shared` - types, zod schemas, i18n dictionaries (uz latin default, ru, en), design tokens.
- PostgreSQL + Prisma 7 (rust-free client over the pg driver adapter).

Money is stored as integer tiyin everywhere. Design decisions with reasoning live in [docs/DECISIONS.md](docs/DECISIONS.md).

## Local development

Requirements: Node 22+, pnpm 10, PostgreSQL 16.

```bash
pnpm install

# api env
cp .env.example apps/api/.env   # then adjust DATABASE_URL etc

cd apps/api
pnpm db:migrate:dev             # applies migrations
pnpm db:seed                    # admin, demo owner, 3 venues with courts
pnpm dev                        # api on :3001

# in another terminal
cd apps/app
pnpm dev                        # expo web on :8081
```

The seed prints the demo accounts. With `EMAIL_PROVIDER=mock` and `OTP_DEV_ECHO=1` the login code is echoed in the api response and in the api logs, so no real mailbox is needed:

- admin: `admin@rentqil.com` (override with `ADMIN_EMAIL`)
- demo partner: `owner@rentqil.com`
- demo player: `player@rentqil.com`

Booking flow end to end: pick a venue, select slots, hit "Rent qil!", choose any payment method, then press "Pay" on the mock payment page. The mock provider fires a signed webhook back at the api exactly like a real PSP would.

## Tests

Money logic (quotes, split shares, refund math, slot pricing) is covered by unit tests:

```bash
pnpm test
```

Typecheck everything: `pnpm typecheck`.

## Deploy

Target setup is a single VPS (Hetzner) with docker compose: postgres + api + nginx serving the static web build + caddy in front doing TLS. Caddy serves `DOMAIN` (web), `www.DOMAIN` (redirect) and `api.DOMAIN` (api) and pulls certificates from Let's Encrypt on its own.

1. Install docker with the compose plugin, clone the repo.
2. Point dns at the server. In your dns panel (Cloudflare for rentqil.com) create three A records to the server ip: `@`, `www` and `api`. Add them as "DNS only" first so Let's Encrypt can issue the certificates; once https works you can flip the proxy (orange cloud) on with SSL mode "Full (strict)".
3. Create `.env` in the repo root, start from `.env.example`. The values that matter:

```
POSTGRES_PASSWORD=strong-random-string
JWT_SECRET=long-random-string
MOCK_WEBHOOK_SECRET=another-random-string
DOMAIN=rentqil.com                       # what caddy serves
ACME_EMAIL=you@example.com               # Let's Encrypt expiry notices
WEB_URL=https://rentqil.com              # public url of the web app
EXPO_PUBLIC_API_URL=https://api.rentqil.com   # public url of the api, baked into the web bundle
EXPO_PUBLIC_YANDEX_MAPS_KEY=             # optional, maps fall back to osm without it
ADMIN_EMAIL=you@example.com              # this email logs in as the platform admin
GOOGLE_CLIENT_ID=                        # optional, enables "continue with google"
GOOGLE_CLIENT_SECRET=
```

4. Build and start:

```bash
docker compose up -d --build
```

The api container runs `prisma migrate deploy` on every start. Seed once after the first boot:

```bash
docker compose exec api pnpm exec tsx prisma/seed.ts
```

Only caddy publishes host ports (80/443), the api and web containers stay on the internal network. To serve everything from one domain instead, route `/` to the web container in the Caddyfile and set `EXPO_PUBLIC_API_URL` to the api path accordingly before building.

Admin login in production: with `EMAIL_PROVIDER=mock` the login code is printed to the api logs, so after entering your email on the login screen run `docker compose logs api --tail 20` and grab the code there. Wire real SMTP (or google oauth keys) to stop reading logs.

To change platform settings (service fee percent, timers, calendar depth) log in as the admin and open Admin -> Config. No redeploy needed.

## Going live with real payments

Each PSP has a skeleton adapter in `apps/api/src/payments` with TODO notes on the protocol (Payme Merchant API, Click prepare/complete, Uzum, Paynet). The plan per provider: sign the contract, fill in the credentials via env, implement the webhook route next to `/webhooks/mock`, then flip `USE_MOCK` in `provider.ts`. Fiscal receipts (OFD) are out of scope for v1, the hook point is right after a payment turns paid.

Email: `SmtpEmail` in `apps/api/src/lib/email.ts` is the stub for real login emails, set `EMAIL_PROVIDER=smtp` plus SMTP credentials, and remember SPF/DKIM. SMS: `EskizSms` in `apps/api/src/lib/sms.ts` stays as the stub for future booking notifications via eskiz.uz.
