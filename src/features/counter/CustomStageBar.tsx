import React from 'react';
import { CustomDhikrStage } from '../../lib/seedData';
import { toPersianDigits } from '../../utils/persian';
import { getCustomStageDetail } from './customStageHelpers';
import { CheckCircle2 } from 'lucide-react';

interface CustomStageBarProps {
  stages: CustomDhikrStage[];
  totalCount: number;
}

export const CustomStageBar: React.FC<CustomStageBarProps> = ({ stages, totalCount }) => {
  const detail = getCustomStageDetail(stages, totalCount);

  let cumulative = 0;
  const rows = stages.map((stage, i) => {
    const stageStart = cumulative;
    cumulative += stage.target;
    return {
      ...stage,
      index: i,
      done: totalCount >= cumulative,
      current: totalCount >= stageStart && totalCount < cumulative,
      count: Math.max(0, Math.min(stage.target, totalCount - stageStart)),
    };
  });

  return (
    <div className="w-full bg-[var(--surface)]/90 border border-[var(--accent)]/30 rounded-2xl p-3 mb-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] text-xs font-bold">
            {toPersianDigits(detail.stageNumber)}
          </span>
          <span className="text-sm font-bold text-[var(--text)]">{detail.stageName}</span>
        </div>
        <div className="text-xs font-semibold text-[var(--accent)] tabular-nums-fa">
          {toPersianDigits(detail.stageCount)} از {toPersianDigits(detail.stageTarget)}
        </div>
      </div>

      <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
        {rows.map((st) => (
          <div
            key={st.id}
            className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
              st.done
                ? 'bg-[var(--success)]/15 border-[var(--success)]/40 text-[var(--success)]'
                : st.current
                ? 'bg-[var(--accent)]/15 border-[var(--accent)] text-[var(--text)] shadow-sm'
                : 'bg-[var(--bg)]/60 border-[var(--border)] text-[var(--muted)]/60'
            }`}
          >
            <div className="flex items-center gap-1 text-xs font-bold truncate max-w-full">
              {st.done && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[var(--success)]" />}
              <span className="truncate">{st.name}</span>
            </div>
            <div className="text-[11px] tabular-nums-fa mt-0.5 opacity-90">
              {toPersianDigits(st.count)} / {toPersianDigits(st.target)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
