-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "promoCodeText" TEXT;

-- keep the code visible on bookings made before the snapshot column existed
UPDATE "Booking" b SET "promoCodeText" = p."code" FROM "PromoCode" p WHERE b."promoCodeId" = p."id";
