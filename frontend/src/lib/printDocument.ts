function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Opens a print-friendly RTL HTML table in a new tab via a Blob URL — no server-rendered HTML,
 * no new Next.js route (this is a static-export site; a dynamically generated page can't be a
 * build-time route). The tab has its own "הדפס" button (hidden via @media print) instead of
 * auto-triggering window.print(), so the admin can review before printing.
 */
export function openPrintableTable(title: string, headers: string[], rows: (string | number)[][]) {
    const headHtml = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
    const rowsHtml = rows
        .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(String(c))}</td>`).join('')}</tr>`)
        .join('');
    const html = `<!doctype html>
<html dir="rtl" lang="he">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .meta { color: #666; font-size: 12px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: right; font-size: 13px; }
  th { background: #f0f0f0; }
  .print-btn { margin-bottom: 16px; padding: 8px 16px; font-size: 14px; cursor: pointer; }
  @media print { .print-btn { display: none; } }
</style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">הדפס</button>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">הופק בתאריך ${new Date().toLocaleString('he-IL')}</div>
  <table>
    <thead><tr>${headHtml}</tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/** Same client-side CSV-blob pattern already used in admin/orders/page.tsx and admin/leads/page.tsx. */
export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
    const csv = [headers, ...rows]
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
