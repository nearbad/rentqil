import { z } from 'zod';
import { AMENITIES, DISTRICTS, LOCALES, PAYMENT_PROVIDERS, SPORTS, SURFACES } from './constants';

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+998\d{9}$/, 'expected +998XXXXXXXXX');

export const ymdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

const hourSchema = z.number().int().min(0).max(24);

export const otpRequestSchema = z.object({
  phone: phoneSchema,
});

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().trim().regex(/^\d{6}$/),
});

export const updateMeSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  locale: z.enum(LOCALES).optional(),
});

const sportEnum = z.enum(SPORTS);
const districtEnum = z.enum(DISTRICTS);
const providerEnum = z.enum(
  PAYMENT_PROVIDERS.map((p) => p.id) as [string, ...string[]]
);

export const catalogQuerySchema = z.object({
  sport: sportEnum.optional(),
  district: districtEnum.optional(),
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
  })
  .refine((q) => q.end > q.start, { message: 'end must be after start' });

export const createBookingSchema = z
  .object({
    courtId: z.string().min(1),
    date: ymdSchema,
    startHour: hourSchema,
    endHour: hourSchema,
    split: z
      .object({
        participants: z.number().int().min(2).max(30),
      })
      .optional(),
  })
  .refine((b) => b.endHour > b.startHour, { message: 'endHour must be after startHour' });

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
  district: districtEnum,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  photos: z.array(z.string().url()).max(10).default([]),
  amenities: z.array(z.enum(AMENITIES)).default([]),
  depositPercent: z.number().int().min(0).max(100).optional(),
});

export const policySchema = z.object({
  refundEnabled: z.boolean(),
  freeCancelHours: z.number().int().min(0).max(168),
  lateRefundPercent: z.number().int().min(0).max(100),
});

export const courtUpsertSchema = z.object({
  name: z.string().trim().min(1).max(80),
  sport: sportEnum,
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

export const priceSetSchema = z.object({
  rules: z.array(priceRuleSchema).min(1).max(50),
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
  serviceFeeEnabled: z.boolean().optional(),
  serviceFeeTiyin: z.number().int().min(0).optional(),
  commissionEnabled: z.boolean().optional(),
  commissionPercent: z.number().int().min(0).max(100).optional(),
  defaultDepositPercent: z.number().int().min(0).max(100).optional(),
  minDepositPercent: z.number().int().min(0).max(100).optional(),
  maxDepositPercent: z.number().int().min(0).max(100).optional(),
  bookingTtlMinutes: z.number().int().min(1).max(120).optional(),
  splitTtlMinutes: z.number().int().min(5).max(24 * 60).optional(),
  calendarDays: z.number().int().min(1).max(30).optional(),
  reminderHours: z.number().int().min(1).max(48).optional(),
});

export const adminVenueCommissionSchema = z.object({
  commissionPercent: z.number().int().min(0).max(100).nullable(),
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
