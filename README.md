# rentqil

Online booking for sports venues in Uzbekistan: football pitches, tennis and padel courts, basketball and volleyball halls, gyms. Players find a venue, pick free slots, pay a deposit online and can split the bill with their team through a share link. Owners manage schedules, prices and cancellation policies. The platform takes a per booking service fee and an optional commission.

Payments run against a mock provider for now (Click / Payme / Uzum / Paynet / Uzum Nasiya are selectable, real adapter skeletons are in `apps/api/src/payments`), but all the money logic is production grade: deposits, exact split shares, policy driven refunds, idempotent webhooks.

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

The seed prints the demo accounts. With `SMS_PROVIDER=mock` and `OTP_DEV_ECHO=1` the login code is echoed in the api response and in the api logs, so no real SMS is needed:

- admin: `+998900000000`
- demo owner: `+998901112233`
- demo player: `+998907654321`

Booking flow end to end: pick a venue, select slots, hit "Rent qil!", choose any payment method, then press "Pay" on the mock payment page. The mock provider fires a signed webhook back at the api exactly like a real PSP would.

## Tests

Money logic (deposits, split shares, commission, refund math, slot pricing) is covered by unit tests:

```bash
pnpm test
```

Typecheck everything: `pnpm typecheck`.

## Deploy

Target setup is a single VPS (Hetzner) with docker compose: postgres + api + nginx serving the static web build.

1. Install docker with the compose plugin, clone the repo.
2. Create `.env` in the repo root, start from `.env.example`. The values that matter:

```
POSTGRES_PASSWORD=strong-random-string
JWT_SECRET=long-random-string
MOCK_WEBHOOK_SECRET=another-random-string
WEB_URL=https://rentqil.example.com        # public url of the web app
EXPO_PUBLIC_API_URL=https://api.rentqil.example.com   # public url of the api, baked into the web bundle
ADMIN_PHONE=+998xxxxxxxxx                  # first admin account
```

3. Build and start:

```bash
docker compose up -d --build
```

The api container runs `prisma migrate deploy` on every start. Seed once after the first boot:

```bash
docker compose exec api pnpm exec tsx prisma/seed.ts
```

4. Put your reverse proxy / TLS of choice in front (caddy or certbot + nginx). Point the web domain at port 80 and the api domain at port 3001. If you serve both from one domain instead, route `/` to the web container and set `EXPO_PUBLIC_API_URL` to the api path accordingly before building.

To change platform settings (service fee, commission, deposit bounds, timers) log in as the admin and open Admin -> Config. No redeploy needed.

## Going live with real payments

Each PSP has a skeleton adapter in `apps/api/src/payments` with TODO notes on the protocol (Payme Merchant API, Click prepare/complete, Uzum, Paynet). The plan per provider: sign the contract, fill in the credentials via env, implement the webhook route next to `/webhooks/mock`, then flip `USE_MOCK` in `provider.ts`. Fiscal receipts (OFD) are out of scope for v1, the hook point is right after a payment turns paid.

SMS: `EskizSms` in `apps/api/src/lib/sms.ts` is the stub for eskiz.uz, set `SMS_PROVIDER=eskiz` plus credentials once the sender name is approved.
