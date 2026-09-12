import React, { useEffect, useState } from 'react';
import { Download, Share2, Loader2 } from 'lucide-react';
import { toPersianDigits } from '../../utils/persian';
import {
  STORY_TEXT_MAX_LENGTH,
  generateStoryImage,
  generateStoryPreviewDataUrl,
} from '../../lib/storyImage';
import { buildInviteLine, downloadImageFile, shareAppImage } from '../../lib/share';
import { useToast } from '../../components/ToastProvider';

/**
 * مورد ۱۹ — the custom-text box, the live preview, and the two buttons that
 * turn the preview into a real 1080×1920 PNG. Shown in BOTH states of the
 * ۱۰۰٪-code window (before and after activation), which is why it's its own
 * component.
 */
export const StoryImageComposer: React.FC = () => {
  const [text, setText] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | 'download' | 'share'>(null);
  const { showToast } = useToast();

  // Debounced preview so typing stays smooth — the preview is rendered at 30%
  // scale, the real file at full size only when a button is pressed.
  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(() => {
      generateStoryPreviewDataUrl(text)
        .then((url) => {
          if (!cancelled) setPreviewUrl(url);
        })
        .catch(() => {
          if (!cancelled) setPreviewUrl(null);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [text]);

  const handleDownload = async () => {
    setBusy('download');
    try {
      const blob = await generateStoryImage({ customText: text });
      downloadImageFile(blob, 'zekraram-story.png');
      showToast('تصویر روی گوشیت دانلود شد. می‌تونی از گالری استوریش کنی 🌿', {
        kind: 'success',
        durationMs: 5000,
      });
    } catch {
      showToast('متأسفانه تصویر ساخته نشد. یه‌بار دیگه امتحان کن 🌿', { kind: 'info' });
    } finally {
      setBusy(null);
    }
  };

  const handleShare = async () => {
    setBusy('share');
    try {
      const blob = await generateStoryImage({ customText: text });
      const caption = [text.trim(), buildInviteLine()].filter(Boolean).join('\n');
      await shareAppImage(blob, 'zekraram-story.png', caption, {
        onDownloadedInstead: () => showToast('تصویر در گوشی شما دانلود شد.', { kind: 'success' }),
        onFailed: () => showToast('اشتراک‌گذاری انجام نشد، دوباره امتحان کن 🌿', { kind: 'info' }),
      });
    } catch {
      showToast('متأسفانه تصویر ساخته نشد. یه‌بار دیگه امتحان کن 🌿', { kind: 'info' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="text-right space-y-2">
      <label className="block text-[11px] font-bold text-[var(--text)]">
        متن دلخواهت روی تصویر (اختیاری)
      </label>
      <textarea
        data-testid="story-custom-text"
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, STORY_TEXT_MAX_LENGTH))}
        maxLength={STORY_TEXT_MAX_LENGTH}
        rows={2}
        placeholder="مثلاً: من هر شب با این برنامه تسبیحات حضرت زهرا (س) می‌گم"
        className="w-full bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent)] rounded-2xl px-3 py-2.5 text-xs text-[var(--text)] outline-none leading-relaxed resize-none"
      />
      <div className="text-[10px] text-[var(--muted)] tabular-nums-fa">
        {toPersianDigits(text.length)} / {toPersianDigits(STORY_TEXT_MAX_LENGTH)}
      </div>

      {previewUrl && (
        <img
          data-testid="story-preview"
          src={previewUrl}
          alt="پیش‌نمایش تصویر آماده"
          className="mx-auto w-28 rounded-xl border border-[var(--border)] shadow-sm"
        />
      )}

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          data-testid="story-download-button"
          disabled={busy !== null}
          onClick={handleDownload}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-[var(--bg)] border border-[var(--accent)]/40 text-[var(--text)] text-[11px] font-bold disabled:opacity-60 transition-all"
        >
          {busy === 'download' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
          )}
          دانلود تصویر آماده
        </button>
        <button
          type="button"
          data-testid="story-share-button"
          disabled={busy !== null}
          onClick={handleShare}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white text-[11px] font-bold disabled:opacity-60 shadow-md transition-all"
        >
          {busy === 'share' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Share2 className="w-3.5 h-3.5" />
          )}
          اشتراک‌گذاری مستقیم
        </button>
      </div>
    </div>
  );
};
