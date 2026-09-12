// Two independent, fully client-side discount systems for the monthly
// subscription (no backend — everything below is local state, exactly like
// the existing trial system in subscription.ts). See the product spec's
// بخش ب/پ/ت/ث for the full rules this file implements.
//
// Neither system touches the existing lifetime star/medal gamification in
// gamification.ts — they are deliberately separate reward tracks.

import { DailyLog } from './db';
import { getShamsiDateInfo } from '../utils/persian';
import { extendFreeAccessByDays, getEffectiveFreeEndDate } from './subscription';

// ---------------------------------------------------------------------------
// بخش ب — multi-SKU monthly pricing (display-only; not wired to a real store
// yet). Which SKU to "charge" is decided client-side from the user's active
// discount, since Cafe Bazaar's dynamic-discount feature has no equivalent
// on Myket — three flat-price SKUs behave identically on every store.
// ---------------------------------------------------------------------------

export type MonthlySkuId = 'full' | 'discount30' | 'discount50';

export interface MonthlyPricingSku {
  id: MonthlySkuId;
  priceToman: number;
  label: string;
}

export const MONTHLY_PRICING_SKUS: Record<MonthlySkuId, MonthlyPricingSku> = {
  full: { id: 'full', priceToman: 60000, label: 'قیمت کامل' },
  discount30: { id: 'discount30', priceToman: 42000, label: 'با ۳۰٪ تخفیف' },
  discount50: { id: 'discount50', priceToman: 30000, label: 'با ۵۰٪ تخفیف' },
};

export function getSkuForDiscountPercent(percent: 30 | 50 | null): MonthlyPricingSku {
  if (percent === 30) return MONTHLY_PRICING_SKUS.discount30;
  if (percent === 50) return MONTHLY_PRICING_SKUS.discount50;
  return MONTHLY_PRICING_SKUS.full;
}

function generateDiscountCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid ambiguity
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota issues
  }
}

// ---------------------------------------------------------------------------
// بخش پ — dhikr-count-based discount (30% at 5,000 / 50% at 20,000, per a
// rotating 30-day cycle — the same "days since an anchor date" logic the
// free-trial cycle already uses, just with its own independent anchor).
// ---------------------------------------------------------------------------

const CYCLE_START_KEY = 'zikraram_discount_cycle_start_v1';
const COUNT_DISCOUNT_STATE_KEY = 'zikraram_count_discount_state_v1';

export const DISCOUNT_CYCLE_DAYS = 30;
export const TIER_30_THRESHOLD = 5000;
export const TIER_50_THRESHOLD = 20000;
export const DISCOUNT_CODE_VALID_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ActiveDiscountCode {
  tier: 30 | 50;
  code: string;
  issuedAt: number;
  expiresAt: number;
}

export interface CountDiscountState {
  activeCode: ActiveDiscountCode | null;
  /** `${cycleIndex}-${tier}` of the last tier we already popped a celebration for, so reloading never re-fires it. */
  celebratedForCycleTier: string | null;
}

const DEFAULT_COUNT_DISCOUNT_STATE: CountDiscountState = {
  activeCode: null,
  celebratedForCycleTier: null,
};

