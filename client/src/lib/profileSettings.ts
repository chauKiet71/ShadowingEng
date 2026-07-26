const SETTINGS_KEY = 'shadowing_profile_settings';

export type ProfileSettings = {
  dailyReminder: boolean;
  soundEffects: boolean;
};

export const DEFAULT_PROFILE_SETTINGS: ProfileSettings = {
  dailyReminder: true,
  soundEffects: true,
};

export function loadProfileSettings(): ProfileSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_PROFILE_SETTINGS };
    return {
      ...DEFAULT_PROFILE_SETTINGS,
      ...(JSON.parse(raw) as Partial<ProfileSettings>),
    };
  } catch {
    return { ...DEFAULT_PROFILE_SETTINGS };
  }
}

export function saveProfileSettings(settings: ProfileSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function isSoundEffectsEnabled() {
  return loadProfileSettings().soundEffects !== false;
}

let sharedCtx: AudioContext | null = null;

function getAudioContext() {
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new AudioCtx();
  }
  return sharedCtx;
}

function playTone({
  frequency,
  durationSec,
  type = 'sine',
  volume = 0.08,
  delaySec = 0,
}: {
  frequency: number;
  durationSec: number;
  type?: OscillatorType;
  volume?: number;
  delaySec?: number;
}) {
  const ctx = getAudioContext();
  if (!ctx) return;

  void ctx.resume().catch(() => undefined);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  osc.connect(gain);
  gain.connect(ctx.destination);

  const start = ctx.currentTime + delaySec;
  const end = start + durationSec;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.start(start);
  osc.stop(end + 0.01);
}

/** Short UI feedback when the user answers correctly / incorrectly. */
export function playAnswerFeedback(correct: boolean) {
  if (!isSoundEffectsEnabled()) return;

  try {
    if (correct) {
      playTone({ frequency: 587.33, durationSec: 0.1, volume: 0.07 });
      playTone({
        frequency: 880,
        durationSec: 0.16,
        volume: 0.08,
        delaySec: 0.09,
      });
      return;
    }

    playTone({
      frequency: 220,
      durationSec: 0.18,
      type: 'triangle',
      volume: 0.06,
    });
    playTone({
      frequency: 165,
      durationSec: 0.22,
      type: 'triangle',
      volume: 0.05,
      delaySec: 0.08,
    });
  } catch {
    // Ignore autoplay / AudioContext errors
  }
}
