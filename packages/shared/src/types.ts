import type { Amenity, BookingStatus, Locale, PaymentProviderId, Region, Sport, SportIcon, Surface } from './constants';

export type Role = 'user' | 'owner' | 'admin';

export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}

export interface MeView {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  role: Role;
  locale: Locale;
  ownerApplicationStatus: 'none' | 'pending' | 'approved' | 'rejected';
}

// cancellation policy rendered as a badge on cards
export type PolicyBadge =
  | { kind: 'no_refund' }
  | { kind: 'free_until'; hours: number; latePercent: number };

// a sport row as served by the api, names are picked by locale on the client
export interface SportTypeView {
  id: string;
  code: string;
  names: Record<Locale, string>;
  icon: SportIcon;
  sortOrder: number;
  active: boolean;
}

export interface VenueCardView {
  id: string;
  name: string;
  region: Region;
  district: string;
  address: string;
  photos: string[];
  sports: Sport[];
  amenities: Amenity[];
  hasIndoor: boolean;
  hasOutdoor: boolean;
  priceFromTiyin: number | null;
  policyBadge: PolicyBadge;
  lat: number;
  lng: number;
  distanceKm?: number;
}

export interface CourtView {
  id: string;
  name: string;
  sport: Sport;
  surface: Surface | null;
  capacity: number | null;
  indoor: boolean;
}

export interface VenueDetailView extends VenueCardView {
  description: string;
  courts: CourtView[];
  // player facing conditions set by the owner
  requireNames: boolean;
  requireDocuments: boolean;
  terms: string;
}

export type SlotState = 'free' | 'busy' | 'yours';

export interface SlotView {
  hour: number;
  priceTiyin: number;
  state: SlotState;
}

export interface DayAvailabilityView {
  date: string; // YYYY-MM-DD
  slots: SlotView[];
}

// the full price is paid online plus a non refundable service fee
export interface BookingQuoteView {
  totalTiyin: number;
  serviceFeeTiyin: number;
  payNowTiyin: number;
}

export interface BookingQuoteResponse extends BookingQuoteView {
  venueName: string;
  courtName: string;
  sport: Sport;
  date: string;
  startHour: number;
  endHour: number;
  holdMinutes: number;
  splitHoldMinutes: number;
  policyBadge: PolicyBadge;
  requireNames: boolean;
}

export interface ParticipantView {
  id: string;
  fullName: string;
  shareTiyin: number;
  status: 'pending' | 'paid' | 'refunded';
  isCreator: boolean;
  paidByMe: boolean;
}

export interface BookingView {
  id: string;
  status: BookingStatus;
  venueId: string;
  venueName: string;
  venueAddress: string;
  courtName: string;
  courtId: string;
  sport: Sport;
  date: string;
  startHour: number;
  endHour: number;
  totalTiyin: number;
  serviceFeeTiyin: number;
  payNowTiyin: number;
  contactPhone: string;
  isSplit: boolean;
  splitToken: string | null;
  participants: ParticipantView[];
  expiresAt: string | null;
  createdAt: string;
  isCreator: boolean;
  noShow: boolean;
}

export interface CancelQuoteView {
  allowed: boolean;
  refundTiyin: number;
  paidTiyin: number;
  reason: 'free_window' | 'late' | 'no_refund' | 'nothing_paid';
}

export interface SplitPublicView {
  bookingId: string;
  status: BookingStatus;
  venueName: string;
  courtName: string;
  date: string;
  startHour: number;
  endHour: number;
  sharesTotal: number;
  sharesPaid: number;
  participants: ParticipantView[];
  expiresAt: string | null;
  payNowTiyin: number;
}

export interface PaymentPublicView {
  id: string;
  provider: PaymentProviderId;
  amountTiyin: number;
  status: 'created' | 'paid' | 'failed' | 'refunded';
  bookingId: string;
  description: string;
}

export interface PlatformConfigView {
  serviceFeePercent: number;
  // tells the login screen whether to show the google button
  googleAuthEnabled: boolean;
  bookingTtlMinutes: number;
  splitTtlMinutes: number;
  calendarDays: number;
  slotMinutes: number;
  reminderHours: number;
}

export interface NotificationView {
  id: string;
  type: string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

// owner side

export interface ScheduleRuleView {
  id: string;
  dayOfWeek: number;
  openHour: number;
  closeHour: number;
}

export interface PriceRuleView {
  id: string;
  dayOfWeek: number | null;
  startHour: number;
  endHour: number;
  priceTiyin: number;
}

export interface BlockedSlotView {
  id: string;
  date: string;
  startHour: number;
  endHour: number;
  reason: string | null;
}

export interface OwnerVenueView extends VenueDetailView {
  status: 'pending' | 'approved' | 'rejected';
  moderationComment: string | null;
  hasPendingChanges: boolean;
  policy: { refundEnabled: boolean; freeCancelHours: number; lateRefundPercent: number };
}

export interface OwnerBookingView extends BookingView {
  creatorName: string | null;
  creatorEmail: string | null;
}

export interface OwnerFinanceView {
  completedGrossTiyin: number;
  accruedTiyin: number;
  paidOutTiyin: number;
  payableTiyin: number;
  upcomingHoldsTiyin: number;
  payouts: { id: string; amountTiyin: number; note: string | null; createdAt: string }[];
}

export interface OwnerStatsView {
  from: string;
  to: string;
  bookingsTotal: number;
  revenueTiyin: number;
  noShowCount: number;
  completedCount: number;
  byHour: { hour: number; bookings: number }[];
  byDay: { date: string; bookings: number; revenueTiyin: number }[];
}

// admin side

export interface AdminDashboardView {
  bookingsToday: number;
  bookingsWeek: number;
  gmvWeekTiyin: number;
  serviceFeesWeekTiyin: number;
  topVenues: { venueId: string; name: string; bookings: number; gmvTiyin: number }[];
}

export interface AdminUserView {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  role: Role;
  blocked: boolean;
  createdAt: string;
  bookingsCount: number;
  ownerApplicationStatus: 'none' | 'pending' | 'approved' | 'rejected';
}

export interface ModerationItemView {
  venueId: string;
  venueName: string;
  ownerEmail: string | null;
  kind: 'new' | 'edit';
  submittedAt: string;
  current: Record<string, unknown> | null;
  requested: Record<string, unknown>;
}

export interface AdminPaymentRowView {
  id: string;
  provider: PaymentProviderId;
  type: 'deposit' | 'split_share' | 'refund';
  status: 'created' | 'paid' | 'failed' | 'refunded';
  amountTiyin: number;
  payerEmail: string | null;
  createdAt: string;
}

export interface AdminPayoutRowView {
  ownerId: string;
  ownerName: string | null;
  ownerEmail: string | null;
  accruedTiyin: number;
  paidOutTiyin: number;
  payableTiyin: number;
}
