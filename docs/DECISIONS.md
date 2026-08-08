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

## 15. Sports are data, regions are constants

Sport types moved from a prisma enum to a SportType table with per locale names and an icon code, managed from the admin panel, because the platform serves the whole country and new sports must not require a deploy. Court.sport stays a plain string code validated on write. Regions are the 14 administrative divisions of Uzbekistan and basically never change, so they live as a shared constant with i18n labels, and the old fixed Tashkent district list became a free text field.

## 16. One app, two shells

Same screens serve phone and desktop. Below 920px wide the app looks like a mobile app: bottom tabs, single column, bottom sheet pickers. Above it the header carries the navigation, tabs disappear, the catalog becomes a grid, dropdowns anchor to their trigger. The breakpoint and both content widths are design tokens.

## 17. Yandex maps with an osm fallback

Venue maps and the owner's coordinate picker use the Yandex Maps JS API when EXPO_PUBLIC_YANDEX_MAPS_KEY is baked into the web bundle, and quietly fall back to leaflet + osm tiles when the key is empty. Yandex has the best coverage in Uzbekistan but requires a key, and the fallback keeps dev and test environments zero config.

## 18. Caddy terminates TLS in front of the compose stack

One more container instead of certbot cron plus nginx configs. Caddy reads DOMAIN and ACME_EMAIL from env, renews Let's Encrypt certs on its own and proxies the web and api containers over the internal network, so only ports 80 and 443 are published on the host. Cloudflare stays in "DNS only" mode until the first cert is issued, after that the orange cloud proxy with "Full (strict)" works fine on top.

## 19. Full upfront payment, one percent based fee

Bookings are paid in full online, there is no deposit split between online and cash. The platform charges a service fee as a percent of the price (admin sets it, default 10) on top, and that fee never comes back to the player: refunds by policy return the price part only. Exceptions where everything including the fee returns: the booking never got confirmed (expired split, late webhook) or the venue cancelled, because the player got nothing. Venue commission is gone entirely, partners receive the full price of completed bookings.

## 20. Email and google sign in, phone per booking

Accounts are keyed by email: otp codes by mail (mock provider logs them, smtp is a stub) or google oauth (server side code flow, buttons hidden until keys exist). Phone numbers are no longer identities: the booking form requires a contact phone, it lands on the booking itself and fills the profile on first use. ADMIN_EMAIL becomes admin on first login.

## 21. Split shares carry names and need no account

The creator types the full name of every player, shares are generated per name. The split page works without any login: the link token is the authorization, anyone who has it can pay any open share or everything remaining in one payment. A multi share payment records which shares it covers and refunds itself automatically if one of them got paid concurrently.

## 22. Brutalist black and white

The owner asked for brutalism, which replaced the earlier soft minimalism: zero border radius, 2px black borders, hard 4px offset shadows on cards, buttons and dropdown panels, uppercase button labels, 800 weight headings. Still strictly black on white with the same muted green and red accents.

## 23. Promo codes discount the price, not the fee base logic

Owners create codes scoped to their venues (empty scope = all their venues), either a percent or a fixed sum off. The discount applies to the court price only; the service fee percent is then computed on the discounted price. Booking.totalTiyin stores the discounted price so refunds, finance and payouts keep working untouched, with discountTiyin kept alongside for display. Percent discounts round to whole soms. Usage counting is derived from bookings (confirmed, completed, or live pending) instead of a stored counter, so expired holds free their use automatically.

## 24. Split shares are whole soms, the creator absorbs rounding

splitEven gives every non-creator a share rounded to whole soms and hands the creator the exact remainder, slightly more or less: 100 000 for three is 33 334 + 33 333 + 33 333. Friends see round numbers, the sum always matches to the tiyin.

## 25. Telegram alerts ride on the existing notifier

Owner booking alerts go through the single InAppNotifier: in-app row always, email when a template exists, telegram when the user linked a chat. Linking happens inside the bot with email as proof: the bot takes the account email, the api mails a 6 digit code, the code typed back into the chat binds chat id to user. The bot is raw Bot API over fetch (two endpoints), no sdk; empty TELEGRAM_BOT_TOKEN disables everything.

## 26. Partner requests are a public lead table

"Become a partner" moved to a public /partner page that anyone can submit: name, one contact field (email or telegram), optional INN, message. It lands in PartnerRequest for the admin. A logged in submitter additionally files the classic OwnerApplication so the admin can grant the owner role from the same queue as before.

## 27. Rate limiting is a 40 line in-memory plugin

One api instance means no redis: a sliding window map keyed by ip (fastify trustProxy reads x-forwarded-for behind caddy), 300 req/min globally, with per route overrides on auth and the partner form via route config. Fastify's own 4xx errors (empty json body, payload too large, rate limit) now map to their real status codes instead of a blanket 500.

## 28. Admin edits are final, moderation is for owners

/admin/venues lists and edits any venue through the same VenueForm the owner uses, but the patch endpoint applies changes immediately, clears pendingChanges and can flip status directly. Courts, schedules and prices were already reachable for admins through the owner endpoints.
