# Decisions log

Spec leaves some things open. Choices made while building, with reasoning. Newest at the bottom.

## 01. Shared package is consumed as TypeScript source

`@rentqil/shared` exposes `src/index.ts` directly, no build step. Metro transpiles it for the app, tsx does it for the api. One less thing to keep in sync. If we ever publish it outside the monorepo we add a tsc build then.

## 02. API runs through tsx in production

No compile step for the api either. tsx startup cost is a one time ~300ms, irrelevant for a long running server. Docker image just copies sources and runs `tsx src/index.ts`. Revisit if cold starts ever matter.

## 03. All times are Asia/Tashkent wall clock

Venues, slots and bookings live in one country, one timezone. Slot hours are stored as plain integers (hour of day), booking dates as calendar dates. Server runs with TZ=Asia/Tashkent so `new Date()` math matches venue wall clock. No UTC conversion anywhere in the domain. If we ever expand beyond UZ this becomes per-venue tz, which is a schema change plus a pile of edge cases we do not need today.

## 04. Slot day of week uses JS convention

0 = Sunday .. 6 = Saturday, same as `Date.getDay()`. UI renders Monday first, that is presentation only.

## 05. Commission base is the full booking price, capped by the deposit

Commission (when enabled) is `round(total * percent / 100)` but never more than the deposit, because the deposit is all the money the platform actually holds. The rest of the price is paid cash at the venue and we cannot withhold from it. Service fee is platform revenue and never touches owner math.

## 06. Owner accruals count completed bookings only

Finance screen shows payable balance as sum over `completed` bookings of `deposit - commission`, minus recorded payouts. Confirmed but not yet played bookings are shown separately as "upcoming holds". Keeps refund handling out of payout math: a cancelled booking simply never reaches `completed`.

## 07. Late cancellation keeps the service fee

Free window cancellation refunds everything paid online (deposit share + service fee). Late cancellation refunds `lateRefundPercent` of the deposit only, the service fee stays with the platform since the platform did its job. Owner side cancellation always refunds 100% of everything. Policy `refundEnabled=false` means zero refund outside of owner cancellations and admin manual refunds.

## 08. Split shares are positional, not personal

Creator sets N participants. Shares are just N equal slots (largest remainder rounding, sums exactly). Anyone who opens the link can pay any open share after OTP login, including several shares ("pay for a friend"). We record who paid, we do not force one share per account.

## 09. Venue photos are URLs in v1

No upload pipeline yet. Owner pastes image URLs (any CDN / imgur / telegram file link works). Upload endpoint with local storage volume is a TODO, the schema (string array) will not change.

## 10. Venue edits go through a pendingChanges JSON

Critical field edits do not un-publish the venue. They land in `Venue.pendingChanges`, the catalog keeps serving the last approved data, admin approves and the patch is merged. Rejected patches are dropped with a comment.

## 11. Concurrency on booking creation uses a pg advisory lock

Two users grabbing the last slot: booking creation takes `pg_advisory_xact_lock(hash(courtId:date))` inside the transaction, then re-checks conflicts. Simple, no serializable isolation retries, good enough for one court's write rate.

## 12. Payment provider brands vs mock

`Payment.provider` stores what the user picked (click / payme / uzum / paynet / uzum_nasiya). Execution is routed to MockProvider for all of them until we have contracts. Real adapter skeletons live next to it with TODOs where credentials and signature checks go. Mock sends a signed webhook over real HTTP to our own endpoint, so the confirm path is exercised the same way a real PSP would.

## 13. Prisma 7, rust-free client

Prisma 7 with the pg driver adapter: query plans run in js, no engine
binaries at runtime, which also makes docker images boring. The generated
client lives in `apps/api/src/generated` (gitignored, rebuilt by
`prisma generate`), the datasource url sits in `prisma.config.ts`.
Deploys run `prisma migrate deploy` before start.

## 14. Money is integer tiyin everywhere

1 som = 100 tiyin. All amounts, config values included, are integer tiyin. Formatting to "1 200 000 so'm" happens only at the UI edge. No floats in money code, division only through helpers that distribute remainders.
