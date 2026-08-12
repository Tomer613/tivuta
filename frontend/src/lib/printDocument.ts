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

let heeboFontBase64Promise: Promise<string> | null = null;

function loadHeeboFontBase64(): Promise<string> {
    if (!heeboFontBase64Promise) {
        heeboFontBase64Promise = fetch('/fonts/Heebo-Regular.ttf')
            .then((res) => res.arrayBuffer())
            .then((buffer) => {
                const bytes = new Uint8Array(buffer);
                let binary = '';
                for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
                return btoa(binary);
            });
    }
    return heeboFontBase64Promise;
}

/**
 * One-click direct PDF download (no browser print dialog) — jsPDF + jspdf-autotable, dynamically
 * imported so the library only loads into the bundle when an admin actually uses this, matching
 * lib/sentry.ts's lazy-load pattern. Embeds the same self-hosted Heebo font already used
 * site-wide (see the Haredi Internet Filter Compatibility font-hosting principle) since jsPDF's
 * built-in fonts have no Hebrew glyphs.
 *
 * RTL handling note (found only by actually rendering and rasterizing output and looking at it —
 * PDF text extraction order doesn't reliably reflect visual rendering for RTL content, and this
 * went through several wrong theories before landing here): under `doc.setR2L(true)`, both direct
 * `doc.text()` calls AND `jspdf-autotable`'s per-cell rendering reverse a string — but only when
 * that string has NO Hebrew characters in it at all. A cell/line that *mixes* Hebrew with Latin
 * (e.g. a product name like "טבעת PDF בדיקה") comes out correct with no help needed — some
 * internal run-aware handling kicks in once it detects Hebrew. A string that's PURELY Latin/digit
 * (an order number "ORD-000005", a phone number, a multi-digit quantity) gets no such handling and
 * is reversed character-by-character as one blob ("ORD-000005" → "500000-DRO", confirmed via a
 * rasterized screenshot showing exactly that). Two independent fixes follow from this, both
 * exploiting the same fact — reversing an already-reversed pure-Latin string cancels out:
 * - `fixRtlCell()` pre-reverses any table cell whose content contains no Hebrew character, before
 *   handing it to `autoTable` — its own reversal then lands it back in correct reading order.
 * - `drawLabelledLine()`'s direct `doc.text()` calls sidestep the same problem differently: it
 *   flips `setR2L(false)` off just long enough to draw the pure-Latin/digit "value" half of a
 *   line (e.g. a batch number), so that call is never reversed in the first place.
 */
const HEBREW_RE = /[֐-׿]/;

function fixRtlCell(value: string | number): string | number {
    const str = String(value);
    return HEBREW_RE.test(str) ? value : str.split('').reverse().join('');
}
export async function exportPdf(title: string, filename: string, headers: string[], rows: (string | number)[][]) {
    const [{ jsPDF }, { autoTable }, fontBase64] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
        loadHeeboFontBase64(),
    ]);

    const doc = new jsPDF();
    doc.addFileToVFS('Heebo-Regular.ttf', fontBase64);
    doc.addFont('Heebo-Regular.ttf', 'Heebo', 'normal');
    doc.setFont('Heebo');
    doc.setR2L(true);

    // Column order reversed to match RTL reading order — jspdf-autotable lays columns out
    // left-to-right positionally and has no RTL table option of its own. Cell content is also
    // run through fixRtlCell (see the note above) to counteract autoTable's own reversal of any
    // pure-Latin/digit cell.
    const rtlHeaders = [...headers].reverse().map(fixRtlCell);
    const rtlRows = rows.map((row) => [...row].reverse().map(fixRtlCell));

    // fontStyle forced to 'normal' everywhere — only the 'normal' Heebo weight is registered
    // above; jspdf-autotable's own default headStyles.fontStyle is 'bold', which silently falls
    // back to a built-in font with no Hebrew glyphs (renders as garbage, not just wrong order)
    // since no bold Heebo variant was ever embedded.
    const textStyles = { font: 'Heebo', fontStyle: 'normal' as const, halign: 'right' as const };
    const rightMargin = doc.internal.pageSize.getWidth() - 14;

    // Draws a Hebrew label (reversed correctly by the document's own setR2L) right-aligned at the
    // margin, plus an optional pure-Latin/digit value immediately to its left with setR2L
    // temporarily off (so it isn't wrongly reversed too) — position computed from the label's
    // actual rendered width via jsPDF's own getTextWidth, not a fixed guess.
    function drawLabelledLine(label: string, value: string, y: number) {
        doc.text(label, rightMargin, y, { align: 'right' });
        if (!value) return;
        const valueX = rightMargin - doc.getTextWidth(label) - 4;
        doc.setR2L(false);
        doc.text(value, valueX, y, { align: 'right' });
        doc.setR2L(true);
    }

    const titleMatch = title.match(/^(.*) — (.*)$/);
    doc.setFontSize(14);
    drawLabelledLine(titleMatch ? titleMatch[1] : title, titleMatch ? titleMatch[2] : '', 15);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    drawLabelledLine('הופק בתאריך', new Date().toLocaleString('he-IL'), 21);
    doc.setTextColor(0, 0, 0);

    autoTable(doc, {
        head: [rtlHeaders],
        body: rtlRows,
        startY: 26,
        styles: textStyles,
        headStyles: { ...textStyles, fillColor: [17, 26, 47] },
    });

    doc.save(filename);
}
