export interface ScoredWord {
  word: string;
  correct: boolean;
}

export interface ShadowingResult {
  transcript: string;
  words: ScoredWord[];
  score: number;
}

export type ShadowingStatus =
  | 'idle'
  | 'connecting'
  | 'recording'
  | 'processing'
  | 'done'
  | 'error';

function getShadowingWsUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/api/shadowing`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const value = reader.result as string;
      const base64 = value.split(',')[1] ?? '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export class ShadowingClient {
  private ws: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private expectedText = '';

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(getShadowingWsUrl());
      const timeout = window.setTimeout(() => {
        reject(new Error('Không thể kết nối máy chủ Shadowing'));
        ws.close();
      }, 8000);

      ws.onopen = () => {
        window.clearTimeout(timeout);
        this.ws = ws;
        resolve();
      };

      ws.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error('Không thể kết nối máy chủ Shadowing'));
      };
    });
  }

  private waitForMessage(
    types: string[],
    timeoutMs = 30000,
  ): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('WebSocket chưa kết nối'));
        return;
      }

      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error('Hết thời gian chờ phản hồi từ server'));
      }, timeoutMs);

      const handler = (event: MessageEvent) => {
        try {
          const data = JSON.parse(String(event.data)) as Record<string, unknown>;
          if (types.includes(String(data.type))) {
            cleanup();
            if (data.type === 'error') {
              reject(new Error(String(data.message ?? 'Lỗi Shadowing')));
              return;
            }
            resolve(data);
          }
        } catch {
          cleanup();
          reject(new Error('Phản hồi server không hợp lệ'));
        }
      };

      const cleanup = () => {
        window.clearTimeout(timeout);
        this.ws?.removeEventListener('message', handler);
      };

      this.ws.addEventListener('message', handler);
    });
  }

  async startRecording(expectedText: string): Promise<void> {
    this.expectedText = expectedText;
    await this.connect();

    this.ws?.send(JSON.stringify({ type: 'start', expectedText }));

    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.chunks = [];

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType });
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };
    this.mediaRecorder.start(250);
  }

  async stopRecording(): Promise<ShadowingResult> {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      throw new Error('Không có bản ghi âm');
    }

    const recorder = this.mediaRecorder;
    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(this.chunks, { type: recorder.mimeType || 'audio/webm' }));
      };
      recorder.stop();
    });

    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.chunks = [];

    await this.connect();
    const audio = await blobToBase64(blob);
    this.ws?.send(
      JSON.stringify({
        type: 'stop',
        expectedText: this.expectedText,
        audio,
      }),
    );

    const response = await this.waitForMessage(['result'], 60000);
    return {
      transcript: String(response.transcript ?? ''),
      words: (response.words as ScoredWord[]) ?? [],
      score: Number(response.score ?? 0),
    };
  }

  cancelRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.chunks = [];
  }

  disconnect() {
    this.cancelRecording();
    this.ws?.close();
    this.ws = null;
  }
}
