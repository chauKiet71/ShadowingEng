import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ShadowingClient,
  type ShadowingResult,
  type ShadowingStatus,
} from '../lib/shadowing';

export function useShadowing() {
  const clientRef = useRef<ShadowingClient | null>(null);
  const [status, setStatus] = useState<ShadowingStatus>('idle');
  const [result, setResult] = useState<ShadowingResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    clientRef.current = new ShadowingClient();
    return () => {
      clientRef.current?.disconnect();
    };
  }, []);

  const toggleRecording = useCallback(async (expectedText: string) => {
    const client = clientRef.current;
    if (!client) return;

    setError('');

    if (status === 'recording') {
      try {
        setStatus('processing');
        const scored = await client.stopRecording();
        setResult(scored);
        setStatus('done');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể chấm điểm');
        setStatus('error');
      }
      return;
    }

    try {
      setResult(null);
      setStatus('connecting');
      await client.startRecording(expectedText);
      setStatus('recording');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể bắt đầu ghi âm');
      setStatus('error');
      client.cancelRecording();
    }
  }, [status]);

  const reset = useCallback(() => {
    setResult(null);
    setError('');
    setStatus('idle');
  }, []);

  return {
    status,
    result,
    error,
    isRecording: status === 'recording',
    isProcessing: status === 'processing',
    isFetching: status === 'connecting' || status === 'processing',
    toggleRecording,
    reset,
  };
}
