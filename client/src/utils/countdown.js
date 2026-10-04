/**
 * Calculates countdown hours, minutes, and seconds until endsAt
 * @param {string|Date} endsAt
 * @param {Date} [now=new Date()]
 * @returns {{ h: string, m: string, s: string, formatted: string } | null}
 */
export const getCountdown = (endsAt, now = new Date()) => {
  if (!endsAt) return null;
  const diff = new Date(endsAt).getTime() - new Date(now).getTime();
  if (diff <= 0) return null;

  const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
  const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');

  return { h, m, s, formatted: `${h}:${m}:${s}` };
};
