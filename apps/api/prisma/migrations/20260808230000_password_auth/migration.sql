-- classic email plus password sign in next to the otp code flow
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
