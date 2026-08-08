// api errors always leave as { error: { code, message } }
// codes are stable, the client translates them

export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message?: string,
    public details?: unknown
  ) {
    super(message ?? code);
  }
}

export const errors = {
  unauthorized: () => new AppError('UNAUTHORIZED', 401),
  forbidden: () => new AppError('FORBIDDEN', 403),
  notFound: (what = 'resource') => new AppError('NOT_FOUND', 404, `${what} not found`),
  validation: (details?: unknown) => new AppError('VALIDATION_ERROR', 400, 'invalid input', details),
  otpInvalid: () => new AppError('OTP_INVALID', 400),
  otpExpired: () => new AppError('OTP_EXPIRED', 400),
  otpCooldown: () => new AppError('OTP_COOLDOWN', 429),
  otpTooMany: () => new AppError('OTP_TOO_MANY', 429),
  slotTaken: () => new AppError('SLOT_TAKEN', 409),
  scheduleClosed: () => new AppError('SCHEDULE_CLOSED', 400),
  bookingState: () => new AppError('BOOKING_STATE', 409),
  paymentState: () => new AppError('PAYMENT_STATE', 409),
  splitState: () => new AppError('SPLIT_STATE', 409),
  userBlocked: () => new AppError('USER_BLOCKED', 403),
  emailTaken: () => new AppError('EMAIL_TAKEN', 409),
  phoneTaken: () => new AppError('PHONE_TAKEN', 409),
  passwordInvalid: () => new AppError('PASSWORD_INVALID', 401),
  venueNotActive: () => new AppError('VENUE_NOT_ACTIVE', 400),
  promoInvalid: () => new AppError('PROMO_INVALID', 400),
  promoExpired: () => new AppError('PROMO_EXPIRED', 400),
  promoExhausted: () => new AppError('PROMO_EXHAUSTED', 400),
  rateLimited: () => new AppError('RATE_LIMITED', 429),
};
