import { z } from 'zod';
import { AMENITIES, LOCALES, PAYMENT_PROVIDERS, REGIONS, SPORT_ICONS, SURFACES } from './constants';

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+998\d{9}$/, 'expected +998XXXXXXXXX');

export const emailSchema = z.string().trim().toLowerCase().email().max(120);

export const ymdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

const hourSchema = z.number().int().min(0).max(24);

export const otpRequestSchema = z.object({
  email: emailSchema,
});

export const otpVerifySchema = z.object({
  email: emailSchema,
  code: z.string().trim().regex(/^\d{6}$/),
});

const passwordSchema = z.string().min(6).max(72);

// registration and password login share the same shape
export const passwordAuthSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const passwordSetSchema = z.object({
  password: passwordSchema,
});

export const updateMeSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  phone: phoneSchema.optional(),
  locale: z.enum(LOCALES).optional(),
});

// sport codes come from the SportType table, existence is checked in the api
const sportCode = z
  .string()
  .trim()
  .regex(/^[a-z0-9_]{2,30}$/);
const regionEnum = z.enum(REGIONS);
const providerEnum = z.enum(
  PAYMENT_PROVIDERS.map((p) => p.id) as [string, ...string[]]
);

export const catalogQuerySchema = z.object({
  sport: sportCode.optional(),
  region: regionEnum.optional(),
  priceMinTiyin: z.coerce.number().int().min(0).optional(),
  priceMaxTiyin: z.coerce.number().int().positive().optional(),
  indoor: z
    .enum(['1', '0'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === '1')),
  date: ymdSchema.optional(),
  hour: z.coerce.number().int().min(0).max(23).optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(['default', 'price', 'distance']).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  // "load more" pagination, applied after filtering
  limit: z.coerce.number().int().min(1).max(50).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const availabilityQuerySchema = z.object({
  from: ymdSchema.optional(),
  days: z.coerce.number().int().min(1).max(30).optional(),
});

export const quoteQuerySchema = z
  .object({
    courtId: z.string().min(1),
    date: ymdSchema,
    start: z.coerce.number().int().min(0).max(23),
    end: z.coerce.number().int().min(1).max(24),
    promo: z.string().trim().max(30).optional(),
  })
  .refine((q) => q.end > q.start, { message: 'end must be after start' });

export const createBookingSchema = z
  .object({
    courtId: z.string().min(1),
    date: ymdSchema,
    startHour: hourSchema,
    endHour: hourSchema,
    // who answers for this booking at the venue
    contactPhone: phoneSchema,
    playersCount: z.number().int().min(1).max(100),
    // full names of everyone, required when the venue demands documents
    playerNames: z.array(z.string().trim().min(2).max(80)).max(100).default([]),
    split: z
      .object({
        // full name of every player, the creator included
        names: z.array(z.string().trim().min(2).max(80)).min(2).max(30),
      })
      .optional(),
    promoCode: z.string().trim().max(30).optional(),
  })
  .refine((b) => b.endHour > b.startHour, { message: 'endHour must be after startHour' });

// public payment start from the split page, no auth needed
export const splitPayInitSchema = z
  .object({
    provider: z.enum(PAYMENT_PROVIDERS.map((p) => p.id) as [string, ...string[]]),
    participantId: z.string().min(1).optional(),
    // pay every share that is still pending in one payment
    remaining: z.boolean().optional(),
  })
  .refine((b) => Boolean(b.participantId) !== Boolean(b.remaining), {
    message: 'pass either participantId or remaining',
  });

export const paymentInitSchema = z.object({
  bookingId: z.string().min(1),
  participantId: z.string().min(1).optional(),
  provider: providerEnum,
});

// mock psp posts this to our webhook, sig is hmac-sha256 of "paymentId:outcome"
export const mockWebhookSchema = z.object({
  paymentId: z.string().min(1),
  outcome: z.enum(['paid', 'failed']),
  txId: z.string().min(1),
  sig: z.string().min(1),
});

// owner

export const ownerApplySchema = z.object({
  message: z.string().trim().max(500).optional(),
});

export const venueUpsertSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(2000).default(''),
  address: z.string().trim().min(3).max(200),
  region: regionEnum,
  district: z.string().trim().min(2).max(80),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  photos: z.array(z.string().url()).max(10).default([]),
  amenities: z.array(z.enum(AMENITIES)).default([]),
  // a new venue is one bookable field, the court is created with it
  sport: sportCode.optional(),
  indoor: z.boolean().default(false),
  capacity: z.number().int().min(1).max(100).optional(),
  // default daily working window for the new field, owner refines later
  openHour: z.number().int().min(0).max(23).optional(),
  closeHour: z.number().int().min(1).max(24).optional(),
  // wizard extras on creation: cancellation policy and starting prices
  policy: z
    .object({
      refundEnabled: z.boolean(),
      freeCancelHours: z.number().int().min(0).max(168),
      lateRefundPercent: z.number().int().min(0).max(100),
    })
    .optional(),
  priceTiyin: z.number().int().positive().optional(),
  eveningPriceTiyin: z.number().int().positive().optional(),
  weekendPriceTiyin: z.number().int().positive().optional(),
  requireNames: z.boolean().default(false),
  requireDocuments: z.boolean().default(false),
  terms: z.string().trim().max(2000).default(''),
});

