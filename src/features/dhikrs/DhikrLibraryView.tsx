import React, { useState } from 'react';
import { DhikrItem, TargetMode, CustomDhikrStage } from '../../lib/seedData';
import { toPersianDigits, getShamsiDateInfo } from '../../utils/persian';
import { canAddCustomDhikr, CUSTOM_DHIKR_LIMIT_MESSAGE, CUSTOM_DHIKR_DELETE_CONFIRM_MESSAGE } from '../../lib/dhikrLimits';
import { LOCKED_DHIKR_IDS, LockedFeatureId } from '../../lib/subscription';
import { MULTISTAGE_DHIKR_LOCKED_MESSAGE } from '../../lib/messages';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import {
  Plus,
  Check,
  Edit3,
  Trash2,
  Sparkles,
  BookOpen,
  Calendar,
  X,
  Lock,
  Layers,
} from 'lucide-react';

interface DhikrLibraryViewProps {
  dhikrs: DhikrItem[];
  activeDhikrId: string;
  onSelectDhikr: (id: string) => void;
  onAddCustomDhikr: (newItem: Omit<DhikrItem, 'id' | 'count' | 'totalAllTime' | 'updatedAt'>) => void;
  onEditDhikr: (updated: DhikrItem) => void;
  onDeleteDhikr: (id: string) => void;
  guard: (featureId: LockedFeatureId, onAllowed: () => void, customLockedMessage?: string) => void;
}

