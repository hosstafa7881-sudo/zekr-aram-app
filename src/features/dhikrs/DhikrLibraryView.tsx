import React, { useState } from 'react';
import { DhikrItem, TargetMode } from '../../lib/seedData';
import { toPersianDigits, getShamsiDateInfo } from '../../utils/persian';
import {
  Plus,
  Check,
  Edit3,
  Trash2,
  Sparkles,
  BookOpen,
  Calendar,
  X,
} from 'lucide-react';

interface DhikrLibraryViewProps {
  dhikrs: DhikrItem[];
  activeDhikrId: string;
  onSelectDhikr: (id: string) => void;
  onAddCustomDhikr: (newItem: Omit<DhikrItem, 'id' | 'count' | 'totalAllTime' | 'updatedAt'>) => void;
  onEditDhikr: (updated: DhikrItem) => void;
  onDeleteDhikr: (id: string) => void;
}

export const DhikrLibraryView: React.FC<DhikrLibraryViewProps> = ({
  dhikrs,
  activeDhikrId,
  onSelectDhikr,
  onAddCustomDhikr,
  onEditDhikr,
  onDeleteDhikr,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DhikrItem | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [arabicText, setArabicText] = useState('');
  const [translation, setTranslation] = useState('');
  const [target, setTarget] = useState(100);
  const [targetMode, setTargetMode] = useState<TargetMode>('notify-continue');

  const shamsiToday = getShamsiDateInfo();

  const openAddModal = () => {
    setEditingItem(null);
    setTitle('');
    setArabicText('');
    setTranslation('');
    setTarget(100);
    setTargetMode('notify-continue');
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
    setIsFormOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !arabicText.trim()) return;

    if (editingItem) {
      onEditDhikr({
        ...editingItem,
        title: title.trim(),
        arabicText: arabicText.trim(),
        translation: translation.trim(),
        target: Math.max(1, Number(target) || 100),
        targetMode,
        updatedAt: Date.now(),
      });
    } else {
      onAddCustomDhikr({
        title: title.trim(),
        arabicText: arabicText.trim(),
        translation: translation.trim(),
        target: Math.max(1, Number(target) || 100),
        targetMode,
        category: 'custom',
        color: '#D4AF37',
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
          <h2 className="text-lg font-bold text-[#F3F7F4]">کتابخانهٔ ذکر و ادعیه</h2>
          <p className="text-xs text-[#94B2A3]">
            ذکرهای ایام هفته، تسبیحات حضرت زهرا و ذکرهای شخصی شما
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center gap-1.5 bg-[#D4AF37] hover:bg-[#E6C987] text-[#091410] text-xs font-bold px-3.5 py-2.5 rounded-2xl shadow-md transition-all"
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
                ? 'bg-[#D4AF37] text-[#091410] border-[#D4AF37]'
                : 'bg-[#11221B] text-[#94B2A3] border-[#1C352B] hover:border-[#D4AF37]/40'
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

          return (
            <div
              key={item.id}
              onClick={() => onSelectDhikr(item.id)}
              className={`relative flex flex-col justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-[#162B23] border-[#D4AF37] shadow-lg'
                  : 'bg-[#11221B]/85 border-[#1C352B] hover:border-[#D4AF37]/40'
              }`}
            >
              <div>
                {/* Top Badges & Actions */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    {isTodayWeekday && (
                      <span className="inline-flex items-center gap-1 bg-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-bold px-2 py-0.5 rounded-md border border-[#D4AF37]/40">
                        <Calendar className="w-3 h-3" />
                        ذکر امروز ({shamsiToday.weekdayName})
                      </span>
                    )}
                    {item.isTasbihatZahra && (
                      <span className="inline-flex items-center gap-1 bg-[#10B981]/20 text-[#10B981] text-[10px] font-bold px-2 py-0.5 rounded-md border border-[#10B981]/40">
                        <Sparkles className="w-3 h-3" />
                        ۳ مرحله‌ای خودکار
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => openEditModal(item, e)}
                      title="ویرایش متن یا هدف"
                      className="p-1.5 rounded-lg text-[#94B2A3] hover:text-[#F3F7F4] hover:bg-[#1C352B]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {item.category === 'custom' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`آیا از حذف «${item.title}» مطمئن هستید؟`)) {
                            onDeleteDhikr(item.id);
                          }
                        }}
                        title="حذف ذکر"
                        className="p-1.5 rounded-lg text-[#94B2A3] hover:text-[#EF4444] hover:bg-[#EF4444]/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Title & Arabic Text */}
                <h3 className="text-sm font-bold text-[#F3F7F4] mb-1.5">{item.title}</h3>
                <p className="text-sm font-semibold text-[#D4AF37] leading-relaxed mb-1.5 line-clamp-2">
                  {item.arabicText}
                </p>
                {item.translation && (
                  <p className="text-xs text-[#94B2A3] leading-relaxed line-clamp-2 mb-3">
                    {item.translation}
                  </p>
                )}
              </div>

              {/* Bottom Stats Bar */}
              <div className="flex items-center justify-between pt-2.5 border-t border-[#1C352B] text-xs">
                <div className="flex items-center gap-3 tabular-nums-fa">
                  <span className="text-[#94B2A3]">
                    فعلی:{' '}
                    <strong className="text-[#F3F7F4]">
                      {toPersianDigits(item.count)}
                    </strong>{' '}
                    / {toPersianDigits(item.target)}
                  </span>
                  <span className="text-[#94B2A3]">
                    کل: <strong className="text-[#D4AF37]">{toPersianDigits(item.totalAllTime)}</strong>
                  </span>
                </div>

                <span
                  className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl ${
                    isSelected
                      ? 'bg-[#D4AF37] text-[#091410]'
                      : 'bg-[#091410] text-[#94B2A3]'
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
          <div className="w-full max-w-md bg-[#11221B] border border-[#D4AF37]/30 rounded-3xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1C352B]">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-base font-bold text-[#F3F7F4]">
                  {editingItem ? 'ویرایش ذکر' : 'افزودن ذکر دلخواه جدید'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-xl text-[#94B2A3] hover:text-[#F3F7F4]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#F3F7F4] mb-1">
                  نام یا عنوان ذکر *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: ذکر یونسیه یا دعای فرج"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#091410] border border-[#1C352B] focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-sm text-[#F3F7F4] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#F3F7F4] mb-1">
                  متن عربی / ذکر * (پشتیبانی از متن طولانی)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="لَا إِلٰهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ"
                  value={arabicText}
                  onChange={(e) => setArabicText(e.target.value)}
                  className="w-full bg-[#091410] border border-[#1C352B] focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-sm text-[#F3F7F4] outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#F3F7F4] mb-1">
                  ترجمه فارسی یا یادداشت (اختیاری)
                </label>
                <textarea
                  rows={2}
                  placeholder="معبودی جز تو نیست، منزهی تو، همانا من از ستمکاران بودم."
                  value={translation}
                  onChange={(e) => setTranslation(e.target.value)}
                  className="w-full bg-[#091410] border border-[#1C352B] focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-xs text-[#F3F7F4] outline-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#F3F7F4] mb-1">
                    هدف پیش‌فرض
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    value={target}
                    onChange={(e) => setTarget(parseInt(e.target.value, 10) || 100)}
                    className="w-full bg-[#091410] border border-[#1C352B] focus:border-[#D4AF37] rounded-xl px-3 py-2 text-sm font-bold text-center text-[#F3F7F4] tabular-nums-fa outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#F3F7F4] mb-1">
                    حالت پایان هدف
                  </label>
                  <select
                    value={targetMode}
                    onChange={(e) => setTargetMode(e.target.value as TargetMode)}
                    className="w-full bg-[#091410] border border-[#1C352B] focus:border-[#D4AF37] rounded-xl px-2.5 py-2 text-xs text-[#F3F7F4] outline-none"
                  >
                    <option value="notify-continue">هشدار + ادامه</option>
                    <option value="stop">توقف در پایان</option>
                    <option value="loop">دور خودکار</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#091410] border border-[#1C352B] text-xs font-bold text-[#94B2A3]"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#D4AF37] text-[#091410] text-xs font-bold shadow-md hover:bg-[#E6C987]"
                >
                  ذخیره ذکر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
