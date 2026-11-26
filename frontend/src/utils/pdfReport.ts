/**
 * Minimal pure-TypeScript PDF 1.4 generator (no external dependencies).
 * Produces a valid single-page PDF with Helvetica text lines.
 */
function escapePdfText(text: string): string {
  return text
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

export interface PdfReportInput {
  region: string;
  fromYear: number;
  toYear: number;
  headline: string;
  rows: Array<{
    name: string;
    fromKm2: number;
    toKm2: number;
    deltaKm2: number;
    deltaPp: number;
    pctChange: number | null;
  }>;
  totals: {
    fromKm2: number;
    toKm2: number;
    deltaKm2: number;
    deltaPp: number;
  };
}

export function buildPdfReportBlob(input: PdfReportInput): Blob {
  const ops: string[] = [];
  let y = 760;

  const drawLine = (text: string, size: number, bold = false, step = 16) => {
    const font = bold ? '/F2' : '/F1';
    ops.push(`BT ${font} ${size} Tf 48 ${y} Td (${escapePdfText(text)}) Tj ET`);
    y -= step;
  };

  drawLine('GeoSat Intelligence - Land Cover Change Report', 15, true, 22);
  drawLine(`Region: ${input.region}   |   Period: ${input.fromYear} to ${input.toYear}`, 11, false, 18);
  drawLine(`Generated: ${new Date().toISOString().slice(0, 10)}   |   Source: GeoSat Land Cover`, 9, false, 22);

  // Wrap headline at ~85 chars
  const words = input.headline.split(' ');
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > 85) {
      drawLine(line.trim(), 10, false, 14);
      line = w;
    } else {
      line = (line + ' ' + w).trim();
    }
  }
  if (line) drawLine(line, 10, false, 22);

  drawLine(
    `${'Class'.padEnd(22)} ${'From(km2)'.padStart(10)} ${'To(km2)'.padStart(10)} ${'d(km2)'.padStart(10)} ${'d(pp)'.padStart(9)} ${'%chg'.padStart(8)}`,
    9,
    true,
    16
  );
  drawLine('-'.repeat(78), 9, false, 14);

  for (const r of input.rows) {
    const rowStr =
      `${r.name.slice(0, 21).padEnd(22)} ` +
      `${r.fromKm2.toFixed(2).padStart(10)} ` +
      `${r.toKm2.toFixed(2).padStart(10)} ` +
      `${(r.deltaKm2 >= 0 ? '+' : '') + r.deltaKm2.toFixed(2)}`.padStart(11) +
      `${((r.deltaPp >= 0 ? '+' : '') + r.deltaPp.toFixed(2)).padStart(10)}` +
      `${(r.pctChange !== null ? (r.pctChange >= 0 ? '+' : '') + r.pctChange.toFixed(1) + '%' : 'N/A').padStart(9)}`;
    drawLine(rowStr, 9, false, 14);
  }

  drawLine('-'.repeat(78), 9, false, 14);
  const totalStr =
    `${'Total (100% extent)'.padEnd(22)} ` +
    `${input.totals.fromKm2.toFixed(2).padStart(10)} ` +
    `${input.totals.toKm2.toFixed(2).padStart(10)} ` +
    `${((input.totals.deltaKm2 >= 0 ? '+' : '') + input.totals.deltaKm2.toFixed(2)).padStart(10)} ` +
    `${((input.totals.deltaPp >= 0 ? '+' : '') + input.totals.deltaPp.toFixed(2)).padStart(9)} ` +
    `${'--'.padStart(8)}`;
  drawLine(totalStr, 9, true, 24);
  drawLine('See Data & Credits for dataset attributions and licenses.', 8, false, 12);

  const stream = ops.join('\n');

  const objects: string[] = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >> endobj\n',
    `4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj\n`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Courier >> endobj\n',
    '6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >> endobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}