function toMidnight(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function getDiscountCycleStartDate(): number {
  try {
    const raw = localStorage.getItem(CYCLE_START_KEY);
    if (raw) return parseInt(raw, 10);
    const now = Date.now();
    localStorage.setItem(CYCLE_START_KEY, String(now));
    return now;
  } catch {
    return Date.now();
  }
}

// Daily logs only carry calendar-day granularity (one aggregated totalCount
// per dateKey, no per-tap timestamp) — comparing that against a cycle
// boundary at the exact clock-time the feature/cycle happened to start
// would silently drop every bit of dhikr said earlier that same calendar
// day (since a day's log always resolves to that day's midnight, which is
// always "before" any later time on the same day). Bucketing everything to
// midnight, on both sides of the comparison, is what makes day-1 dhikr
// count regardless of what time of day the cycle actually started.
export function getCurrentCycleIndex(now = Date.now()): number {
  const startMidnight = toMidnight(getDiscountCycleStartDate());
  const daysSince = Math.floor((toMidnight(now) - startMidnight) / DAY_MS);
  return Math.floor(Math.max(0, daysSince) / DISCOUNT_CYCLE_DAYS);
}

export function getCurrentCycleBounds(now = Date.now()): { start: number; end: number } {
  const cycleStartMidnight = toMidnight(getDiscountCycleStartDate());
  const idx = getCurrentCycleIndex(now);
  const start = cycleStartMidnight + idx * DISCOUNT_CYCLE_DAYS * DAY_MS;
  const end = start + DISCOUNT_CYCLE_DAYS * DAY_MS;
  return { start, end };
}

export function getCurrentCycleDaysLeft(now = Date.now()): number {
  const { end } = getCurrentCycleBounds(now);
  return Math.max(0, Math.ceil((end - toMidnight(now)) / DAY_MS));
}

export function computeCurrentCycleDhikrCount(dailyLogs: DailyLog[], now = Date.now()): number {
  const { start, end } = getCurrentCycleBounds(now);
  return dailyLogs.reduce((sum, log) => {
    const t = new Date(log.dateKey + 'T00:00:00').getTime();
    if (t >= start && t < end) return sum + (log.totalCount || 0);
    return sum;
  }, 0);
}

export function loadCountDiscountState(): CountDiscountState {
  return readJSON(COUNT_DISCOUNT_STATE_KEY, DEFAULT_COUNT_DISCOUNT_STATE);
}

export function saveCountDiscountState(state: CountDiscountState) {
  writeJSON(COUNT_DISCOUNT_STATE_KEY, state);
}

export function issueDiscountCode(tier: 30 | 50, now = Date.now()): ActiveDiscountCode {
  return {
    tier,
    code: generateDiscountCode(),
    issuedAt: now,
    expiresAt: now + DISCOUNT_CODE_VALID_DAYS * DAY_MS,
  };
}

/** Clears the active count-based code once it's been spent on an actual purchase (single-use). */
export function consumeActiveCountDiscountCode() {
  const state = loadCountDiscountState();
  saveCountDiscountState({ ...state, activeCode: null });
}

export function formatCodeExpiryDate(expiresAt: number): string {
  return getShamsiDateInfo(new Date(expiresAt)).formattedFull;
}

export const COUNT_DISCOUNT_EXPLAINER =
  'این ماه ۵ هزار ذکر بگو تا ۳۰٪ تخفیف بگیری، یا ۲۰ هزار ذکر بگو تا ۵۰٪ تخفیف بگیری';

export const TIER_EARNED_MESSAGE = (tier: 30 | 50) =>
  tier === 30
    ? 'تبریک می‌گم! با گفتن ۵ هزار ذکر در این دوره‌ی ۳۰ روزه، کد تخفیف ۳۰ درصدی برای تهیه اشتراک ماهانه فعال شد 🌹'
    : 'تبریک می‌گم! با گفتن ۲۰ هزار ذکر در این دوره‌ی ۳۰ روزه، کد تخفیف ۵۰ درصدی برای تهیه اشتراک ماهانه فعال شد 🌹';

// ---------------------------------------------------------------------------
// بخش ت — referral (share the app) honor-system 100% discount, re-eligible
// every 180 days. No server verification — a single confirm click grants it.
// ---------------------------------------------------------------------------

const REFERRAL_LAST_USED_KEY = 'zikraram_referral_last_used_v1';
export const REFERRAL_COOLDOWN_DAYS = 180;
export const REFERRAL_GRANT_DAYS = 30;

export function getReferralLastUsed(): number | null {
  try {
    const raw = localStorage.getItem(REFERRAL_LAST_USED_KEY);
    return raw ? parseInt(raw, 10) : null;
  } catch {
    return null;
  }
}

export function isReferralEligible(now = Date.now()): boolean {
  const last = getReferralLastUsed();
  if (!last) return true;
  return now - last >= REFERRAL_COOLDOWN_DAYS * DAY_MS;
}

export function getReferralNextEligibleDate(): number | null {
  const last = getReferralLastUsed();
  if (!last) return null;
  return last + REFERRAL_COOLDOWN_DAYS * DAY_MS;
}

export interface ReferralGrantResult {
  code: string;
  /** When the code was activated (مورد ۱۷ shows this date). */
  activatedAt: number;
  /** The NEW end of the user's free access after adding 30 days to whatever was left (مورد ۱۸). */
  freeEndDate: number;
  /** When the code becomes usable again — exactly 180 days after activation. */
  nextEligibleAt: number;
}

export function setReferralLastUsed(timestamp: number | null) {
  try {
    if (timestamp === null) localStorage.removeItem(REFERRAL_LAST_USED_KEY);
    else localStorage.setItem(REFERRAL_LAST_USED_KEY, String(timestamp));
  } catch {
    // Ignore
  }
}

/**
 * Marks the referral as used right now and stacks its 30 free days on top of
 * whatever free time the user still had (مورد ۱۸ — e.g. 28 days left + 30 =
 * 58). Everything about locking and the countdown keeps running through the
 * shared trial gate; there is no separate parallel timer.
 */
export function markReferralUsedNow(now = Date.now()): ReferralGrantResult {
  setReferralLastUsed(now);
  const freeEndDate = extendFreeAccessByDays(REFERRAL_GRANT_DAYS, now);
  return {
    code: generateDiscountCode(),
    activatedAt: now,
    freeEndDate,
    nextEligibleAt: now + REFERRAL_COOLDOWN_DAYS * DAY_MS,
  };
}

/** Whole days left in the current free window — used by مورد ۱۷'s «از الان تا [X] روز دیگه…» line. */
export function getFreeDaysLeft(now = Date.now()): number {
  return Math.max(0, Math.ceil((getEffectiveFreeEndDate() - now) / DAY_MS));
}

export const REFERRAL_ALREADY_USED_MESSAGE = (nextEligibleDateLabel: string) =>
  `کد تخفیف ۱۰۰درصدی رو قبلاً گرفتی 🎁. دفعه‌ی بعدی در تاریخ ${nextEligibleDateLabel} می‌تونی بازم ازش استفاده کنی 🙏`;
