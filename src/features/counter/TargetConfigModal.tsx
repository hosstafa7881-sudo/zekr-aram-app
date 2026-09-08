import React, { useState } from 'react';
import { TargetMode } from '../../lib/seedData';
import { toPersianDigits } from '../../utils/persian';
import { Target, X, Check } from 'lucide-react';

interface TargetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTarget: number;
  currentMode: TargetMode;
  dhikrTitle: string;
  onSave: (newTarget: number, newMode: TargetMode) => void;
}

const PRESET_TARGETS = [14, 33, 70, 100, 313, 1000];

export const TargetConfigModal: React.FC<TargetConfigModalProps> = ({
  isOpen,
  onClose,
  currentTarget,
  currentMode,
  dhikrTitle,
  onSave,
}) => {
  const [target, setTarget] = useState<number>(currentTarget);
  const [mode, setMode] = useState<TargetMode>(currentMode);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validTarget = Math.max(1, Math.min(100000, Number(target) || 100));
    onSave(validTarget, mode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#11221B] border border-[#D4AF37]/30 rounded-3xl p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#1C352B]">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-[#D4AF37]" />
            <h3 className="text-base font-bold text-[#F3F7F4]">تنظیم هدف اختصاصی ذکر</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#94B2A3] hover:text-[#F3F7F4] hover:bg-[#1C352B]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <p className="text-xs text-[#94B2A3] mb-2">
              هدف فعلی برای <span className="text-[#D4AF37] font-semibold">«{dhikrTitle}»</span>:
            </p>
            <div className="grid grid-cols-6 gap-1.5 mb-3">
              {PRESET_TARGETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTarget(preset)}
                  className={`py-2 rounded-xl text-xs font-bold tabular-nums-fa border transition-all ${
                    target === preset
                      ? 'bg-[#D4AF37] text-[#091410] border-[#D4AF37]'
                      : 'bg-[#091410] text-[#F3F7F4] border-[#1C352B] hover:border-[#D4AF37]/50'
                  }`}
                >
                  {toPersianDigits(preset)}
                </button>
              ))}
            </div>

            <label className="block text-xs text-[#94B2A3] mb-1">یا عدد دلخواه را وارد کنید:</label>
            <input
              type="number"
              min={1}
              max={100000}
              value={target}
              onChange={(e) => setTarget(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full bg-[#091410] border border-[#1C352B] focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-center text-lg font-bold text-[#F3F7F4] outline-none tabular-nums-fa"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#94B2A3]">
              رفتار شمارنده پس از رسیدن به هدف:
            </label>

            <label
              onClick={() => setMode('notify-continue')}
              className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                mode === 'notify-continue'
                  ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#F3F7F4]'
                  : 'bg-[#091410]/60 border-[#1C352B] text-[#94B2A3]'
              }`}
            >
              <input
                type="radio"
                name="targetMode"
                checked={mode === 'notify-continue'}
                onChange={() => setMode('notify-continue')}
                className="mt-1 accent-[#D4AF37]"
              />
              <div>
                <div className="text-xs font-bold text-[#F3F7F4]">هشدار ویبره/صدا و ادامهٔ شمارش</div>
                <div className="text-[11px] text-[#94B2A3] mt-0.5">
                  وقتی به هدف رسیدید با ویبره و زنگ ملایم خبر می‌دهد و شمارش بدون توقف ادامه می‌یابد.
                </div>
              </div>
            </label>

            <label
              onClick={() => setMode('stop')}
              className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                mode === 'stop'
                  ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#F3F7F4]'
                  : 'bg-[#091410]/60 border-[#1C352B] text-[#94B2A3]'
              }`}
            >
              <input
                type="radio"
                name="targetMode"
                checked={mode === 'stop'}
                onChange={() => setMode('stop')}
                className="mt-1 accent-[#D4AF37]"
              />
              <div>
                <div className="text-xs font-bold text-[#F3F7F4]">توقف در پایان هدف</div>
                <div className="text-[11px] text-[#94B2A3] mt-0.5">
                  روی عدد هدف می‌ایستد تا متوجه پایان ختم شوید (مناسب تسبیحات حضرت زهرا).
                </div>
              </div>
            </label>

            <label
              onClick={() => setMode('loop')}
              className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                mode === 'loop'
                  ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#F3F7F4]'
                  : 'bg-[#091410]/60 border-[#1C352B] text-[#94B2A3]'
              }`}
            >
              <input
                type="radio"
                name="targetMode"
                checked={mode === 'loop'}
                onChange={() => setMode('loop')}
                className="mt-1 accent-[#D4AF37]"
              />
              <div>
                <div className="text-xs font-bold text-[#F3F7F4]">شمارش چرخشی (دور جدید خودکار)</div>
                <div className="text-[11px] text-[#94B2A3] mt-0.5">
                  پس از رسیدن به هدف، هشدار می‌دهد و شمارنده برای دور بعدی از ۱ شروع می‌شود.
                </div>
              </div>
            </label>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-[#091410] border border-[#1C352B] text-xs font-bold text-[#94B2A3] hover:text-[#F3F7F4]"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-[#D4AF37] text-[#091410] text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-[#D4AF37]/20 hover:bg-[#E6C987]"
            >
              <Check className="w-4 h-4" />
              ذخیره هدف
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
