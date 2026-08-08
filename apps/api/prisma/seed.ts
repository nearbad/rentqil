import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { somToTiyin } from '@rentqil/shared';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' });
const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? 'admin@rentqil.com').toLowerCase();
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WEEKEND = [0, 6];

// mirrors the base rows the migration inserts, upserted here so a fresh
// database seeded without prior data still gets the full catalog
const sports = [
  { id: 'sport_football', code: 'football', nameUz: 'Futbol', nameRu: 'Футбол', nameEn: 'Football', icon: 'football', sortOrder: 1 },
  { id: 'sport_tennis', code: 'tennis', nameUz: 'Tennis', nameRu: 'Теннис', nameEn: 'Tennis', icon: 'tennis', sortOrder: 2 },
  { id: 'sport_padel', code: 'padel', nameUz: 'Padel', nameRu: 'Падел', nameEn: 'Padel', icon: 'tennis', sortOrder: 3 },
  { id: 'sport_basketball', code: 'basketball', nameUz: 'Basketbol', nameRu: 'Баскетбол', nameEn: 'Basketball', icon: 'basketball', sortOrder: 4 },
  { id: 'sport_volleyball', code: 'volleyball', nameUz: 'Voleybol', nameRu: 'Волейбол', nameEn: 'Volleyball', icon: 'volleyball', sortOrder: 5 },
  { id: 'sport_gym', code: 'gym', nameUz: 'Trenajyor zali', nameRu: 'Тренажёрный зал', nameEn: 'Gym', icon: 'gym', sortOrder: 6 },
];

// one demo venue per region, sports cycled so every sport shows up
const regions = [
  { region: 'tashkent_city', city: 'Toshkent', lat: 41.3111, lng: 69.2797 },
  { region: 'tashkent', city: 'Nurafshon', lat: 41.0433, lng: 69.3672 },
  { region: 'andijan', city: 'Andijon', lat: 40.7821, lng: 72.3442 },
  { region: 'bukhara', city: 'Buxoro', lat: 39.7747, lng: 64.4286 },
  { region: 'fergana', city: "Farg'ona", lat: 40.3864, lng: 71.7864 },
  { region: 'jizzakh', city: 'Jizzax', lat: 40.1158, lng: 67.8422 },
  { region: 'kashkadarya', city: 'Qarshi', lat: 38.8606, lng: 65.7891 },
  { region: 'khorezm', city: 'Urganch', lat: 41.5506, lng: 60.6317 },
  { region: 'namangan', city: 'Namangan', lat: 40.9983, lng: 71.6726 },
  { region: 'navoi', city: 'Navoiy', lat: 40.0844, lng: 65.3792 },
  { region: 'samarkand', city: 'Samarqand', lat: 39.6547, lng: 66.9758 },
  { region: 'sirdaryo', city: 'Guliston', lat: 40.4897, lng: 68.7842 },
  { region: 'surkhandarya', city: 'Termiz', lat: 37.2242, lng: 67.2783 },
  { region: 'karakalpakstan', city: 'Nukus', lat: 42.4531, lng: 59.6103 },
];

// per sport flavor: venue naming, capacity, surface, indoor, base price in som
const sportProfiles: Record<
  string,
  { label: string; capacity: number; surface: string | null; indoor: boolean; baseSom: number }
> = {
  football: { label: 'Futbol Arena', capacity: 14, surface: 'artificial_grass', indoor: false, baseSom: 300_000 },
  tennis: { label: 'Tennis Club', capacity: 4, surface: 'hard', indoor: false, baseSom: 120_000 },
  padel: { label: 'Padel Court', capacity: 4, surface: 'artificial_grass', indoor: true, baseSom: 250_000 },
  basketball: { label: 'Basketball Hall', capacity: 12, surface: 'parquet', indoor: true, baseSom: 200_000 },
  volleyball: { label: 'Volleyball Hall', capacity: 12, surface: 'parquet', indoor: true, baseSom: 180_000 },
  gym: { label: 'Fitness Gym', capacity: 20, surface: null, indoor: true, baseSom: 100_000 },
};

