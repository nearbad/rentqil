-- new accounts get english, it is the default site language now
ALTER TABLE "User" ALTER COLUMN "locale" SET DEFAULT 'en';
