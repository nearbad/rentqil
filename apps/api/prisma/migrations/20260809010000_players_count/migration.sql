-- every booking states its party size, names when documents are required
ALTER TABLE "Booking" ADD COLUMN "playersCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Booking" ADD COLUMN "playerNames" TEXT[] NOT NULL DEFAULT '{}';
