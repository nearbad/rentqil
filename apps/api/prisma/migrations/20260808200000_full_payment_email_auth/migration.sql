-- full upfront payment with a percent service fee, email based auth,
-- venue conditions, split shares with names

-- users: email or google identity, phone becomes optional contact data
ALTER TABLE "User" ADD COLUMN "email" TEXT;
ALTER TABLE "User" ADD COLUMN "googleId" TEXT;
ALTER TABLE "User" ALTER COLUMN "phone" DROP NOT NULL;
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- otp codes go to email addresses now
ALTER TABLE "OtpCode" RENAME COLUMN "phone" TO "identifier";
ALTER INDEX "OtpCode_phone_createdAt_idx" RENAME TO "OtpCode_identifier_createdAt_idx";

-- the seed users predate email auth, give them their addresses so the
-- demo accounts stay reachable, and retire the old phone only admin
UPDATE "User" SET "email" = 'owner@rentqil.com' WHERE "phone" = '+998901112233' AND "email" IS NULL;
UPDATE "User" SET "email" = 'player@rentqil.com' WHERE "phone" = '+998907654321' AND "email" IS NULL;
UPDATE "User" SET "role" = 'user' WHERE "phone" = '+998900000000' AND "email" IS NULL AND "role" = 'admin';

-- venue conditions, per venue money knobs are gone
ALTER TABLE "Venue" ADD COLUMN "requireNames" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Venue" ADD COLUMN "requireDocuments" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Venue" ADD COLUMN "terms" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Venue" DROP COLUMN "depositPercent";
ALTER TABLE "Venue" DROP COLUMN "commissionPercent";

-- bookings: full price online, phone captured per booking,
-- payment history stays in Payment so the dropped snapshots lose nothing
ALTER TABLE "Booking" ADD COLUMN "contactPhone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Booking" DROP COLUMN "depositPercent";
ALTER TABLE "Booking" DROP COLUMN "depositTiyin";
ALTER TABLE "Booking" DROP COLUMN "commissionTiyin";

-- split shares belong to named players
ALTER TABLE "BookingParticipant" ADD COLUMN "fullName" TEXT NOT NULL DEFAULT '';

-- one payment can close several pending shares ("pay for the rest")
ALTER TABLE "Payment" ADD COLUMN "coversParticipantIds" TEXT[] NOT NULL DEFAULT '{}';

-- config: single percent fee replaces the fixed fee, commission and deposits
ALTER TABLE "PlatformConfig" ADD COLUMN "serviceFeePercent" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "PlatformConfig" DROP COLUMN "serviceFeeEnabled";
ALTER TABLE "PlatformConfig" DROP COLUMN "serviceFeeTiyin";
ALTER TABLE "PlatformConfig" DROP COLUMN "commissionEnabled";
ALTER TABLE "PlatformConfig" DROP COLUMN "commissionPercent";
ALTER TABLE "PlatformConfig" DROP COLUMN "defaultDepositPercent";
ALTER TABLE "PlatformConfig" DROP COLUMN "minDepositPercent";
ALTER TABLE "PlatformConfig" DROP COLUMN "maxDepositPercent";
