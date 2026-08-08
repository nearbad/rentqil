import type { Amenity, BookingStatus, District, Locale, PaymentProviderId, Sport, Surface } from './constants';

export type Role = 'user' | 'owner' | 'admin';

export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}

export interface MeView {
  id: string;
  phone: string;
  name: string | null;
  role: Role;
  locale: Locale;
  ownerApplicationStatus: 'none' | 'pending' | 'approved' | 'rejected';
}

// cancellation policy rendered as a badge on cards
export type PolicyBadge =
  | { kind: 'no_refund' }
  | { kind: 'free_until'; hours: number; latePercent: number };

export interface VenueCardView {
  id: string;
  name: string;
  district: District;
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

export interface BookingQuoteView {
  totalTiyin: number;
  depositPercent: number;
  depositTiyin: number;
  serviceFeeTiyin: number;
  payNowTiyin: number;
  payAtVenueTiyin: number;
}

export interface ParticipantView {
  id: string;
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
  depositTiyin: number;
  serviceFeeTiyin: number;
  payNowTiyin: number;
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
  serviceFeeEnabled: boolean;
  serviceFeeTiyin: number;
  commissionEnabled: boolean;
  commissionPercent: number;
  defaultDepositPercent: number;
  minDepositPercent: number;
  maxDepositPercent: number;
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
  depositPercent: number;
  policy: { refundEnabled: boolean; freeCancelHours: number; lateRefundPercent: number };
}

export interface OwnerFinanceView {
  completedGrossTiyin: number;
  commissionHeldTiyin: number;
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
  commissionWeekTiyin: number;
  topVenues: { venueId: string; name: string; bookings: number; gmvTiyin: number }[];
}

export interface AdminUserView {
  id: string;
  phone: string;
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
  ownerPhone: string;
  kind: 'new' | 'edit';
  submittedAt: string;
  current: Record<string, unknown> | null;
  requested: Record<string, unknown>;
}

export interface AdminPayoutRowView {
  ownerId: string;
  ownerName: string | null;
  ownerPhone: string;
  accruedTiyin: number;
  paidOutTiyin: number;
  payableTiyin: number;
}
