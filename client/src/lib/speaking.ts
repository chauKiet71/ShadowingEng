export type SpeakingRecorderStatus =
  'idle' | 'recording' | 'stopping' | 'error';

const MAX_DURATION_MS = 60_000;
let activeSpeakingAudio: HTMLAudioElement | null = null;

export class SpeakingRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;
  private maxTimer: number | null = null;
  private onAutoStop: (() => void) | null = null;

  async start(onAutoStop?: () => void): Promise<void> {
    this.cancel();
    this.onAutoStop = onAutoStop ?? null;
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    this.chunks = [];
    this.startedAt = Date.now();

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType });
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };
    this.mediaRecorder.start(200);

    this.maxTimer = window.setTimeout(() => {
      this.onAutoStop?.();
    }, MAX_DURATION_MS);
  }

  async stop(): Promise<{ blob: Blob; durationMs: number }> {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      throw new Error('Không có bản ghi âm');
    }

    if (this.maxTimer != null) {
      window.clearTimeout(this.maxTimer);
      this.maxTimer = null;
    }

    const recorder = this.mediaRecorder;
    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        resolve(
          new Blob(this.chunks, { type: recorder.mimeType || 'audio/webm' }),
        );
      };
      recorder.stop();
    });

    const durationMs = Date.now() - this.startedAt;
    this.cleanupStream();
    this.mediaRecorder = null;
    this.chunks = [];
    return { blob, durationMs };
  }

  cancel() {
    if (this.maxTimer != null) {
      window.clearTimeout(this.maxTimer);
      this.maxTimer = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }
    this.cleanupStream();
    this.mediaRecorder = null;
    this.chunks = [];
  }

  private cleanupStream() {
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.mediaStream = null;
  }
}

export function speakEnglish(text: string) {
  stopSpeakingAudio();
  if (!('speechSynthesis' in window) || !text.trim()) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeakingAudio() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  if (activeSpeakingAudio) {
    activeSpeakingAudio.pause();
    activeSpeakingAudio.currentTime = 0;
    activeSpeakingAudio = null;
  }
}

export async function playSpeakingAudio(url: string, fallbackText = '') {
  stopSpeakingAudio();
  const audio = new Audio(url);
  activeSpeakingAudio = audio;
  const release = () => {
    if (activeSpeakingAudio === audio) activeSpeakingAudio = null;
  };
  audio.addEventListener('ended', release, { once: true });
  audio.addEventListener('error', release, { once: true });

  try {
    await audio.play();
  } catch {
    release();
    if (fallbackText) speakEnglish(fallbackText);
  }
}
