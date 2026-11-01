export const expenseDay = (value = new Date()) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = type => parts.find(value => value.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
};
export const expenseAmount = (quantity, unitPrice) => Math.round(Number(quantity) * Number(unitPrice) * 100) / 100;
export const filterExpenses = (expenses, { search = '', category = 'ALL', from = '', to = '' }) => expenses.filter(expense => {
  const day = expenseDay(expense.date);
  return String(expense.title || '').toLowerCase().includes(search.trim().toLowerCase())
    && (category === 'ALL' || expense.category === category) && (!from || day >= from) && (!to || day <= to);
}).sort((a, b) => new Date(b.date) - new Date(a.date));
export const sumExpenses = expenses => Math.round(expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0) * 100) / 100;
const csvCell = value => {
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
};
export const expensesCsv = expenses => '\uFEFF' + [
  ['Date', 'Description', 'Category', 'Quantity', 'Unit', 'Unit price (TK)', 'Amount (TK)'],
  ...expenses.map(expense => [expenseDay(expense.date), expense.title, expense.category, expense.quantity, expense.quantity ? expense.unit : '', expense.unitPrice, expense.amount]),
].map(row => row.map(csvCell).join(',')).join('\r\n');
