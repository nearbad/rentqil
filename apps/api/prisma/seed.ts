import { PrismaClient, type Sport } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { somToTiyin } from '@rentqil/shared';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' });
const prisma = new PrismaClient({ adapter });

const ADMIN_PHONE = process.env.ADMIN_PHONE ?? '+998900000000';
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WEEKEND = [0, 6];

interface CourtSeed {
  name: string;
  sport: Sport;
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
  district: string;
  lat: number;
  lng: number;
  photos: string[];
  amenities: string[];
  depositPercent: number | null;
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
    district: 'chilanzar',
    lat: 41.2795,
    lng: 69.2049,
    photos: [
      'https://picsum.photos/seed/rentqil-arena-1/900/600',
      'https://picsum.photos/seed/rentqil-arena-2/900/600',
      'https://picsum.photos/seed/rentqil-arena-3/900/600',
    ],
    amenities: ['locker_room', 'shower', 'lighting', 'parking'],
    depositPercent: 30,
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
    district: 'yunusabad',
    lat: 41.3565,
    lng: 69.2871,
    photos: [
      'https://picsum.photos/seed/rentqil-tennis-1/900/600',
      'https://picsum.photos/seed/rentqil-tennis-2/900/600',
    ],
    amenities: ['locker_room', 'shower', 'lighting'],
    depositPercent: 50,
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
    district: 'mirzo_ulugbek',
    lat: 41.3258,
    lng: 69.3321,
    photos: ['https://picsum.photos/seed/rentqil-hall-1/900/600'],
    amenities: ['locker_room', 'shower', 'parking'],
    depositPercent: null,
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
];

async function main() {
  await prisma.platformConfig.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  const admin = await prisma.user.upsert({
    where: { phone: ADMIN_PHONE },
    update: { role: 'admin' },
    create: { phone: ADMIN_PHONE, name: 'Admin', role: 'admin', locale: 'ru' },
  });
  console.log(`admin: ${admin.phone}`);

  const owner = await prisma.user.upsert({
    where: { phone: '+998901112233' },
    update: { role: 'owner' },
    create: { phone: '+998901112233', name: 'Bahodir aka', role: 'owner', locale: 'uz' },
  });
  await prisma.ownerApplication.upsert({
    where: { userId: owner.id },
    update: { status: 'approved' },
    create: { userId: owner.id, status: 'approved', message: 'seed', decidedAt: new Date() },
  });
  console.log(`owner: ${owner.phone}`);

  await prisma.user.upsert({
    where: { phone: '+998907654321' },
    update: {},
    create: { phone: '+998907654321', name: 'Timur', locale: 'ru' },
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
        district: seed.district,
        lat: seed.lat,
        lng: seed.lng,
        photos: seed.photos,
        amenities: seed.amenities,
        status: 'approved',
        depositPercent: seed.depositPercent,
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
