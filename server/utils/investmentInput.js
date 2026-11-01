const escapeRegex = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
module.exports = function investmentInput(body) {
  const investorName = String(body.investorName || '').trim();
  if (!investorName) throw new Error('Enter an investor name.');
  const amount = Math.round(Number(body.amount) * 100) / 100;
  if (!Number.isFinite(amount)) throw new Error('Enter a valid amount.');
  if (Number(body.amount) !== 0 && amount === 0) throw new Error('The minimum transaction amount is 0.01 TK.');
  const date = body.date === undefined ? new Date() : new Date(body.date);
  if (Number.isNaN(date.getTime())) throw new Error('Enter a valid transaction date.');
  return { investorName, amount, date, note: String(body.note || '').trim() || (amount < 0 ? 'Capital withdrawal' : 'Capital contribution'), namePattern: new RegExp(`^${escapeRegex(investorName)}$`, 'i') };
};
