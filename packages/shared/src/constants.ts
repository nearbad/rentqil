export const SPORTS = ['football', 'tennis', 'padel', 'basketball', 'volleyball', 'gym'] as const;
export type Sport = (typeof SPORTS)[number];

// Tashkent districts, slugs used as stored values, labels live in i18n
export const DISTRICTS = [
  'bektemir',
  'chilanzar',
  'mirobod',
  'mirzo_ulugbek',
  'olmazor',
  'sergeli',
  'shaykhantahur',
  'uchtepa',
  'yakkasaray',
  'yangihayot',
  'yashnabad',
  'yunusabad',
] as const;
export type District = (typeof DISTRICTS)[number];

export const AMENITIES = ['locker_room', 'shower', 'lighting', 'parking'] as const;
export type Amenity = (typeof AMENITIES)[number];

// brand names are not translated
export const PAYMENT_PROVIDERS = [
  { id: 'click', label: 'Click', installment: false },
  { id: 'payme', label: 'Payme', installment: false },
  { id: 'uzum', label: 'Uzum Bank', installment: false },
  { id: 'paynet', label: 'Paynet', installment: false },
  { id: 'uzum_nasiya', label: 'Uzum Nasiya', installment: true },
] as const;
export type PaymentProviderId = (typeof PAYMENT_PROVIDERS)[number]['id'];

export const BOOKING_STATUSES = [
  'pending_payment',
  'confirmed',
  'completed',
  'cancelled_by_user',
  'cancelled_by_owner',
  'expired',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const LOCALES = ['uz', 'ru', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'uz';

// day indexes follow Date.getDay(), 0 is Sunday
// UI iterates in this order to render Monday first
export const WEEK_UI_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export const SURFACES = ['grass', 'artificial_grass', 'hard', 'clay', 'parquet', 'carpet', 'other'] as const;
export type Surface = (typeof SURFACES)[number];
