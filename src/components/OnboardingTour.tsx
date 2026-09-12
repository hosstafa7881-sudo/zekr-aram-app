import React, { useEffect, useState } from 'react';
// دور ششم / مورد ۱۰ — Bell / HeartHandshake / Share2 are imported from the very
// same lucide-react module the home page's three action buttons use, so the
// shapes in the tour and the shapes on the screen can never differ again. The
// tour used 🔔 / ❤️ / 🔗 emoji before, and 🔗 (a chain link) looks nothing like
// the real Share2 icon.
import { ArrowLeft, X, Bell, HeartHandshake, Share2 } from 'lucide-react';
import { toPersianDigits } from '../utils/persian';

interface TourStep {
  selector: string;
  title: string;
  /**
   * One paragraph, several lines shown one under the other, or — for the
   * icon-legend step — lines that carry the app's real icons (مورد ۱۰).
   */
  description: string | string[] | { icon: React.ReactNode; text: string }[];
}

/** True for the icon-legend form of `description`. */
function isIconLines(
  d: TourStep['description']
): d is { icon: React.ReactNode; text: string }[] {
  return Array.isArray(d) && d.length > 0 && typeof d[0] === 'object';
}

/**
 * مورد ۲۲ — six steps. The discount buttons are deliberately NOT introduced
 * here: showing them at first launch would make the app feel paid.
 */
const STEPS: TourStep[] = [
  {
    selector: '[data-tour="home-start-button"]',
    title: 'شروع سریع ذکر',
    description: 'از همین‌جا می‌توانید ذکر امروزتان را شروع یا ادامه دهید و مجموع ذکرهای امروز را ببینید.',
  },
  {
    // One highlight covering all three home icons at once.
    selector: '[data-tour="home-actions"]',
    title: 'اعلانات، حمایت و معرفی',
    // مورد ۱۰ — the exact same icon components AND the exact same colors as
    // the three buttons in [data-tour="home-actions"] on the home page.
    description: [
      {
        icon: <Bell className="w-4 h-4 text-[var(--icon-bell)]" />,
        text: 'زنگوله: یادآوری روزانه و مناسبت‌ها',
      },
      {
        icon: <HeartHandshake className="w-4 h-4 text-[var(--icon-heart)]" />,
        text: 'قلب: حمایت از ما با ثبت نظر در فروشگاه',
      },
      {
        icon: <Share2 className="w-4 h-4 text-[var(--accent)]" />,
        text: 'اشتراک‌گذاری: معرفی برنامه به دوستان',
      },
    ],
  },
  {
    selector: '[data-tour="home-library"]',
    title: 'کتابخانهٔ ذکر',
    description: 'ذکر مورد نظرتان را از اینجا انتخاب کنید یا ذکر دلخواه خودتان را بسازید.',
  },
  {
    selector: '[data-tour="nav-notebook"]',
    title: 'دفترچهٔ کارهای خوب',
    description: 'کارهای خوب روزانه‌تان را اینجا ثبت کنید.',
  },
  {
    selector: '[data-tour="nav-history"]',
    title: 'تاریخچه و پشتیبان‌گیری',
    description: 'آمار روزهای گذشته و پشتیبان‌گیری از اطلاعاتتان اینجاست.',
  },
  {
    selector: '[data-tour="nav-settings"]',
    title: 'تنظیمات',
    description: 'ظاهر برنامه، صدا، ویبره و سایر تنظیمات را از اینجا شخصی‌سازی کنید.',
  },
];

interface OnboardingTourProps {
  isActive: boolean;
  onFinish: () => void;
}

/**
 * CSS-only spotlight tour (box-shadow "hole", no canvas/clip-path). A
 * previous native build of this app used a clip-path/canvas mask for the
 * same effect and rendered a blank white square on some Android GPUs
 * (e.g. Xiaomi) — this technique avoids that failure mode.
 */
export const OnboardingTour: React.FC<OnboardingTourProps> = ({ isActive, onFinish }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const step = STEPS[stepIndex];

  useEffect(() => {
    if (!isActive) return;
    // Clear immediately so a step transition never shows the *previous*
    // step's rectangle paired with the *new* step's tooltip for a frame.
    setRect(null);
    let raf: number;
    const measure = () => {
      const el = document.querySelector(step.selector);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    raf = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
  }, [isActive, stepIndex, step?.selector]);

  if (!isActive) return null;

  const isLastStep = stepIndex === STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onFinish();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const tooltipTop = rect
    ? rect.top > window.innerHeight / 2
      ? Math.max(16, rect.top - 150)
      : Math.min(window.innerHeight - 180, rect.bottom + 16)
    : window.innerHeight / 2 - 80;

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-label="راهنمای شروع کار">
      {rect ? (
        <div
          className="onboarding-spotlight absolute pointer-events-none transition-all duration-300"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/72" />
      )}

      <div
        className="absolute z-10 right-4 left-4 max-w-sm mx-auto bg-[var(--surface)] border border-[var(--accent)]/40 rounded-2xl p-4 shadow-2xl"
        style={{ top: tooltipTop }}
      >
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h4 className="text-sm font-bold text-[var(--text)]">{step.title}</h4>
          <button
            type="button"
            onClick={onFinish}
            className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--text)]"
            aria-label="بستن راهنما"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {isIconLines(step.description) ? (
          <div
            data-testid="tour-icon-lines"
            className="text-xs text-[var(--muted)] leading-relaxed mb-3 space-y-1.5"
          >
            {step.description.map((line) => (
              <p key={line.text} className="flex items-center gap-2">
                <span className="shrink-0">{line.icon}</span>
                <span>{line.text}</span>
              </p>
            ))}
          </div>
        ) : Array.isArray(step.description) ? (
          <div className="text-xs text-[var(--muted)] leading-relaxed mb-3 space-y-1">
            {step.description.map((line) => (
              <p key={line as string}>{line as string}</p>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[var(--muted)] leading-relaxed mb-3">{step.description}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[var(--muted)] tabular-nums-fa">
            {toPersianDigits(stepIndex + 1)} / {toPersianDigits(STEPS.length)}
          </span>
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white text-xs font-bold px-3.5 py-1.5 rounded-xl"
          >
            {isLastStep ? 'پایان' : 'بعدی'}
            {!isLastStep && <ArrowLeft className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
