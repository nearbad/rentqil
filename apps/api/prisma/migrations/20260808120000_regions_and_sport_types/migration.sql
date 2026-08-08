-- sports become data instead of an enum, venues get a region

-- court sport is a plain text code now
ALTER TABLE "Court" ALTER COLUMN "sport" TYPE TEXT USING "sport"::TEXT;
DROP TYPE "Sport";

-- region slug, everything seeded so far is in Tashkent
ALTER TABLE "Venue" ADD COLUMN "region" TEXT NOT NULL DEFAULT 'tashkent_city';

-- district used to be a fixed slug list, it is free text now,
-- rewrite the old slugs to readable names
UPDATE "Venue" SET "district" = CASE "district"
  WHEN 'bektemir' THEN 'Bektemir'
  WHEN 'chilanzar' THEN 'Chilonzor'
  WHEN 'mirobod' THEN 'Mirobod'
  WHEN 'mirzo_ulugbek' THEN 'Mirzo Ulug''bek'
  WHEN 'olmazor' THEN 'Olmazor'
  WHEN 'sergeli' THEN 'Sergeli'
  WHEN 'shaykhantahur' THEN 'Shayxontohur'
  WHEN 'uchtepa' THEN 'Uchtepa'
  WHEN 'yakkasaray' THEN 'Yakkasaroy'
  WHEN 'yangihayot' THEN 'Yangihayot'
  WHEN 'yashnabad' THEN 'Yashnobod'
  WHEN 'yunusabad' THEN 'Yunusobod'
  ELSE "district"
END;

CREATE TABLE "SportType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameUz" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'generic',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SportType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SportType_code_key" ON "SportType"("code");

-- the six sports that used to live in the enum
INSERT INTO "SportType" ("id", "code", "nameUz", "nameRu", "nameEn", "icon", "sortOrder") VALUES
  ('sport_football',   'football',   'Futbol',          'Футбол',          'Football',   'football',   1),
  ('sport_tennis',     'tennis',     'Tennis',          'Теннис',          'Tennis',     'tennis',     2),
  ('sport_padel',      'padel',      'Padel',           'Падел',           'Padel',      'tennis',     3),
  ('sport_basketball', 'basketball', 'Basketbol',       'Баскетбол',       'Basketball', 'basketball', 4),
  ('sport_volleyball', 'volleyball', 'Voleybol',        'Волейбол',        'Volleyball', 'volleyball', 5),
  ('sport_gym',        'gym',        'Trenajyor zali',  'Тренажёрный зал', 'Gym',        'gym',        6);