export const DhikrLibraryView: React.FC<DhikrLibraryViewProps> = ({
  dhikrs,
  activeDhikrId,
  onSelectDhikr,
  onAddCustomDhikr,
  onEditDhikr,
  onDeleteDhikr,
  guard,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DhikrItem | null>(null);
  const [limitNoticeOpen, setLimitNoticeOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [arabicText, setArabicText] = useState('');
  const [translation, setTranslation] = useState('');
  const [target, setTarget] = useState(100);
  const [targetMode, setTargetMode] = useState<TargetMode>('notify-continue');
  const [isMultiStage, setIsMultiStage] = useState(false);
  const [stages, setStages] = useState<CustomDhikrStage[]>([]);

  const shamsiToday = getShamsiDateInfo();

  const resetStages = () =>
    setStages([
      { id: `stage-${Date.now()}-1`, name: '', target: 33 },
      { id: `stage-${Date.now()}-2`, name: '', target: 33 },
    ]);

  const openAddModal = () => {
    if (!canAddCustomDhikr(dhikrs)) {
      setLimitNoticeOpen(true);
      return;
    }
    setEditingItem(null);
    setTitle('');
    setArabicText('');
    setTranslation('');
    setTarget(100);
    setTargetMode('notify-continue');
    setIsMultiStage(false);
    resetStages();
    setIsFormOpen(true);
  };

  const openEditModal = (item: DhikrItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem(item);
    setTitle(item.title);
    setArabicText(item.arabicText);
    setTranslation(item.translation);
    setTarget(item.target);
    setTargetMode(item.targetMode);
    const hasStages = !!item.customStages && item.customStages.length > 0;
    setIsMultiStage(hasStages);
    setStages(hasStages && item.customStages ? item.customStages : []);
    setIsFormOpen(true);
  };

  const handleToggleMultiStage = (next: boolean) => {
    if (next) {
      guard(
        'multistage-dhikr',
        () => {
          setIsMultiStage(true);
          if (stages.length === 0) resetStages();
        },
        MULTISTAGE_DHIKR_LOCKED_MESSAGE
      );
    } else {
      setIsMultiStage(false);
    }
  };

  const addStageRow = () => {
    setStages((prev) => [...prev, { id: `stage-${Date.now()}`, name: '', target: 33 }]);
  };

  const removeStageRow = (id: string) => {
    setStages((prev) => prev.filter((s) => s.id !== id));
  };

  const updateStageRow = (id: string, patch: Partial<CustomDhikrStage>) => {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (isMultiStage) {
      const validStages = stages
        .map((s) => ({ ...s, name: s.name.trim(), target: Math.max(1, Number(s.target) || 1) }))
        .filter((s) => s.name.length > 0);
      if (validStages.length < 2) return;
      if (!editingItem && !canAddCustomDhikr(dhikrs)) {
        setIsFormOpen(false);
        setLimitNoticeOpen(true);
        return;
      }
      const totalTarget = validStages.reduce((sum, s) => sum + s.target, 0);
      const stagesTitle = title.trim() || validStages.map((s) => s.name).join(' + ');

      if (editingItem) {
        onEditDhikr({
          ...editingItem,
          title: stagesTitle,
          arabicText: arabicText.trim(),
          translation: translation.trim(),
          target: totalTarget,
          targetMode: 'stop',
          customStages: validStages,
          updatedAt: Date.now(),
        });
      } else {
        onAddCustomDhikr({
          title: stagesTitle,
          arabicText: arabicText.trim(),
          translation: translation.trim(),
          target: totalTarget,
          targetMode: 'stop',
          category: 'custom',
          customStages: validStages,
          color: 'var(--accent)',
        });
      }
      setIsFormOpen(false);
      return;
    }

    const hasAnyField = title.trim() || arabicText.trim() || translation.trim();
    if (!hasAnyField) return;
    if (!editingItem && !canAddCustomDhikr(dhikrs)) {
      setIsFormOpen(false);
      setLimitNoticeOpen(true);
      return;
    }

    const fallbackTitle = title.trim() || arabicText.trim() || translation.trim();

    if (editingItem) {
      onEditDhikr({
        ...editingItem,
        title: title.trim() || fallbackTitle,
        arabicText: arabicText.trim(),
        translation: translation.trim(),
        target: Math.max(1, Number(target) || 100),
        targetMode,
        customStages: undefined,
        updatedAt: Date.now(),
      });
    } else {
      onAddCustomDhikr({
        title: title.trim() || fallbackTitle,
        arabicText: arabicText.trim(),
        translation: translation.trim(),
        target: Math.max(1, Number(target) || 100),
        targetMode,
        category: 'custom',
        color: 'var(--accent)',
      });
    }
    setIsFormOpen(false);
  };

  const filteredDhikrs = dhikrs.filter((item) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'weekday') return item.category === 'weekday';
    if (selectedCategory === 'salawat')
      return item.category === 'salawat' || item.category === 'tasbihat' || item.category === 'general';
    if (selectedCategory === 'custom') return item.category === 'custom';
    return true;
  });

  return (
    <div className="flex flex-col flex-1 w-full max-w-2xl mx-auto px-3 pt-2 pb-6">
      {/* Header & Add New Dhikr CTA */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--text)]">کتابخانهٔ ذکر و ادعیه</h2>
          <p className="text-xs text-[var(--muted)]">
            ذکرهای ایام هفته، تسبیحات حضرت زهرا و ذکرهای شخصی شما
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white text-xs font-bold px-3.5 py-2.5 rounded-2xl shadow-md transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>ذکر دلخواه جدید</span>
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 no-scrollbar">
        {[
          { id: 'all', label: 'همه ذکرها' },
          { id: 'weekday', label: 'ذکر ایام هفته' },
          { id: 'salawat', label: 'صلوات و تسبیحات' },
          { id: 'custom', label: 'ذکرهای شخصی' },
        ].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
              selectedCategory === cat.id
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:border-[var(--accent)]/40'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Dhikr Cards Grid (Responsive 1 col on mobile, 2 cols on tablet) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {filteredDhikrs.map((item) => {
          const isSelected = item.id === activeDhikrId;
          const isTodayWeekday =
            item.category === 'weekday' && item.weekdayIndex === shamsiToday.weekdayIndex;

          const lockedFeatureId = LOCKED_DHIKR_IDS[item.id];
          const isCustomMultiStage = !!item.customStages && item.customStages.length > 0;

          const handleCardClick = () => {
            if (lockedFeatureId) {
              guard(lockedFeatureId, () => onSelectDhikr(item.id));
            } else if (isCustomMultiStage) {
              guard('multistage-dhikr', () => onSelectDhikr(item.id), MULTISTAGE_DHIKR_LOCKED_MESSAGE);
            } else {
              onSelectDhikr(item.id);
            }
          };

          return (
            <div
              key={item.id}
              onClick={handleCardClick}
              className={`relative flex flex-col justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-[var(--surface-2)] border-[var(--accent)] shadow-lg'
                  : 'bg-[var(--surface)]/85 border-[var(--border)] hover:border-[var(--accent)]/40'
              }`}
            >
              <div>
                {/* Top Badges & Actions */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isTodayWeekday && (
                      <span className="inline-flex items-center gap-1 bg-[var(--accent)]/20 text-[var(--accent)] text-[10px] font-bold px-2 py-0.5 rounded-md border border-[var(--accent)]/40">
                        <Calendar className="w-3 h-3" />
                        ذکر امروز ({shamsiToday.weekdayName})
                      </span>
                    )}
                    {item.isTasbihatZahra && (
                      <span className="inline-flex items-center gap-1 bg-[var(--success)]/20 text-[var(--success)] text-[10px] font-bold px-2 py-0.5 rounded-md border border-[var(--success)]/40">
                        <Sparkles className="w-3 h-3" />
                        ۳ مرحله‌ای خودکار
                      </span>
                    )}
                    {isCustomMultiStage && (
                      <span className="inline-flex items-center gap-1 bg-[var(--accent)]/20 text-[var(--accent)] text-[10px] font-bold px-2 py-0.5 rounded-md border border-[var(--accent)]/40">
                        <Layers className="w-3 h-3" />
                        {toPersianDigits(item.customStages!.length)} مرحله‌ای دلخواه
                      </span>
                    )}
                    {(lockedFeatureId || isCustomMultiStage) && (
                      <span className="inline-flex items-center gap-1 bg-[var(--muted)]/15 text-[var(--muted)] text-[10px] font-bold px-2 py-0.5 rounded-md border border-[var(--border)]">
                        <Lock className="w-3 h-3" />
                        ویژه مشترکین
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => openEditModal(item, e)}
                      title="ویرایش متن یا هدف"
                      className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--border)]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {item.category === 'custom' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDeleteId(item.id);
                        }}
                        title="حذف ذکر"
                        className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Title & Arabic Text */}
                <h3 className="text-sm font-bold text-[var(--text)] mb-1.5">{item.title}</h3>
                <p className="text-sm font-semibold text-[var(--accent)] leading-relaxed mb-1.5 line-clamp-2">
                  {item.arabicText}
                </p>
                {item.translation && (
                  <p className="text-xs text-[var(--muted)] leading-relaxed line-clamp-2 mb-3">
                    {item.translation}
                  </p>
                )}
              </div>

              {/* Bottom Stats Bar */}
              <div className="flex items-center justify-between pt-2.5 border-t border-[var(--border)] text-xs">
                <div className="flex items-center gap-3 tabular-nums-fa">
                  <span className="text-[var(--muted)]">
                    فعلی:{' '}
                    <strong className="text-[var(--text)]">
                      {toPersianDigits(item.count)}
                    </strong>{' '}
                    / {toPersianDigits(item.target)}
                  </span>
                  <span className="text-[var(--muted)]">
                    کل: <strong className="text-[var(--accent)]">{toPersianDigits(item.totalAllTime)}</strong>
                  </span>
                </div>

                <span
                  className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl ${
                    isSelected
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--bg)] text-[var(--muted)]'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                  {isSelected ? 'فعال' : 'انتخاب'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Custom Dhikr Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--accent)]/30 rounded-3xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[var(--accent)]" />
                <h3 className="text-base font-bold text-[var(--text)]">
                  {editingItem ? 'ویرایش ذکر' : 'افزودن ذکر دلخواه جدید'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--text)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => handleToggleMultiStage(false)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                  !isMultiStage
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                    : 'bg-[var(--bg)] text-[var(--muted)] border-[var(--border)]'
                }`}
              >
                تک‌مرحله‌ای
              </button>
              <button
                type="button"
                onClick={() => handleToggleMultiStage(true)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                  isMultiStage
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                    : 'bg-[var(--bg)] text-[var(--muted)] border-[var(--border)]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                چندمرحله‌ای دلخواه
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="mt-4 space-y-3.5">
              <p className="text-[11px] text-[var(--muted)] leading-relaxed -mt-1">
                {isMultiStage
                  ? 'برای هر مرحله یک نام و تعداد هدف مشخص کنید — دقیقاً مثل تسبیحات اربعه.'
                  : 'لازم نیست هر سه فیلد را پر کنید — حتی با پر کردن فقط یکی از آن‌ها می‌توانید ذخیره کنید.'}
              </p>
              <div>
                <label className="block text-xs font-bold text-[var(--text)] mb-1">
                  نام یا عنوان ذکر
                </label>
                <input
                  type="text"
                  placeholder="مثلاً: ذکر یونسیه یا دعای فرج"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text)] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text)] mb-1">
                  متن عربی / ذکر (پشتیبانی از متن طولانی)
                </label>
                <textarea
                  rows={3}
                  placeholder="لَا إِلٰهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ"
                  value={arabicText}
                  onChange={(e) => setArabicText(e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text)] outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text)] mb-1">
                  ترجمه فارسی یا یادداشت (اختیاری)
                </label>
                <textarea
                  rows={2}
                  placeholder="معبودی جز تو نیست، منزهی تو، همانا من از ستمکاران بودم."
                  value={translation}
                  onChange={(e) => setTranslation(e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text)] outline-none leading-relaxed"
                />
              </div>

              {isMultiStage ? (
                <div className="space-y-2.5">
                  <label className="block text-xs font-bold text-[var(--text)]">مراحل ذکر</label>
                  {stages.map((stage, idx) => (
                    <div key={stage.id} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--muted)] w-4 shrink-0">
                        {toPersianDigits(idx + 1)}
                      </span>
                      <input
                        type="text"
                        placeholder="نام مرحله (مثلاً: سبحان‌الله)"
                        value={stage.name}
                        onChange={(e) => updateStageRow(stage.id, { name: e.target.value })}
                        className="flex-1 bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-3 py-2 text-xs text-[var(--text)] outline-none"
                      />
                      <input
                        type="number"
                        min={1}
                        max={10000}
                        value={stage.target}
                        onChange={(e) => updateStageRow(stage.id, { target: parseInt(e.target.value, 10) || 1 })}
                        className="w-16 bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-2 py-2 text-xs font-bold text-center text-[var(--text)] tabular-nums-fa outline-none"
                      />
                      {stages.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeStageRow(stage.id)}
                          className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addStageRow}
                    className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent)] hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    افزودن مرحله
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text)] mb-1">
                      هدف پیش‌فرض
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100000}
                      value={target}
                      onChange={(e) => setTarget(parseInt(e.target.value, 10) || 100)}
                      className="w-full bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-3 py-2 text-sm font-bold text-center text-[var(--text)] tabular-nums-fa outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--text)] mb-1">
                      حالت پایان هدف
                    </label>
                    <select
                      value={targetMode}
                      onChange={(e) => setTargetMode(e.target.value as TargetMode)}
                      className="w-full bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-2.5 py-2 text-xs text-[var(--text)] outline-none"
                    >
                      <option value="notify-continue">هشدار + ادامه</option>
                      <option value="stop">توقف در پایان</option>
                      <option value="loop">دور خودکار</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-bold text-[var(--muted)]"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs font-bold shadow-md hover:bg-[var(--accent-light)]"
                >
                  ذخیره ذکر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={pendingDeleteId !== null}
        title="حذف ذکر دلخواه"
        message={CUSTOM_DHIKR_DELETE_CONFIRM_MESSAGE}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (pendingDeleteId) onDeleteDhikr(pendingDeleteId);
          setPendingDeleteId(null);
        }}
      />

      <ConfirmDialog
        isOpen={limitNoticeOpen}
        title="سقف ذکرهای دلخواه"
        message={CUSTOM_DHIKR_LIMIT_MESSAGE}
        confirmLabel="متوجه شدم"
        danger={false}
        onCancel={() => setLimitNoticeOpen(false)}
        onConfirm={() => setLimitNoticeOpen(false)}
      />
    </div>
  );
};
