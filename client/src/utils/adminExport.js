export function csvText(headers, rows) {
  const cell = value => {
    let text = String(value ?? '');
    if (typeof value !== 'number' && /^[\s]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return [headers, ...rows].map(row => row.map(cell).join(',')).join('\r\n');
}
export function downloadCsv(filename, headers, rows) {
  const url = URL.createObjectURL(new Blob(['\uFEFF', csvText(headers, rows)], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
