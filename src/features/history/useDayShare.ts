import { useState } from 'react';
import { useToast } from '../../components/ToastProvider';
import { shareAppText } from '../../lib/share';
import {
  DayShareData,
  DayShareVariant,
  buildDayShareText,
  getAvailableDayShareOptions,
} from '../../lib/dayShareText';

/**
 * مورد ۱۵ — one shared entry point for "the user tapped a day's share icon".
 * When only one kind of content exists, it shares straight away instead of
 * showing a one-option picker; otherwise it opens the picker popup. Both the
 * ۳۰-day cards / جزئیات بیشتر (variant 'full') and the calendar summary modal
 * (variant 'summary') go through this, so the behaviour can't drift.
 */
export function useDayShare(data: DayShareData, variant: DayShareVariant) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showToast } = useToast();
  const options = getAvailableDayShareOptions(data);

  const start = () => {
    if (options.length <= 1) {
      shareAppText(buildDayShareText(options[0] || 'dhikr', variant, data), {
        onCopiedToClipboard: () =>
          showToast('متن اشتراک‌گذاری در حافظهٔ موقت کپی شد.', { kind: 'success' }),
      });
      return;
    }
    setIsModalOpen(true);
  };

  return {
    start,
    options,
    isModalOpen,
    closeModal: () => setIsModalOpen(false),
  };
}
