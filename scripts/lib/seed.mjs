// Shared localStorage seeding for the Playwright scripts (collage generation
// and the QA screenshot sweep). Keeping it in one file means the story collage
// and the verification screenshots always show the same sample data.

const DAY_MS = 24 * 60 * 60 * 1000;

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const PERSIAN_WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه\u200cشنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
const SHAMSI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

/** Same shape the app itself writes: «شنبه ۲۱ شهریور ۱۴۰۵». */
function shamsiLabel(d) {
  const parts = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(d);
  const get = (type) => {
    const raw = parts.find((p) => p.type === type)?.value || '';
    return parseInt(raw.replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))), 10) || 1;
  };
  const fa = (n) => String(n).replace(/\d/g, (c) => '۰۱۲۳۴۵۶۷۸۹'[Number(c)]);
  return `${PERSIAN_WEEKDAYS[d.getDay()]} ${fa(get('day'))} ${SHAMSI_MONTHS[get('month') - 1]} ${fa(get('year'))}`;
}

/**
 * Builds daily logs whose lifetime total is exactly `lifetimeTotal`, spread
 * over `days` consecutive days ending today, with the most recent week varied
 * so the 7-day chart looks real.
 */
export function buildDailyLogs({ days = 12, lifetimeTotal = 2200 } = {}) {
  const shape = [260, 180, 330, 120, 400, 210, 150, 90, 140, 110, 130, 80];
  const weights = Array.from({ length: days }, (_, i) => shape[i % shape.length]);
  const weightSum = weights.reduce((a, b) => a + b, 0);

  const logs = [];
  let assigned = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - i * DAY_MS);
    let count = Math.round((weights[i] / weightSum) * lifetimeTotal);
    if (i === days - 1) count = lifetimeTotal - assigned;
    assigned += count;
    const salawat = Math.round(count * 0.65);
    logs.push({
      dateKey: dateKey(d),
      shamsiDate: shamsiLabel(d),
      totalCount: count,
      breakdown: {
        'salawat-main': { title: 'صلوات بر محمّد و آل محمّد', count: salawat },
        istighfar: { title: 'استغفار و طلب آمرزش', count: count - salawat },
      },
    });
  }
  return logs;
}

export function buildNotebookEntries() {
  const today = dateKey(new Date());
  const yesterday = dateKey(new Date(Date.now() - DAY_MS));
  return [
    {
      dateKey: today,
      checkedItemIds: ['default-1', 'default-2', 'default-5', 'default-9', 'default-10'],
      reasons: { 'default-3': { why: 'وقت نشد', solution: 'فردا زودتر شروع می‌کنم' } },
      feelingText: 'امروز حالم خوب بود و آرامش داشتم',
      stickers: ['😊', '🌿'],
    },
    {
      dateKey: yesterday,
      checkedItemIds: ['default-1', 'default-8'],
      reasons: { 'default-2': { why: 'خواب موندم', solution: 'ساعت کوک می‌کنم' } },
      feelingText: 'کمی خسته بودم',
      stickers: ['😌'],
    },
  ];
}

function badgesFor(total) {
  const ids = [];
  if (total >= 2000) ids.push('bronze');
  if (total >= 10000) ids.push('silver');
  if (total >= 20000) ids.push('gold');
  return ids;
}

export const SEEDED_SETTINGS = {
  vibrationEnabled: true,
  vibrationIntensity: 'medium',
  soundEnabled: true,
  wakeLockEnabled: true,
  showDiacritics: true,
  fullScreenTapArea: true,
  onboardingSeen: true,
  themeMode: 'day',
  colorPalette: 'green',
  reminderEnabled: false,
  reminderTime: '21:30',
  reminderCustomMessage: '',
  occasionReligiousNotifyEnabled: true,
  occasionNationalNotifyEnabled: true,
  isProUser: false,
  proGrantExpiresAt: null,
};

/**
 * Seeds a fully-populated app: by default 2200 lifetime dhikr (= ۲۲ ستاره و
 * مدال برنز), an active salawat count, notebook entries, and gamification state
 * already marked "seen" so no celebration popup covers the screenshots.
 */
export function buildSeedState({
  lifetimeTotal = 2200,
  activeCount = 330,
  settings = {},
  suppressCelebrations = true,
  /** How many days ago the free trial started (0 = today). */
  trialStartedDaysAgo = 0,
} = {}) {
  const logs = buildDailyLogs({ lifetimeTotal });
  const todayKey = logs[0].dateKey;
  return {
    logs,
    notebookEntries: buildNotebookEntries(),
    todayKey,
    gamification: {
      lastSeenStarCount: suppressCelebrations ? Math.floor(lifetimeTotal / 100) : 0,
      lastSeenBadges: suppressCelebrations ? badgesFor(lifetimeTotal) : [],
      lastStreakCelebratedDateKey: suppressCelebrations ? todayKey : null,
      lastRecordCelebratedDateKey: suppressCelebrations ? todayKey : null,
      badgeThresholdVersion: 2,
    },
    settings: { ...SEEDED_SETTINGS, ...settings },
    activeCount,
    lifetimeTotal,
    trialStart: Date.now() - trialStartedDaysAgo * DAY_MS,
  };
}

/** Runs inside the page (via addInitScript) to write the seeded state into localStorage. */
export function applySeed(state) {
  localStorage.setItem('zikraram_daily_logs_v1', JSON.stringify(state.logs));
  localStorage.setItem('zikraram_notebook_entries_v1', JSON.stringify(state.notebookEntries));
  localStorage.setItem('zikraram_gamification_v1', JSON.stringify(state.gamification));
  localStorage.setItem('zikraram_settings_v1', JSON.stringify(state.settings));
  localStorage.setItem('zikraram_occasion_notified_v1', state.todayKey);
  localStorage.setItem('zikraram_trial_start_v1', String(state.trialStart));
  const raw = localStorage.getItem('zikraram_dhikrs_v1');
  if (raw) {
    try {
      const list = JSON.parse(raw);
      list.forEach((item) => {
        if (item.id === 'salawat-main') {
          item.count = state.activeCount;
          item.totalAllTime = Math.round(state.lifetimeTotal * 0.65);
          item.target = 1000;
        }
      });
      localStorage.setItem('zikraram_dhikrs_v1', JSON.stringify(list));
    } catch {
      /* ignore */
    }
  }
}

/**
 * The app creates `zikraram_dhikrs_v1` itself on first load, so the active
 * dhikr's own counter can only be patched AFTER that first load. Call this,
 * then reload the page.
 */
export function patchActiveDhikr(state) {
  const raw = localStorage.getItem('zikraram_dhikrs_v1');
  if (!raw) return;
  try {
    const list = JSON.parse(raw);
    list.forEach((item) => {
      if (item.id === 'salawat-main') {
        item.count = state.activeCount;
        item.totalAllTime = Math.round(state.lifetimeTotal * 0.65);
        item.target = 1000;
      }
    });
    localStorage.setItem('zikraram_dhikrs_v1', JSON.stringify(list));
  } catch {
    /* ignore */
  }
}
