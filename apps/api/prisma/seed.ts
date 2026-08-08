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

interface CourtSeed {
  name: string;
  sport: string;
  surface: string | null;
  capacity: number | null;
  indoor: boolean;
  open: [number, number];
  // base price plus optional overrides
  baseSom: number;
  eveningSom?: number; // 18:00 to close
  weekendSom?: number; // whole day sat and sun
}

interface VenueSeed {
  ownerPhone: string;
  name: string;
  description: string;
  address: string;
  region: string;
  district: string;
  lat: number;
  lng: number;
  photos: string[];
  amenities: string[];
  requireNames: boolean;
  requireDocuments: boolean;
  terms: string;
  policy: { refundEnabled: boolean; freeCancelHours: number; lateRefundPercent: number };
  courts: CourtSeed[];
}

const venues: VenueSeed[] = [
  {
    ownerPhone: '+998901112233',
    name: 'Chilonzor Arena',
    description:
      "Sun'iy maysali futbol maydonlari, kechki yoritish, dush va kiyinish xonalari. Metro Chilonzor 5 daqiqa.",
    address: "Chilonzor tumani, Bunyodkor shoh ko'chasi 12",
    region: 'tashkent_city',
    district: 'Chilonzor',
    lat: 41.2795,
    lng: 69.2049,
    photos: [
      'https://picsum.photos/seed/rentqil-arena-1/900/600',
      'https://picsum.photos/seed/rentqil-arena-2/900/600',
      'https://picsum.photos/seed/rentqil-arena-3/900/600',
    ],
    amenities: ['locker_room', 'shower', 'lighting', 'parking'],
    requireNames: true,
    requireDocuments: false,
    terms: "Maydonga faqat sport poyabzalida kiriladi. O'yin vaqti tugagach maydonni 5 daqiqada bo'shatish kerak.",
    policy: { refundEnabled: true, freeCancelHours: 12, lateRefundPercent: 50 },
    courts: [
      {
        name: 'Maydon A (5x5)',
        sport: 'football',
        surface: 'artificial_grass',
        capacity: 10,
        indoor: false,
        open: [8, 23],
        baseSom: 350_000,
        eveningSom: 450_000,
        weekendSom: 450_000,
      },
      {
        name: 'Maydon B (7x7)',
        sport: 'football',
        surface: 'artificial_grass',
        capacity: 14,
        indoor: false,
        open: [8, 23],
        baseSom: 500_000,
        eveningSom: 600_000,
        weekendSom: 600_000,
      },
    ],
  },
  {
    ownerPhone: '+998901112233',
    name: 'Yunusobod Tennis Club',
    description:
      'Ikkita xard kort va yopiq padel kort. Raketka ijarasi joyida, murabbiy xizmatlari alohida kelishiladi.',
    address: "Yunusobod tumani, Amir Temur shoh ko'chasi 107",
    region: 'tashkent_city',
    district: 'Yunusobod',
    lat: 41.3565,
    lng: 69.2871,
    photos: [
      'https://picsum.photos/seed/rentqil-tennis-1/900/600',
      'https://picsum.photos/seed/rentqil-tennis-2/900/600',
    ],
    amenities: ['locker_room', 'shower', 'lighting'],
    requireNames: false,
    requireDocuments: true,
    terms: "Kortga birinchi kelganda pasport yoki ID karta ko'rsatish talab qilinadi.",
    policy: { refundEnabled: true, freeCancelHours: 24, lateRefundPercent: 0 },
    courts: [
      {
        name: 'Kort 1',
        sport: 'tennis',
        surface: 'hard',
        capacity: 4,
        indoor: false,
        open: [7, 22],
        baseSom: 120_000,
        eveningSom: 150_000,
      },
      {
        name: 'Kort 2',
        sport: 'tennis',
        surface: 'hard',
        capacity: 4,
        indoor: false,
        open: [7, 22],
        baseSom: 120_000,
        eveningSom: 150_000,
      },
      {
        name: 'Padel kort',
        sport: 'padel',
        surface: 'artificial_grass',
        capacity: 4,
        indoor: true,
        open: [7, 23],
        baseSom: 250_000,
        eveningSom: 300_000,
        weekendSom: 300_000,
      },
    ],
  },
  {
    ownerPhone: '+998901112233',
    name: "Mirzo Ulug'bek Sport Hall",
    description:
      "Yopiq basketbol va voleybol zali, parket qoplama. Jamoaviy mashg'ulotlar va musobaqalar uchun qulay.",
    address: "Mirzo Ulug'bek tumani, Buyuk ipak yo'li 55",
    region: 'tashkent_city',
    district: "Mirzo Ulug'bek",
    lat: 41.3258,
    lng: 69.3321,
    photos: ['https://picsum.photos/seed/rentqil-hall-1/900/600'],
    amenities: ['locker_room', 'shower', 'parking'],
    requireNames: false,
    requireDocuments: false,
    terms: '',
    policy: { refundEnabled: false, freeCancelHours: 0, lateRefundPercent: 0 },
    courts: [
      {
        name: 'Katta zal',
        sport: 'basketball',
        surface: 'parquet',
        capacity: 20,
        indoor: true,
        open: [6, 23],
        baseSom: 200_000,
        eveningSom: 250_000,
      },
      {
        name: 'Voleybol zali',
        sport: 'volleyball',
        surface: 'parquet',
        capacity: 16,
        indoor: true,
        open: [6, 23],
        baseSom: 180_000,
      },
    ],
  },
  {
    ownerPhone: '+998901112233',
    name: 'Registon Football Park',
    description:
      "Samarqand markazidagi ochiq futbol maydonlari. Sun'iy maysa, kechki yoritish, jamoa uchun bepul parkovka.",
    address: "Registon ko'chasi 8",
    region: 'samarkand',
    district: 'Samarqand shahri',
    lat: 39.6547,
    lng: 66.9758,
    photos: [
      'https://picsum.photos/seed/rentqil-registon-1/900/600',
      'https://picsum.photos/seed/rentqil-registon-2/900/600',
    ],
    amenities: ['lighting', 'parking'],
    requireNames: false,
    requireDocuments: false,
    terms: '',
    policy: { refundEnabled: true, freeCancelHours: 6, lateRefundPercent: 30 },
    courts: [
      {
        name: 'Maydon 1 (6x6)',
        sport: 'football',
        surface: 'artificial_grass',
        capacity: 12,
        indoor: false,
        open: [9, 23],
        baseSom: 250_000,
        eveningSom: 320_000,
        weekendSom: 320_000,
      },
    ],
  },
  {
    ownerPhone: '+998901112233',
    name: "Farg'ona Tennis Academy",
    description:
      "Ikkita yopiq kort, professional qoplama. Bolalar va kattalar uchun mashg'ulotlar, raketka ijarasi mavjud.",
    address: "Al-Farg'oniy shoh ko'chasi 21",
    region: 'fergana',
    district: "Farg'ona shahri",
    lat: 40.3864,
    lng: 71.7864,
    photos: ['https://picsum.photos/seed/rentqil-fergana-1/900/600'],
    amenities: ['locker_room', 'shower', 'lighting', 'parking'],
    requireNames: true,
    requireDocuments: false,
    terms: 'Kort faqat tennis poyabzalida ishlatiladi, raketka ijarasi administratorda.',
    policy: { refundEnabled: true, freeCancelHours: 24, lateRefundPercent: 50 },
    courts: [
      {
        name: 'Kort A',
        sport: 'tennis',
        surface: 'hard',
        capacity: 4,
        indoor: true,
        open: [8, 22],
        baseSom: 100_000,
        eveningSom: 130_000,
      },
      {
        name: 'Kort B',
        sport: 'tennis',
        surface: 'hard',
        capacity: 4,
        indoor: true,
        open: [8, 22],
        baseSom: 100_000,
        eveningSom: 130_000,
      },
    ],
  },
];

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

  for (const seed of venues) {
    const existing = await prisma.venue.findFirst({ where: { name: seed.name } });
    if (existing) {
      console.log(`venue exists, skip: ${seed.name}`);
      continue;
    }
    const venue = await prisma.venue.create({
      data: {
        ownerId: owner.id,
        name: seed.name,
        description: seed.description,
        address: seed.address,
        region: seed.region,
        district: seed.district,
        lat: seed.lat,
        lng: seed.lng,
        photos: seed.photos,
        amenities: seed.amenities,
        status: 'approved',
        requireNames: seed.requireNames,
        requireDocuments: seed.requireDocuments,
        terms: seed.terms,
        policy: { create: seed.policy },
      },
    });

    for (const c of seed.courts) {
      const court = await prisma.court.create({
        data: {
          venueId: venue.id,
          name: c.name,
          sport: c.sport,
          surface: c.surface,
          capacity: c.capacity,
          indoor: c.indoor,
        },
      });

      await prisma.scheduleRule.createMany({
        data: ALL_DAYS.map((day) => ({
          courtId: court.id,
          dayOfWeek: day,
          openHour: c.open[0],
          closeHour: c.open[1],
        })),
      });

      // generic all day base price
      const rules = [
        {
          courtId: court.id,
          dayOfWeek: null as number | null,
          startHour: c.open[0],
          endHour: c.open[1],
          priceTiyin: somToTiyin(c.baseSom),
        },
      ];
      if (c.eveningSom) {
        rules.push({
          courtId: court.id,
          dayOfWeek: null,
          startHour: 18,
          endHour: c.open[1],
          priceTiyin: somToTiyin(c.eveningSom),
        });
      }
      if (c.weekendSom) {
        for (const day of WEEKEND) {
          rules.push({
            courtId: court.id,
            dayOfWeek: day,
            startHour: c.open[0],
            endHour: c.open[1],
            priceTiyin: somToTiyin(c.weekendSom),
          });
        }
      }
      await prisma.priceRule.createMany({ data: rules });
    }
    console.log(`venue created: ${seed.name} (${seed.courts.length} courts)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
