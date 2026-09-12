import { useState, useEffect, useCallback } from 'react';
import {
  loadDhikrs,
  saveDhikrs,
  loadActiveDhikrId,
  saveActiveDhikrId,
  loadDailyLogs,
  saveDailyLogs,
  recordDhikrIncrementInDailyLog,
  deleteDailyLog,
  loadSettings,
  saveSettings,
  UserSettings,
  BackupPayload,
  DEFAULT_SETTINGS,
} from './lib/db';
import { DhikrItem, INITIAL_DHIKR_LIST, TargetMode } from './lib/seedData';
import { setScreenWakeLock } from './lib/haptics';
import { applyTheme } from './lib/theme';
import { getFeatureLockState } from './lib/subscription';
import { getShamsiDateInfo } from './utils/persian';
import { ToastProvider, useToast } from './components/ToastProvider';
import { FeatureGateProvider, useFeatureGate } from './lib/FeatureGateContext';
import { OnboardingTour } from './components/OnboardingTour';
import { useGamificationEvents } from './lib/useGamificationEvents';
import { useOccasionNotice } from './lib/useOccasionNotice';
import { useDailyReminder } from './lib/useDailyReminder';
import { useAppUpdate } from './lib/useAppUpdate';
import { CelebrationModal } from './features/gamification/CelebrationModal';
import { MedalEarnedModal } from './features/gamification/MedalEarnedModal';
import {
  NotebookItemDef,
  NotebookDayEntry,
} from './features/notebook/notebookTypes';
import {
  loadNotebookItems,
  saveNotebookItems,
  loadNotebookEntries,
  saveNotebookEntries,
  createEmptyEntry,
} from './features/notebook/notebookStorage';
import { BottomNav, AppTab } from './components/BottomNav';
import { CounterView } from './features/counter/CounterView';
import { DhikrLibraryView } from './features/dhikrs/DhikrLibraryView';
import { HistoryBackupView } from './features/history/HistoryBackupView';
import { SettingsView } from './features/settings/SettingsView';
import { HomeView } from './features/home/HomeView';
import { NotebookView } from './features/notebook/NotebookView';
import { PaywallView } from './features/subscription/PaywallView';
import { useCountDiscountEvents } from './lib/useCountDiscountEvents';
import { useReferralDiscount } from './lib/useReferralDiscount';
import { consumeActiveCountDiscountCode } from './lib/discounts';
import { CountDiscountModal } from './features/discounts/CountDiscountModal';
import { ReferralDiscountModal } from './features/discounts/ReferralDiscountModal';
import { DiscountEarnedModal } from './features/discounts/DiscountEarnedModal';

