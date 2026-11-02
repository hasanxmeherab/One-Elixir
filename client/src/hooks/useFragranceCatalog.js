import { useEffect, useState } from 'react';
import axios from 'axios';

export function useFragranceCatalog() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/perfumes`, { signal: controller.signal })
      .then(response => { setProducts(response.data); setStatus('ready'); })
      .catch(() => { if (!controller.signal.aborted) setStatus('error'); });
    return () => controller.abort();
  }, [attempt]);
  return { products, status, retry: () => { setStatus('loading'); setAttempt(n => n + 1); } };
}
