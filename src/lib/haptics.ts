let audioCtx: AudioContext | null = null;
let wakeLockSentinel: any = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function triggerVibration(
  pattern: number | number[],
  enabled = true,
  intensity: 'light' | 'medium' | 'strong' = 'medium'
) {
  if (!enabled || typeof navigator === 'undefined' || !navigator.vibrate) return;

  try {
    const scale = intensity === 'light' ? 0.6 : intensity === 'strong' ? 1.5 : 1;
    if (typeof pattern === 'number') {
      navigator.vibrate(Math.max(8, Math.round(pattern * scale)));
    } else {
      navigator.vibrate(pattern.map((v, i) => (i % 2 === 0 ? Math.max(10, Math.round(v * scale)) : v)));
    }
  } catch {
    // Ignore on unsupported browsers
  }
}

/**
 * Synthesizes a subtle, warm wooden/stone tasbih bead click sound using Web Audio API.
 * 100% offline, zero external audio file requests.
 */
export function playTasbihBeadClick(enabled = true) {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Wooden bead resonance frequency envelope
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.032);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.038);
  } catch {
    // Ignore audio errors
  }
}

/**
 * Synthesizes a serene, gentle sanctuary bell chime when a target or Tasbihat stage completes.
 */
export function playTargetReachedChime(enabled = true) {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const freqs = [528, 660]; // Solfeggio serene harmonic chord

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.14, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + idx * 0.08 + 0.65);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.7);
    });
  } catch {
    // Ignore
  }
}

export async function setScreenWakeLock(enabled: boolean): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
    return false;
  }

  try {
    if (enabled) {
      if (!wakeLockSentinel) {
        wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        wakeLockSentinel.addEventListener('release', () => {
          wakeLockSentinel = null;
        });
      }
      return true;
    } else {
      if (wakeLockSentinel) {
        await wakeLockSentinel.release();
        wakeLockSentinel = null;
      }
      return false;
    }
  } catch {
    return false;
  }
}
