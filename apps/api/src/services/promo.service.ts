import { randomBytes } from 'node:crypto';
import type { PromoCodeView } from '@rentqil/shared';
import { prisma } from '../lib/db';
import type { PromoCode } from '../lib/db';

// promo codes are owner made discounts for their venues.
// a use is any booking that still holds or spent the code: confirmed,
// completed, or a pending one that has not expired yet

export type PromoError = 'PROMO_INVALID' | 'PROMO_EXPIRED' | 'PROMO_EXHAUSTED';

export interface PromoResolution {
  promo: PromoCode | null;
  error: PromoError | null;
}

export function normalizePromoCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export async function promoUses(promoId: string): Promise<number> {
  return prisma.booking.count({
    where: {
      promoCodeId: promoId,
      OR: [
        { status: { in: ['confirmed', 'completed'] } },
        { status: 'pending_payment', expiresAt: { gt: new Date() } },
      ],
    },
  });
}

// checks a code against a venue: exists, belongs to the venue owner,
// covers this venue, not expired, not used up
export async function resolvePromo(
  codeRaw: string,
  venueId: string,
  venueOwnerId: string
): Promise<PromoResolution> {
  const code = normalizePromoCode(codeRaw);
  if (!code) return { promo: null, error: 'PROMO_INVALID' };

  const promo = await prisma.promoCode.findUnique({ where: { code } });
  if (!promo || !promo.active) return { promo: null, error: 'PROMO_INVALID' };
  if (promo.ownerId !== venueOwnerId) return { promo: null, error: 'PROMO_INVALID' };
  if (promo.venueIds.length > 0 && !promo.venueIds.includes(venueId)) {
    return { promo: null, error: 'PROMO_INVALID' };
  }
  if (promo.endsAt && promo.endsAt.getTime() <= Date.now()) {
    return { promo: null, error: 'PROMO_EXPIRED' };
  }
  if (promo.maxUses !== null && (await promoUses(promo.id)) >= promo.maxUses) {
    return { promo: null, error: 'PROMO_EXHAUSTED' };
  }
  return { promo, error: null };
}

export function generatePromoCode(): string {
  // unambiguous alphabet, no 0/O or 1/I
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(8);
  let out = '';
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

export async function promoView(promo: PromoCode): Promise<PromoCodeView> {
  return {
    id: promo.id,
    code: promo.code,
    percentOff: promo.percentOff,
    amountOffTiyin: promo.amountOffTiyin,
    venueIds: promo.venueIds,
    active: promo.active,
    maxUses: promo.maxUses,
    usedCount: await promoUses(promo.id),
    endsAt: promo.endsAt?.toISOString() ?? null,
    createdAt: promo.createdAt.toISOString(),
  };
}
