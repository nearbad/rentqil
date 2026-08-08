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

// real sport photos from the unsplash cdn, keyed by sport. venues of one
// sport rotate through the pool so every card leads with a different shot
const u = (id: string) => `https://images.unsplash.com/photo-${id}?w=900&q=80&auto=format&fit=crop`;
const sportPhotos: Record<string, string[]> = {
  football: [
    u('1459865264687-595d652de67e'),
    u('1522778119026-d647f0596c20'),
    u('1431324155629-1a6deb1dec8d'),
    u('1553778263-73a83bab9b0c'),
    u('1518604666860-9ed391f76460'),
    u('1579952363873-27f3bade9f55'),
  ],
  tennis: [
    u('1554068865-24cecd4e34b8'),
    u('1595435934249-5df7ed86e1c0'),
    u('1622279457486-62dcc4a431d6'),
    u('1587280501635-68a0e82cd5ff'),
  ],
  padel: [u('1626224583764-f87db24ac4ea'), u('1593341646782-e0b495cff86d'), u('1524015368236-bbf6f72545b6')],
  basketball: [u('1546519638-68e109498ffc'), u('1519861531473-9200262188bf'), u('1504450758481-7338eba7524a')],
  volleyball: [u('1592656094267-764a45160876'), u('1612872087720-bb876e2e67d1')],
  gym: [u('1534438327276-14e5300c3a48'), u('1571902943202-507ec2618e8f'), u('1517836357463-d25dfeac3438')],
};

// two photos per venue, the leading one unique within the sport
function photosFor(sport: string, nthOfSport: number): string[] {
  const pool = sportPhotos[sport] ?? [];
  if (pool.length === 0) return [];
  const first = pool[nthOfSport % pool.length]!;
  const second = pool[(nthOfSport + 1) % pool.length]!;
  return first === second ? [first] : [first, second];
}

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

  const seenOfSport: Record<string, number> = {};
  for (let i = 0; i < regions.length; i++) {
    const spot = regions[i]!;
    const sport = sportCycle[i % sportCycle.length]!;
    const profile = sportProfiles[sport]!;
    const name = `${spot.city} ${profile.label}`;
    const nthOfSport = seenOfSport[sport] ?? 0;
    seenOfSport[sport] = nthOfSport + 1;
    const photos = photosFor(sport, nthOfSport);

    const existing = await prisma.venue.findFirst({ where: { name } });
    if (existing) {
      // keep the venue but refresh the demo photos when they are still
      // the old random placeholders
      if (existing.photos.some((p) => p.includes('picsum.photos'))) {
        await prisma.venue.update({ where: { id: existing.id }, data: { photos } });
        console.log(`venue photos refreshed: ${name}`);
      } else {
        console.log(`venue exists, skip: ${name}`);
      }
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
        photos,
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
