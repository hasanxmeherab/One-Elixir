import { expenseDay } from './expenseRecords.js';

export const investmentHistory = investors => investors.flatMap(investor => (investor.transactions || []).map(transaction => ({
  ...transaction, amount: Number(transaction.amount) || 0, investorId: investor._id, investorName: investor.investorName,
}))).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
export const investmentType = amount => Number(amount) > 0 ? 'Contribution' : Number(amount) < 0 ? 'Withdrawal' : 'Account opened';
export const filterInvestments = (history, { search = '', investor = 'ALL', type = 'ALL', from = '', to = '' }) => history.filter(entry => {
  const query = search.trim().toLowerCase();
  const day = entry.date ? expenseDay(entry.date) : '';
  return (!query || `${entry.investorName} ${entry.note || ''}`.toLowerCase().includes(query))
    && (investor === 'ALL' || entry.investorId === investor) && (type === 'ALL' || investmentType(entry.amount) === type)
    && (!from || day >= from) && (!to || Boolean(day) && day <= to);
});
export const investmentSum = entries => Math.round(entries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0) * 100) / 100;
const csvCell = value => {
  let text = String(value ?? '');
  if (typeof value !== 'number' && (/^\s*[=+@-]/.test(text) || /^[\t\r\n]/.test(text))) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
};
export const investmentCsv = entries => '\uFEFF' + [
  ['Date', 'Investor', 'Type', 'Amount (TK)', 'Note'],
  ...entries.map(entry => [entry.date ? expenseDay(entry.date) : '', entry.investorName, investmentType(entry.amount), Number(entry.amount), entry.note || '']),
].map(row => row.map(csvCell).join(',')).join('\r\n');
