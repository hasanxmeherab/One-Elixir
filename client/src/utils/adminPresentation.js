export const panel = 'rounded-xl border border-[#e7e7e5] bg-white p-5 sm:p-6';
export const field = 'w-full min-w-0 rounded-lg border border-[#dededb] bg-white px-3 py-2.5 text-sm text-[#333] outline-none focus:border-[#dc4939] focus:ring-2 focus:ring-[#dc4939]/10';
export const button = 'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#dededb] bg-white px-3.5 py-2.5 text-xs font-medium text-[#555] hover:bg-[#f5f5f3] disabled:cursor-not-allowed disabled:opacity-50';
export const primary = `${button} border-[#252525]! bg-[#252525]! text-white! hover:bg-[#444]!`;
export const money = value => `${Number(value || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 })} TK`;

