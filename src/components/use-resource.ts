'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client-api';
export function useResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef(0);
  const retry = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    setError('');
    try {
      const value = await api<T>(path);
      if (id === request.current) setData(value);
    } catch (e) {
      if (id === request.current) setError((e as Error).message);
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [path]);
  const invalidate = useCallback(() => {
    request.current++;
  }, []);
  useEffect(() => {
    void retry();
    return invalidate;
  }, [retry, invalidate]);
  return { data, loading, error, retry };
}
