// sport codes are stored as plain strings, the list itself lives in the
// SportType table and is managed by the admin. Courts reference the code.
export type Sport = string;

// icon codes an admin can pick for a sport, the app maps them to lucide icons
export const SPORT_ICONS = [
  'football',
  'tennis',
  'basketball',
  'volleyball',
  'gym',
  'swim',
  'run',
  'fight',
  'table_tennis',
  'bike',
  'generic',
] as const;
export type SportIcon = (typeof SPORT_ICONS)[number];

// administrative regions of Uzbekistan, slugs stored on venues,
// display names live in i18n
export const REGIONS = [
  'tashkent_city',
  'tashkent',
  'andijan',
  'bukhara',
  'fergana',
  'jizzakh',
  'kashkadarya',
  'khorezm',
  'namangan',
  'navoi',
  'samarkand',
  'sirdaryo',
  'surkhandarya',
  'karakalpakstan',
] as const;
export type Region = (typeof REGIONS)[number];

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

// order drives the language menu, english comes first because it is the default
export const LOCALES = ['en', 'ru', 'uz'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

// day indexes follow Date.getDay(), 0 is Sunday
// UI iterates in this order to render Monday first
export const WEEK_UI_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export const SURFACES = ['grass', 'artificial_grass', 'hard', 'clay', 'parquet', 'carpet', 'other'] as const;
export type Surface = (typeof SURFACES)[number];
