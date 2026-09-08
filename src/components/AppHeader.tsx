import React from 'react';
import { getShamsiDateInfo } from '../utils/persian';
import { ShieldCheck, MoonStar } from 'lucide-react';

export const AppHeader: React.FC = () => {
  const shamsi = getShamsiDateInfo();

  return (
    <header className="w-full bg-[#091410]/95 backdrop-blur-md border-b border-[#1C352B] px-4 py-2.5 sticky top-0 z-30">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        {/* Identity */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#9A7821] flex items-center justify-center text-[#091410] shadow-md">
            <MoonStar className="w-5 h-5 fill-[#091410]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-black text-[#F3F7F4] tracking-tight">
                ذکرآرام
              </h1>
              <span className="text-[10px] font-bold bg-[#D4AF37]/15 text-[#D4AF37] px-1.5 py-0.5 rounded-md border border-[#D4AF37]/30">
                بدون تبلیغ
              </span>
            </div>
            <div className="text-[11px] text-[#94B2A3] font-medium">
              {shamsi.formattedFull}
            </div>
          </div>
        </div>

        {/* Offline Guarantee Pill */}
        <div className="flex items-center gap-1 bg-[#11221B] border border-[#1C352B] text-[#94B2A3] text-[11px] px-2.5 py-1 rounded-xl">
          <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
          <span>ذخیره خودکار</span>
        </div>
      </div>
    </header>
  );
};