// promo codes, exactly one discount kind per code
const promoBaseSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,24}$/)
    .optional(),
  percentOff: z.number().int().min(1).max(100).nullable().optional(),
  amountOffTiyin: z.number().int().positive().nullable().optional(),
  // empty list means every venue of the owner
  venueIds: z.array(z.string().min(1)).max(50).default([]),
  active: z.boolean().default(true),
  maxUses: z.number().int().positive().nullable().optional(),
  endsAt: z.string().datetime({ offset: true }).nullable().optional(),
});

export const promoCreateSchema = promoBaseSchema.refine(
  (p) => Boolean(p.percentOff) !== Boolean(p.amountOffTiyin),
  { message: 'set either percentOff or amountOffTiyin' }
);

export const promoUpdateSchema = promoBaseSchema.omit({ code: true }).partial();

// public "become a partner" form, works without an account
export const partnerApplySchema = z.object({
  name: z.string().trim().min(2).max(80),
  // email or telegram handle, one field for both
  contact: z.string().trim().min(3).max(120),
  // optional free text, admins eyeball it in the requests queue anyway
  inn: z
    .string()
    .trim()
    .max(32)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  message: z.string().trim().max(1000).optional(),
});

export const policySchema = z.object({
  refundEnabled: z.boolean(),
  freeCancelHours: z.number().int().min(0).max(168),
  lateRefundPercent: z.number().int().min(0).max(100),
});

export const courtUpsertSchema = z.object({
  name: z.string().trim().min(1).max(80),
  sport: sportCode,
  surface: z.enum(SURFACES).nullable().optional(),
  capacity: z.number().int().min(1).max(100).nullable().optional(),
  indoor: z.boolean().default(false),
  active: z.boolean().default(true),
});

const scheduleRuleSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    openHour: hourSchema,
    closeHour: hourSchema,
  })
  .refine((r) => r.closeHour > r.openHour, { message: 'closeHour must be after openHour' });

// replace-all editor, the whole week comes in one request
export const scheduleSetSchema = z.object({
  rules: z.array(scheduleRuleSchema).max(21),
});

const priceRuleSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6).nullable(),
    startHour: hourSchema,
    endHour: hourSchema,
    priceTiyin: z.number().int().positive(),
  })
  .refine((r) => r.endHour > r.startHour, { message: 'endHour must be after startHour' });

// zero rules is a valid state, it just means nothing is sellable yet
export const priceSetSchema = z.object({
  rules: z.array(priceRuleSchema).max(50),
});

export const blockSlotSchema = z
  .object({
    date: ymdSchema,
    startHour: hourSchema,
    endHour: hourSchema,
    reason: z.string().trim().max(200).optional(),
  })
  .refine((b) => b.endHour > b.startHour, { message: 'endHour must be after startHour' });

// admin

export const moderationDecisionSchema = z.object({
  approve: z.boolean(),
  comment: z.string().trim().max(500).optional(),
});

export const adminConfigSchema = z.object({
  serviceFeePercent: z.number().int().min(0).max(100).optional(),
  bookingTtlMinutes: z.number().int().min(1).max(120).optional(),
  splitTtlMinutes: z.number().int().min(5).max(24 * 60).optional(),
  calendarDays: z.number().int().min(1).max(30).optional(),
  reminderHours: z.number().int().min(1).max(48).optional(),
});

export const adminPayoutSchema = z.object({
  ownerId: z.string().min(1),
  amountTiyin: z.number().int().positive(),
  note: z.string().trim().max(300).optional(),
});

export const adminRefundSchema = z.object({
  amountTiyin: z.number().int().positive().optional(),
  reason: z.string().trim().max(300).optional(),
});

export const adminUserBlockSchema = z.object({
  blocked: z.boolean(),
});

export const applicationDecisionSchema = z.object({
  approve: z.boolean(),
  comment: z.string().trim().max(500).optional(),
});

export const sportTypeCreateSchema = z.object({
  code: sportCode,
  nameUz: z.string().trim().min(2).max(40),
  nameRu: z.string().trim().min(2).max(40),
  nameEn: z.string().trim().min(2).max(40),
  icon: z.enum(SPORT_ICONS).default('generic'),
  sortOrder: z.number().int().min(0).max(999).default(0),
  active: z.boolean().default(true),
});

// code is fixed after creation, courts reference it
export const sportTypeUpdateSchema = sportTypeCreateSchema.omit({ code: true }).partial();
