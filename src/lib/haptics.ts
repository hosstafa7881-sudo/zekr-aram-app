import { isNativePlatform } from './native';

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

// Per-tap taps pass a tiny base pattern (e.g. 12ms) that, once scaled by the
// old flat 0.6/1/1.5 factors, produced durations (7-18ms) below what most
// phones' eccentric-rotating-mass vibration motors can actually spin up and
// render as a felt pulse (~15-20ms minimum in practice) — this is why the
// "vibration while counting" switch felt like it "did nothing" even when on,
// and why the light/medium/strong choice made no perceptible difference.
// Each intensity now gets its own realistic minimum floor for single-pulse
// (per-bead) taps specifically, so all three levels are both felt and
// distinguishable on real hardware.
const TAP_INTENSITY_PROFILE: Record<'light' | 'medium' | 'strong', { scale: number; min: number }> = {
  light: { scale: 1, min: 15 },
  medium: { scale: 1.6, min: 22 },
  strong: { scale: 2.4, min: 35 },
};

/**
 * دور هشتم / مورد ۲ — fires the motor.
 *
 * The bug this fixes: the app only ever called `navigator.vibrate`, which the
 * Android WebView does not implement, so vibration while counting did nothing
 * at all inside the APK — however carefully the three intensities had been
 * tuned. On native it now goes through @capacitor/haptics.
 *
 * The tuned numbers are deliberately UNCHANGED. @capacitor/haptics' vibrate()
 * maps straight onto VibrationEffect.createOneShot(duration, DEFAULT_AMPLITUDE),
 * so duration is what separates the three levels on real hardware — exactly
 * the property the floors below were measured against (قانون بخش ۲ SKILL.md:
 * a pulse has to be long enough for the motor to actually spin up, and the
 * three levels have to be tellable apart).
 */
type HapticsModule = typeof import('@capacitor/haptics');
let hapticsModule: HapticsModule | null = null;

/**
 * Loaded once, eagerly, so the FIRST tasbih tap does not pay for the import.
 * A bead tap has to feel instant; waiting on a module resolve would put a
 * visible gap between the tap and the pulse.
 */
function preloadHaptics() {
  if (!isNativePlatform() || hapticsModule) return;
  import('@capacitor/haptics')
    .then((mod) => {
      hapticsModule = mod;
    })
    .catch(() => {
      hapticsModule = null;
    });
}
preloadHaptics();

function fireNativePulse(durationMs: number) {
  // Fire-and-forget: a tasbih tap must never wait on a bridge round-trip.
  if (hapticsModule) {
    hapticsModule.Haptics.vibrate({ duration: durationMs }).catch(() => {});
    return;
  }
  import('@capacitor/haptics')
    .then((mod) => {
      hapticsModule = mod;
      return mod.Haptics.vibrate({ duration: durationMs });
    })
    .catch(() => {
      // Nothing to fall back to — the web API is absent here by definition.
    });
}

/** Plays a [on, off, on, …] pattern natively by sequencing the "on" pulses. */
function fireNativePattern(pattern: number[]) {
  let offset = 0;
  pattern.forEach((value, index) => {
    if (index % 2 === 0) {
      const at = offset;
      if (at === 0) fireNativePulse(value);
      else window.setTimeout(() => fireNativePulse(value), at);
    }
    offset += value;
  });
}

export function triggerVibration(
  pattern: number | number[],
  enabled = true,
  intensity: 'light' | 'medium' | 'strong' = 'medium'
) {
  if (!enabled) return;

  // Resolve the tuned duration(s) first, identically on both platforms, so the
  // feel of the three levels cannot drift apart between app and browser.
  let resolved: number | number[];
  if (typeof pattern === 'number') {
    const profile = TAP_INTENSITY_PROFILE[intensity];
    resolved = Math.max(profile.min, Math.round(pattern * profile.scale));
  } else {
    // Longer, fixed-feel milestone/celebration patterns (stage/target
    // reached) — these already use perceptible absolute durations and always
    // pass a hardcoded intensity, so they keep the original gentler scale
    // rather than the tap-specific floors above.
    const scale = intensity === 'light' ? 0.6 : intensity === 'strong' ? 1.5 : 1;
    resolved = pattern.map((v, i) => (i % 2 === 0 ? Math.max(10, Math.round(v * scale)) : v));
  }

  if (isNativePlatform()) {
    if (typeof resolved === 'number') fireNativePulse(resolved);
    else fireNativePattern(resolved);
    return;
  }

  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  try {
    // Some Android WebViews/Chrome versions silently drop a new vibrate()
    // call while a previous one from a rapid tap is still considered
    // "in flight" — cancelling first (vibrate(0)) before firing the next
    // pattern is the standard workaround so each tap reliably re-triggers
    // the motor even during fast, repeated tasbih taps.
    navigator.vibrate(0);
    navigator.vibrate(resolved);
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