export function App() {
  // مورد ۲ب — self-updating build check (see useAppUpdate.ts).
  useAppUpdate();

  const [dhikrs, setDhikrs] = useState<DhikrItem[]>(() => loadDhikrs());
  const [activeDhikrId, setActiveDhikrId] = useState<string>(() =>
    loadActiveDhikrId(loadDhikrs())
  );
  const [dailyLogs, setDailyLogs] = useState(() => loadDailyLogs());
  const [settings, setSettings] = useState<UserSettings>(() => loadSettings());
  const [notebookItems, setNotebookItems] = useState<NotebookItemDef[]>(() => loadNotebookItems());
  const [notebookEntries, setNotebookEntries] = useState<NotebookDayEntry[]>(() => loadNotebookEntries());
  const [activeTab, setActiveTab] = useState<AppTab>('home');

  // Keep Screen Wake Lock active when enabled
  useEffect(() => {
    setScreenWakeLock(settings.wakeLockEnabled);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && settings.wakeLockEnabled) {
        setScreenWakeLock(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [settings.wakeLockEnabled]);

  // Persist dhikrs whenever they change
  useEffect(() => {
    saveDhikrs(dhikrs);
  }, [dhikrs]);

  // Persist active dhikr ID
  useEffect(() => {
    saveActiveDhikrId(activeDhikrId);
  }, [activeDhikrId]);

  // Persist settings
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Persist notebook data
  useEffect(() => {
    saveNotebookItems(notebookItems);
  }, [notebookItems]);
  useEffect(() => {
    saveNotebookEntries(notebookEntries);
  }, [notebookEntries]);

  // Apply day/night mode + color palette as DOM attributes
  useEffect(() => {
    applyTheme(settings.themeMode, settings.colorPalette);
  }, [settings.themeMode, settings.colorPalette]);

  // Once the free trial ends, a non-pro user's theme/palette customization
  // (both locked features) automatically reverts to the default (green
  // palette, day mode) rather than staying on a choice they can no longer change.
  useEffect(() => {
    if (settings.isProUser) return;
    if (getFeatureLockState(settings.isProUser) !== 'locked') return;
    if (settings.themeMode !== 'day' || settings.colorPalette !== 'green') {
      setSettings((prev) => ({ ...prev, themeMode: 'day', colorPalette: 'green' }));
    }
  }, [settings.isProUser, settings.themeMode, settings.colorPalette]);

  // A referral-granted temporary Pro access (بخش ت) expires on its own,
  // exactly like the free trial — this is the "timer" side of that grant;
  // isProUser flips back to false once proGrantExpiresAt has passed. A real
  // (or simulated) purchase via PaywallView clears proGrantExpiresAt instead,
  // making the Pro flag permanent.
  useEffect(() => {
    if (!settings.proGrantExpiresAt) return;
    const checkExpiry = () => {
      setSettings((prev) => {
        if (!prev.proGrantExpiresAt || Date.now() < prev.proGrantExpiresAt) return prev;
        return { ...prev, isProUser: false, proGrantExpiresAt: null };
      });
    };
    checkExpiry();
    const intervalId = window.setInterval(checkExpiry, 60_000);
    return () => window.clearInterval(intervalId);
  }, [settings.proGrantExpiresAt]);

  const activeDhikr =
    dhikrs.find((d) => d.id === activeDhikrId) || dhikrs[0] || INITIAL_DHIKR_LIST[0];

  const todayDateKey = getShamsiDateInfo().dateKey;
  const todayNotebookEntry =
    notebookEntries.find((e) => e.dateKey === todayDateKey) || createEmptyEntry(todayDateKey);

  // Handle +1 / -1 count increment with loop target mode support
  const handleIncrement = useCallback(
    (delta: number) => {
      setDhikrs((prevList) =>
        prevList.map((item) => {
          if (item.id !== activeDhikr.id) return item;

          let nextCount = Math.max(0, item.count + delta);

          // If targetMode is 'loop' and user hit target + 1, loop back to 1
          if (
            delta > 0 &&
            item.targetMode === 'loop' &&
            item.target > 0 &&
            item.count >= item.target
          ) {
            nextCount = 1;
          }

          const nextTotalAllTime =
            delta > 0
              ? item.totalAllTime + delta
              : Math.max(0, item.totalAllTime + delta);

          return {
            ...item,
            count: nextCount,
            totalAllTime: nextTotalAllTime,
            updatedAt: Date.now(),
          };
        })
      );

      // Update daily Shamsi log
      if (delta !== 0) {
        setDailyLogs((prevLogs) =>
          recordDhikrIncrementInDailyLog(
            activeDhikr.id,
            activeDhikr.title,
            delta,
            prevLogs
          )
        );
      }
    },
    [activeDhikr.id, activeDhikr.title]
  );

  // Handle Reset of current dhikr count
  const handleReset = useCallback(() => {
    setDhikrs((prevList) =>
      prevList.map((item) =>
        item.id === activeDhikr.id
          ? { ...item, count: 0, updatedAt: Date.now() }
          : item
      )
    );
  }, [activeDhikr.id]);

  // Handle Target & Target Mode update for active dhikr
  const handleUpdateTarget = useCallback(
    (newTarget: number, newMode: TargetMode) => {
      setDhikrs((prevList) =>
        prevList.map((item) =>
          item.id === activeDhikr.id
            ? {
                ...item,
                target: newTarget,
                targetMode: newMode,
                updatedAt: Date.now(),
              }
            : item
        )
      );
    },
    [activeDhikr.id]
  );

  // Select a dhikr from library or switcher
  const handleSelectDhikr = useCallback((id: string) => {
    setActiveDhikrId(id);
    setActiveTab('counter');
  }, []);

  // Add a custom dhikr
  const handleAddCustomDhikr = useCallback(
    (newItem: Omit<DhikrItem, 'id' | 'count' | 'totalAllTime' | 'updatedAt'>) => {
      const created: DhikrItem = {
        ...newItem,
        id: `custom-${Date.now()}`,
        count: 0,
        totalAllTime: 0,
        updatedAt: Date.now(),
      };
      setDhikrs((prev) => [created, ...prev]);
      setActiveDhikrId(created.id);
      setActiveTab('counter');
    },
    []
  );

  // Edit existing dhikr
  const handleEditDhikr = useCallback((updated: DhikrItem) => {
    setDhikrs((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
  }, []);

  // Delete custom dhikr — history in dailyLogs is untouched, only the
  // selectable item is removed (dailyLogs keep their own title/id snapshot).
  const handleDeleteDhikr = useCallback(
    (id: string) => {
      setDhikrs((prev) => {
        const filtered = prev.filter((item) => item.id !== id);
        if (activeDhikrId === id && filtered.length > 0) {
          setActiveDhikrId(filtered[0].id);
        }
        return filtered;
      });
    },
    [activeDhikrId]
  );

  // Delete a single day's history entry
  const handleDeleteDailyLog = useCallback((dateKey: string) => {
    setDailyLogs((prev) => deleteDailyLog(dateKey, prev));
  }, []);

  // Restore full backup JSON
  const handleRestoreBackup = useCallback((payload: BackupPayload) => {
    setDhikrs(payload.dhikrs);
    setActiveDhikrId(payload.activeDhikrId);
    setDailyLogs(payload.dailyLogs);
    setSettings(payload.settings);
    saveDailyLogs(payload.dailyLogs);
    if (payload.notebookItems) {
      setNotebookItems(payload.notebookItems);
      saveNotebookItems(payload.notebookItems);
    }
    if (payload.notebookEntries) {
      setNotebookEntries(payload.notebookEntries);
      saveNotebookEntries(payload.notebookEntries);
    }
  }, []);

  // Hard reset all data
  const handleHardResetAllData = useCallback(() => {
    setDhikrs(INITIAL_DHIKR_LIST);
    setActiveDhikrId(INITIAL_DHIKR_LIST[0].id);
    setDailyLogs([]);
    setSettings(DEFAULT_SETTINGS);
    saveDailyLogs([]);
    setActiveTab('home');
  }, []);

  // Notebook handlers
  const updateTodayNotebookEntry = useCallback(
    (updater: (entry: NotebookDayEntry) => NotebookDayEntry) => {
      setNotebookEntries((prev) => {
        const idx = prev.findIndex((e) => e.dateKey === todayDateKey);
        const base = idx >= 0 ? prev[idx] : createEmptyEntry(todayDateKey);
        const updated = updater(base);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [...prev, updated];
      });
    },
    [todayDateKey]
  );

  const handleAddNotebookItem = useCallback((text: string) => {
    setNotebookItems((prev) => [...prev, { id: `custom-${Date.now()}`, text, isCustom: true }]);
  }, []);

  const handleDeleteNotebookItem = useCallback((id: string) => {
    setNotebookItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const handleToggleNotebookItem = useCallback(
    (itemId: string) => {
      updateTodayNotebookEntry((entry) => {
        const isChecked = entry.checkedItemIds.includes(itemId);
        return {
          ...entry,
          checkedItemIds: isChecked
            ? entry.checkedItemIds.filter((id) => id !== itemId)
            : [...entry.checkedItemIds, itemId],
        };
      });
    },
    [updateTodayNotebookEntry]
  );

  const handleUpdateNotebookReason = useCallback(
    (itemId: string, why: string, solution: string) => {
      updateTodayNotebookEntry((entry) => ({
        ...entry,
        reasons: { ...entry.reasons, [itemId]: { why, solution } },
      }));
    },
    [updateTodayNotebookEntry]
  );

  const handleUpdateFeelingText = useCallback(
    (text: string) => {
      updateTodayNotebookEntry((entry) => ({ ...entry, feelingText: text }));
    },
    [updateTodayNotebookEntry]
  );

  const handleToggleSticker = useCallback(
    (emoji: string) => {
      updateTodayNotebookEntry((entry) => {
        const hasSticker = entry.stickers.includes(emoji);
        return {
          ...entry,
          stickers: hasSticker ? entry.stickers.filter((s) => s !== emoji) : [...entry.stickers, emoji],
        };
      });
    },
    [updateTodayNotebookEntry]
  );

  const handleFinishOnboarding = useCallback(() => {
    setSettings((prev) => ({ ...prev, onboardingSeen: true }));
  }, []);

  return (
    <ToastProvider>
      <FeatureGateProvider
        isProUser={settings.isProUser}
        todayDateKey={todayDateKey}
        onRequestSubscribe={() => setActiveTab('subscription')}
      >
        <MainShell
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          dhikrs={dhikrs}
          activeDhikr={activeDhikr}
          dailyLogs={dailyLogs}
          settings={settings}
          notebookItems={notebookItems}
          notebookEntries={notebookEntries}
          todayNotebookEntry={todayNotebookEntry}
          todayDateKey={todayDateKey}
          onSelectDhikr={handleSelectDhikr}
          onIncrement={handleIncrement}
          onReset={handleReset}
          onUpdateTarget={handleUpdateTarget}
          onToggleSetting={(key) => setSettings((prev) => ({ ...prev, [key]: !prev[key] }))}
          onAddCustomDhikr={handleAddCustomDhikr}
          onEditDhikr={handleEditDhikr}
          onDeleteDhikr={handleDeleteDhikr}
          onRestoreBackup={handleRestoreBackup}
          onDeleteDailyLog={handleDeleteDailyLog}
          onUpdateSettings={setSettings}
          onHardResetAllData={handleHardResetAllData}
          onAddNotebookItem={handleAddNotebookItem}
          onDeleteNotebookItem={handleDeleteNotebookItem}
          onToggleNotebookItem={handleToggleNotebookItem}
          onUpdateNotebookReason={handleUpdateNotebookReason}
          onUpdateFeelingText={handleUpdateFeelingText}
          onToggleSticker={handleToggleSticker}
          onFinishOnboarding={handleFinishOnboarding}
        />
      </FeatureGateProvider>
    </ToastProvider>
  );
}

interface MainShellProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  dhikrs: DhikrItem[];
  activeDhikr: DhikrItem;
  dailyLogs: ReturnType<typeof loadDailyLogs>;
  settings: UserSettings;
  notebookItems: NotebookItemDef[];
  notebookEntries: NotebookDayEntry[];
  todayNotebookEntry: NotebookDayEntry;
  todayDateKey: string;
  onSelectDhikr: (id: string) => void;
  onIncrement: (delta: number) => void;
  onReset: () => void;
  onUpdateTarget: (newTarget: number, newMode: TargetMode) => void;
  onToggleSetting: (key: keyof UserSettings) => void;
  onAddCustomDhikr: (newItem: Omit<DhikrItem, 'id' | 'count' | 'totalAllTime' | 'updatedAt'>) => void;
  onEditDhikr: (updated: DhikrItem) => void;
  onDeleteDhikr: (id: string) => void;
  onRestoreBackup: (payload: BackupPayload) => void;
  onDeleteDailyLog: (dateKey: string) => void;
  onUpdateSettings: (settings: UserSettings) => void;
  onHardResetAllData: () => void;
  onAddNotebookItem: (text: string) => void;
  onDeleteNotebookItem: (id: string) => void;
  onToggleNotebookItem: (id: string) => void;
  onUpdateNotebookReason: (id: string, why: string, solution: string) => void;
  onUpdateFeelingText: (text: string) => void;
  onToggleSticker: (emoji: string) => void;
  onFinishOnboarding: () => void;
}

function MainShell(props: MainShellProps) {
  const { guard } = useFeatureGate();
  const { showToast } = useToast();

  const {
    medalEarned,
    dismissMedalEarned,
    recordCelebration,
    dismissRecordCelebration,
    starEarnedToast,
    dismissStarEarnedToast,
  } = useGamificationEvents(props.dailyLogs, props.todayDateKey);
  useOccasionNotice(props.todayDateKey);

  // The star-earned toast is shown anchored above the counter box while the
  // user is actually on the counting page (see CounterView) — everywhere
  // else there's no counter box to anchor to, so it falls back to the
  // normal top-of-screen toast.
  useEffect(() => {
    if (!starEarnedToast) return;
    if (props.activeTab === 'counter') return;
    showToast(starEarnedToast, { kind: 'celebration', durationMs: 4000 });
    dismissStarEarnedToast();
  }, [starEarnedToast, props.activeTab, showToast]);

  const todayHasAnyDhikr =
    (props.dailyLogs.find((l) => l.dateKey === props.todayDateKey)?.totalCount || 0) > 0;
  useDailyReminder({
    reminderEnabled: props.settings.reminderEnabled,
    reminderTime: props.settings.reminderTime,
    todayDateKey: props.todayDateKey,
    todayHasAnyDhikr,
  });

  // Two independent discount systems (بخش پ و ت) — see src/lib/discounts.ts.
  const countDiscount = useCountDiscountEvents(props.dailyLogs);
  const referralDiscount = useReferralDiscount();
  const [isCountDiscountModalOpen, setIsCountDiscountModalOpen] = useState(false);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);

  const goToPaywallFromDiscount = () => {
    setIsCountDiscountModalOpen(false);
    countDiscount.dismissEarnedCelebration();
    props.setActiveTab('subscription');
  };

  const handleConsumeCountDiscount = () => {
    consumeActiveCountDiscountCode();
    countDiscount.refreshActiveCode();
  };

  const handleClaimReferral = () => {
    const result = referralDiscount.claim();
    props.onUpdateSettings({
      ...props.settings,
      isProUser: true,
      proGrantExpiresAt: result.proGrantExpiresAt,
    });
    return result;
  };

  // The Notebook tab is paywall-gated — route bottom-nav taps through the
  // gate too (not just the Home page's quick-access card).
  const handleChangeTab = (tab: AppTab) => {
    if (tab === 'notebook') {
      guard('notebook', () => props.setActiveTab('notebook'));
    } else {
      props.setActiveTab(tab);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col justify-between antialiased">
      {/* مورد ۱ — there is deliberately NO header bar here. The «ذکرآرام»
          wordmark was removed in round four, and round five removes the empty
          45px strip it left behind as well, so every page's own content starts
          right at the top of the screen. */}
      <main className="flex-1 flex flex-col">
        {props.activeTab === 'home' && (
          <HomeView
            dailyLogs={props.dailyLogs}
            settings={props.settings}
            onUpdateSettings={props.onUpdateSettings}
            onGoToCounter={() => props.setActiveTab('counter')}
            onGoToLibrary={() => props.setActiveTab('library')}
            onGoToPaywall={() => props.setActiveTab('subscription')}
            activeCountDiscount={countDiscount.activeCode}
            onOpenCountDiscount={() => setIsCountDiscountModalOpen(true)}
            onOpenReferralDiscount={() => setIsReferralModalOpen(true)}
          />
        )}

        {props.activeTab === 'counter' && (
          <CounterView
            activeDhikr={props.activeDhikr}
            dailyLogs={props.dailyLogs}
            settings={props.settings}
            onIncrement={props.onIncrement}
            onReset={props.onReset}
            onUpdateTarget={props.onUpdateTarget}
            onToggleSetting={props.onToggleSetting}
            onOpenLibraryModal={() => props.setActiveTab('library')}
            starEarnedToast={starEarnedToast}
            onDismissStarEarnedToast={dismissStarEarnedToast}
            todayDateKey={props.todayDateKey}
            countingBlocked={!!medalEarned}
            activeCountDiscount={countDiscount.activeCode}
            onOpenCountDiscount={() => setIsCountDiscountModalOpen(true)}
            onOpenReferralDiscount={() => setIsReferralModalOpen(true)}
          />
        )}

        {props.activeTab === 'library' && (
          <DhikrLibraryView
            dhikrs={props.dhikrs}
            activeDhikrId={props.activeDhikr.id}
            isProUser={props.settings.isProUser}
            onSelectDhikr={props.onSelectDhikr}
            onAddCustomDhikr={props.onAddCustomDhikr}
            onEditDhikr={props.onEditDhikr}
            onDeleteDhikr={props.onDeleteDhikr}
            guard={guard}
          />
        )}

        {props.activeTab === 'notebook' && (
          <NotebookView
            items={props.notebookItems}
            todayEntry={props.todayNotebookEntry}
            isProUser={props.settings.isProUser}
            onAddItem={props.onAddNotebookItem}
            onDeleteItem={props.onDeleteNotebookItem}
            onToggleItem={props.onToggleNotebookItem}
            onUpdateReason={props.onUpdateNotebookReason}
            onUpdateFeelingText={props.onUpdateFeelingText}
            onToggleSticker={props.onToggleSticker}
          />
        )}

        {props.activeTab === 'history' && (
          <HistoryBackupView
            dhikrs={props.dhikrs}
            activeDhikrId={props.activeDhikr.id}
            dailyLogs={props.dailyLogs}
            settings={props.settings}
            notebookItems={props.notebookItems}
            notebookEntries={props.notebookEntries}
            onRestoreBackup={props.onRestoreBackup}
            onDeleteDailyLog={props.onDeleteDailyLog}
            guard={guard}
          />
        )}

        {props.activeTab === 'settings' && (
          <SettingsView
            settings={props.settings}
            onUpdateSettings={props.onUpdateSettings}
            onHardResetAllData={props.onHardResetAllData}
            guard={guard}
          />
        )}

        {props.activeTab === 'subscription' && (
          <PaywallView
            settings={props.settings}
            onUpdateSettings={props.onUpdateSettings}
            activeDiscountCode={countDiscount.activeCode}
            onDiscountApplied={handleConsumeCountDiscount}
          />
        )}
      </main>

      <BottomNav activeTab={props.activeTab} onChangeTab={handleChangeTab} />

      {/* مورد ۸ — medals get their own popup with a tap guard; the
          record-broken celebration keeps the previous modal untouched. */}
      {medalEarned && (
        <MedalEarnedModal
          badge={medalEarned}
          dailyLogs={props.dailyLogs}
          todayDateKey={props.todayDateKey}
          onClose={dismissMedalEarned}
        />
      )}

      {recordCelebration && (
        <CelebrationModal
          isOpen
          emoji={recordCelebration.emoji}
          message={recordCelebration.message}
          shareText={recordCelebration.shareText}
          onClose={dismissRecordCelebration}
        />
      )}

      {countDiscount.justEarnedTier && countDiscount.activeCode && (
        <DiscountEarnedModal
          isOpen
          activeCode={countDiscount.activeCode}
          onGoToPaywall={goToPaywallFromDiscount}
          onDismiss={countDiscount.dismissEarnedCelebration}
        />
      )}

      <CountDiscountModal
        isOpen={isCountDiscountModalOpen}
        onClose={() => setIsCountDiscountModalOpen(false)}
        activeCode={countDiscount.activeCode}
        cycleCount={countDiscount.cycleCount}
        cycleDaysLeft={countDiscount.cycleDaysLeft}
        onGoToPaywall={goToPaywallFromDiscount}
      />

      <ReferralDiscountModal
        isOpen={isReferralModalOpen}
        onClose={() => setIsReferralModalOpen(false)}
        eligible={referralDiscount.eligible}
        nextEligibleDate={referralDiscount.nextEligibleDate}
        onClaim={handleClaimReferral}
      />

      <OnboardingTour isActive={!props.settings.onboardingSeen} onFinish={props.onFinishOnboarding} />
    </div>
  );
}

export default App;
