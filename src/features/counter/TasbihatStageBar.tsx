import React from 'react';
import { toPersianDigits } from '../../utils/persian';
import { CheckCircle2 } from 'lucide-react';

interface TasbihatStageBarProps {
  totalCount: number; // 0 to 100
}

export interface TasbihatStageDetail {
  stageNumber: 1 | 2 | 3;
  arabicTitle: string;
  persianTitle: string;
  stageCount: number;
  stageTarget: number;
  isComplete: boolean;
}

export function getTasbihatStageDetail(totalCount: number): TasbihatStageDetail {
  if (totalCount < 34) {
    return {
      stageNumber: 1,
      arabicTitle: 'اللَّهُ أَكْبَرُ',
      persianTitle: 'مرحله اول: الله اکبر',
      stageCount: totalCount,
      stageTarget: 34,
      isComplete: false,
    };
  } else if (totalCount < 67) {
    return {
      stageNumber: 2,
      arabicTitle: 'الْحَمْدُ لِلَّهِ',
      persianTitle: 'مرحله دوم: الحمدلله',
      stageCount: totalCount - 34,
      stageTarget: 33,
      isComplete: false,
    };
  } else {
    const subCount = Math.min(33, totalCount - 67);
    return {
      stageNumber: 3,
      arabicTitle: 'سُبْحَانَ اللَّهِ',
      persianTitle: 'مرحله سوم: سبحان‌الله',
      stageCount: subCount,
      stageTarget: 33,
      isComplete: totalCount >= 100,
    };
  }
}

export const TasbihatStageBar: React.FC<TasbihatStageBarProps> = ({ totalCount }) => {
  const detail = getTasbihatStageDetail(totalCount);

  const stages = [
    {
      num: 1,
      label: 'اللَّهُ أَكْبَرُ',
      sub: '۳۴ مرتبه',
      done: totalCount >= 34,
      current: totalCount < 34,
      count: Math.min(34, totalCount),
      max: 34,
    },
    {
      num: 2,
      label: 'الْحَمْدُ لِلَّهِ',
      sub: '۳۳ مرتبه',
      done: totalCount >= 67,
      current: totalCount >= 34 && totalCount < 67,
      count: Math.max(0, Math.min(33, totalCount - 34)),
      max: 33,
    },
    {
      num: 3,
      label: 'سُبْحَانَ اللَّهِ',
      sub: '۳۳ مرتبه',
      done: totalCount >= 100,
      current: totalCount >= 67,
      count: Math.max(0, Math.min(33, totalCount - 67)),
      max: 33,
    },
  ];

  return (
    <div className="w-full bg-[#11221B]/90 border border-[#D4AF37]/30 rounded-2xl p-3 mb-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold">
            {toPersianDigits(detail.stageNumber)}
          </span>
          <span className="text-sm font-bold text-[#F3F7F4]">{detail.persianTitle}</span>
        </div>
        <div className="text-xs font-semibold text-[#D4AF37] tabular-nums-fa">
          {toPersianDigits(detail.stageCount)} از {toPersianDigits(detail.stageTarget)}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {stages.map((st) => (
          <div
            key={st.num}
            className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
              st.done
                ? 'bg-[#10B981]/15 border-[#10B981]/40 text-[#10B981]'
                : st.current
                ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#F3F7F4] shadow-sm'
                : 'bg-[#091410]/60 border-[#1C352B] text-[#94B2A3]/60'
            }`}
          >
            <div className="flex items-center gap-1 text-xs font-bold">
              {st.done && <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />}
              <span>{st.label}</span>
            </div>
            <div className="text-[11px] tabular-nums-fa mt-0.5 opacity-90">
              {toPersianDigits(st.count)} / {toPersianDigits(st.max)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
