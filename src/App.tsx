import { useState, useEffect, useCallback } from 'react';
import {
  loadDhikrs,
  saveDhikrs,
  loadActiveDhikrId,
  saveActiveDhikrId,
  loadDailyLogs,
  saveDailyLogs,
  recordDhikrIncrementInDailyLog,
  loadSettings,
  saveSettings,
  UserSettings,
  BackupPayload,
  DEFAULT_SETTINGS,
} from './lib/db';
import { DhikrItem, INITIAL_DHIKR_LIST, TargetMode } from './lib/seedData';
import { setScreenWakeLock } from './lib/haptics';
import { AppHeader } from './components/AppHeader';
import { BottomNav, AppTab } from './components/BottomNav';
import { CounterView } from './features/counter/CounterView';
import { DhikrLibraryView } from './features/dhikrs/DhikrLibraryView';
import { HistoryBackupView } from './features/history/HistoryBackupView';
import { SettingsView } from './features/settings/SettingsView';

export function App() {
  const [dhikrs, setDhikrs] = useState<DhikrItem[]>(() => loadDhikrs());
  const [activeDhikrId, setActiveDhikrId] = useState<string>(() =>
    loadActiveDhikrId(loadDhikrs())
  );
  const [dailyLogs, setDailyLogs] = useState(() => loadDailyLogs());
  const [settings, setSettings] = useState<UserSettings>(() => loadSettings());
  const [activeTab, setActiveTab] = useState<AppTab>('counter');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Listen for PWA install prompt on Android Chrome
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

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

  const activeDhikr =
    dhikrs.find((d) => d.id === activeDhikrId) || dhikrs[0] || INITIAL_DHIKR_LIST[0];

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

  // Delete custom dhikr
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

  // Restore full backup JSON
  const handleRestoreBackup = useCallback((payload: BackupPayload) => {
    setDhikrs(payload.dhikrs);
    setActiveDhikrId(payload.activeDhikrId);
    setDailyLogs(payload.dailyLogs);
    setSettings(payload.settings);
    saveDailyLogs(payload.dailyLogs);
  }, []);

  // Hard reset all data
  const handleHardResetAllData = useCallback(() => {
    setDhikrs(INITIAL_DHIKR_LIST);
    setActiveDhikrId(INITIAL_DHIKR_LIST[0].id);
    setDailyLogs([]);
    setSettings(DEFAULT_SETTINGS);
    saveDailyLogs([]);
    setActiveTab('counter');
  }, []);

  // Trigger native PWA install prompt
  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-[#091410] text-[#F3F7F4] flex flex-col justify-between antialiased">
      {/* Top Sanctuary Header */}
      <AppHeader />

      {/* Main Dynamic View Area */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'counter' && (
          <CounterView
            activeDhikr={activeDhikr}
            allDhikrs={dhikrs}
            settings={settings}
            onSelectDhikr={handleSelectDhikr}
            onIncrement={handleIncrement}
            onReset={handleReset}
            onUpdateTarget={handleUpdateTarget}
            onToggleSetting={(key) =>
              setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
            }
            onOpenLibraryModal={() => setActiveTab('library')}
          />
        )}

        {activeTab === 'library' && (
          <DhikrLibraryView
            dhikrs={dhikrs}
            activeDhikrId={activeDhikr.id}
            onSelectDhikr={handleSelectDhikr}
            onAddCustomDhikr={handleAddCustomDhikr}
            onEditDhikr={handleEditDhikr}
            onDeleteDhikr={handleDeleteDhikr}
          />
        )}

        {activeTab === 'history' && (
          <HistoryBackupView
            dhikrs={dhikrs}
            activeDhikrId={activeDhikr.id}
            dailyLogs={dailyLogs}
            settings={settings}
            onRestoreBackup={handleRestoreBackup}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={setSettings}
            onHardResetAllData={handleHardResetAllData}
            onInstallPWA={handleInstallPWA}
            canInstallPWA={Boolean(deferredPrompt)}
          />
        )}
      </main>

      {/* Bottom Sticky Navigation Bar */}
      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />
    </div>
  );
}
export default App;