const sportCycle = ['football', 'tennis', 'padel', 'basketball', 'volleyball', 'gym'];

async function main() {
  await prisma.platformConfig.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  for (const s of sports) {
    await prisma.sportType.upsert({ where: { code: s.code }, update: {}, create: s });
  }
  console.log(`sports: ${sports.length}`);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: 'admin' },
    create: { email: ADMIN_EMAIL, name: 'Admin', role: 'admin', locale: 'ru' },
  });
  console.log(`admin: ${admin.email}`);

  const owner = await prisma.user.upsert({
    where: { email: 'owner@rentqil.com' },
    update: { role: 'owner' },
    create: { email: 'owner@rentqil.com', phone: '+998901112233', name: 'Bahodir aka', role: 'owner', locale: 'uz' },
  });
  await prisma.ownerApplication.upsert({
    where: { userId: owner.id },
    update: { status: 'approved' },
    create: { userId: owner.id, status: 'approved', message: 'seed', decidedAt: new Date() },
  });
  console.log(`owner: ${owner.email}`);

  await prisma.user.upsert({
    where: { email: 'player@rentqil.com' },
    update: {},
    create: { email: 'player@rentqil.com', phone: '+998907654321', name: 'Timur', locale: 'ru' },
  });

  for (let i = 0; i < regions.length; i++) {
    const spot = regions[i]!;
    const sport = sportCycle[i % sportCycle.length]!;
    const profile = sportProfiles[sport]!;
    const name = `${spot.city} ${profile.label}`;

    const existing = await prisma.venue.findFirst({ where: { name } });
    if (existing) {
      console.log(`venue exists, skip: ${name}`);
      continue;
    }

    // prices drift a little per region so the catalog looks alive
    const baseSom = profile.baseSom + (i % 3) * 20_000;
    const eveningSom = Math.round(baseSom * 1.25);

    const venue = await prisma.venue.create({
      data: {
        ownerId: owner.id,
        name,
        description: `${spot.city} shahridagi zamonaviy sport maydoni. Onlayn bron qiling va o'ynang.`,
        address: `${spot.city}, Markaziy ko'cha ${10 + i}`,
        region: spot.region,
        district: spot.city,
        lat: spot.lat,
        lng: spot.lng,
        photos: [
          `https://picsum.photos/seed/rentqil-${spot.region}-1/900/600`,
          `https://picsum.photos/seed/rentqil-${spot.region}-2/900/600`,
        ],
        amenities: profile.indoor ? ['locker_room', 'shower', 'parking'] : ['locker_room', 'lighting', 'parking'],
        status: 'approved',
        // every third venue wants documents, names come with them
        requireNames: i % 3 === 0,
        requireDocuments: i % 3 === 0,
        terms: i % 3 === 0 ? "Kirishda shaxsni tasdiqlovchi hujjat ko'rsatiladi." : '',
        policy: {
          create: { refundEnabled: i % 4 !== 3, freeCancelHours: 12, lateRefundPercent: 50 },
        },
      },
    });

    const court = await prisma.court.create({
      data: {
        venueId: venue.id,
        name,
        sport,
        surface: profile.surface,
        capacity: profile.capacity,
        indoor: profile.indoor,
      },
    });

    await prisma.scheduleRule.createMany({
      data: ALL_DAYS.map((day) => ({ courtId: court.id, dayOfWeek: day, openHour: 8, closeHour: 23 })),
    });

    await prisma.priceRule.createMany({
      data: [
        { courtId: court.id, dayOfWeek: null, startHour: 8, endHour: 23, priceTiyin: somToTiyin(baseSom) },
        { courtId: court.id, dayOfWeek: null, startHour: 18, endHour: 23, priceTiyin: somToTiyin(eveningSom) },
        ...WEEKEND.map((day) => ({
          courtId: court.id,
          dayOfWeek: day,
          startHour: 8,
          endHour: 23,
          priceTiyin: somToTiyin(eveningSom),
        })),
      ],
    });

    console.log(`venue created: ${name} (${sport})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
