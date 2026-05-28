/**
 * Renders a shareable PNG of a finalised order as a spreadsheet-style table
 * (one row per dish: name, món, note, price, qty, subtotal) plus a Grand Total
 * and the orderer's payment info — so the orderer can drop it in the group chat.
 *
 * Pure Canvas 2D (no html2canvas dependency). Colours come from the live theme
 * CSS vars so the image matches whichever palette is active.
 */

export interface SummaryLineItem {
  /** Who ordered this dish. */
  name: string;
  /** Dish name + options. */
  dish: string;
  note: string;
  /** Unit price. */
  price: number;
  qty: number;
  /** price × qty. */
  subtotal: number;
}

export interface PaymentSummaryData {
  shop: string;
  shopSub: string;
  roomName: string;
  dateLabel: string;
  /** Person who placed/collects the order. */
  ordererName: string;
  appUrl: string;
  shipFee: number;
  serviceFee: number;
  /** Voucher amount — negative when a discount applies. */
  discount: number;
  /** Sum of all line subtotals (before fees/discount). */
  itemsSubtotal: number;
  /** Final amount = itemsSubtotal + fees + discount. */
  grand: number;
  totalQty: number;
  /** Where to send money, e.g. "Vietcombank · 0123456789 · NGUYEN VAN A". */
  paymentLine: string;
  items: SummaryLineItem[];
}

interface Palette {
  bg: string;
  card: string;
  zebra: string;
  ink: string;
  muted: string;
  line: string;
  primary: string;
  primaryInk: string;
  primarySoft: string;
  accent: string;
  amber: string;
  rose: string;
}

interface Col {
  key: 'no' | 'name' | 'order' | 'note' | 'price' | 'sl' | 'sub';
  title: string;
  w: number;
  align: 'left' | 'center' | 'right';
  x: number;
}

const FONT = '"Be Vietnam Pro", ui-sans-serif, system-ui, -apple-system, sans-serif';
const MX = 18; // table side margin
const HEADER_H = 78; // shop title band
const TH_H = 32; // table header row
const LINE_H = 15;
const ROW_PAD = 12;

export async function downloadPaymentSummaryImage(
  data: PaymentSummaryData,
  filename: string,
): Promise<void> {
  await ensureFonts();
  const pal = resolvePalette();

  const DPR = 2;
  const W = 820;
  /* Generous working height; we crop to the real content height at the end. */
  const WORK_H = 360 + data.items.length * 64;

  const work = document.createElement('canvas');
  work.width = W * DPR;
  work.height = WORK_H * DPR;
  const ctx = work.getContext('2d')!;
  ctx.scale(DPR, DPR);
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, W, WORK_H);

  const cols = buildCols(W);

  drawTitle(ctx, pal, data, W);
  const contentH = drawTable(ctx, pal, data, cols, W, HEADER_H);

  const out = document.createElement('canvas');
  out.width = W * DPR;
  out.height = Math.round(contentH * DPR);
  const octx = out.getContext('2d')!;
  octx.drawImage(work, 0, 0, W * DPR, contentH * DPR, 0, 0, W * DPR, contentH * DPR);

  const blob = await new Promise<Blob | null>((res) => out.toBlob(res, 'image/png'));
  if (!blob) return;
  triggerDownload(blob, filename);
}

/* ─────────────────────────── layout ─────────────────────────── */

function buildCols(W: number): Col[] {
  const tableW = W - MX * 2;
  const fixed = { no: 40, name: 92, note: 140, price: 90, sl: 42, sub: 108 };
  const orderW = tableW - (fixed.no + fixed.name + fixed.note + fixed.price + fixed.sl + fixed.sub);
  const defs: Omit<Col, 'x'>[] = [
    { key: 'no', title: 'STT', w: fixed.no, align: 'center' },
    { key: 'name', title: 'TÊN', w: fixed.name, align: 'left' },
    { key: 'order', title: 'MÓN', w: orderW, align: 'left' },
    { key: 'note', title: 'GHI CHÚ', w: fixed.note, align: 'left' },
    { key: 'price', title: 'ĐƠN GIÁ', w: fixed.price, align: 'right' },
    { key: 'sl', title: 'SL', w: fixed.sl, align: 'center' },
    { key: 'sub', title: 'THÀNH TIỀN', w: fixed.sub, align: 'right' },
  ];
  let x = MX;
  return defs.map((d) => {
    const col = { ...d, x };
    x += d.w;
    return col;
  });
}

/* ─────────────────────────── sections ─────────────────────────── */

function drawTitle(ctx: C, pal: Palette, d: PaymentSummaryData, W: number): void {
  ctx.fillStyle = pal.primary;
  ctx.fillRect(0, 0, W, HEADER_H);

  ctx.fillStyle = '#ffffff';
  ctx.font = `800 21px ${FONT}`;
  ctx.fillText(fit(ctx, d.shop, W - MX * 2 - 220), MX, 34);

  const subParts = [d.dateLabel, d.ordererName ? `Người đặt: ${d.ordererName}` : '', d.shopSub]
    .map((s) => s?.trim())
    .filter(Boolean);
  ctx.font = `500 12px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(fit(ctx, subParts.join('   ·   '), W - MX * 2 - 220), MX, 58);

  /* App link top-right, like the sheet. */
  if (d.appUrl) {
    ctx.textAlign = 'right';
    ctx.font = `600 12px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(fit(ctx, d.appUrl, 220), W - MX, 34);
    if (d.roomName) {
      ctx.font = `500 12px ${FONT}`;
      ctx.fillStyle = 'rgba(255,255,255,0.78)';
      ctx.fillText(fit(ctx, `Phòng: ${d.roomName}`, 220), W - MX, 58);
    }
    ctx.textAlign = 'left';
  }
}

function drawTable(ctx: C, pal: Palette, d: PaymentSummaryData, cols: Col[], W: number, top: number): number {
  const tableW = W - MX * 2;
  const tableTop = top;
  let y = top;

  /* ── header row ── */
  ctx.fillStyle = pal.primaryInk;
  ctx.fillRect(MX, y, tableW, TH_H);
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 10.5px ${FONT}`;
  for (const c of cols) cellText(ctx, c.title, c, y, TH_H);
  y += TH_H;

  /* ── data rows ── */
  const colOrder = cols.find((c) => c.key === 'order')!;
  const colNote = cols.find((c) => c.key === 'note')!;
  d.items.forEach((it, i) => {
    ctx.font = `500 11px ${FONT}`;
    const orderLines = wrapLines(ctx, it.dish, colOrder.w - 16, 3);
    const noteLines = wrapLines(ctx, it.note, colNote.w - 16, 3);
    const nLines = Math.max(orderLines.length, noteLines.length, 1);
    const rowH = ROW_PAD + nLines * LINE_H;

    ctx.fillStyle = i % 2 === 0 ? pal.card : pal.zebra;
    ctx.fillRect(MX, y, tableW, rowH);

    for (const c of cols) {
      switch (c.key) {
        case 'no':
          ctx.fillStyle = pal.muted;
          ctx.font = `600 11px ${FONT}`;
          cellText(ctx, String(i + 1), c, y, rowH);
          break;
        case 'name':
          ctx.fillStyle = pal.ink;
          ctx.font = `700 11px ${FONT}`;
          cellText(ctx, it.name, c, y, rowH);
          break;
        case 'order':
          ctx.fillStyle = pal.ink;
          ctx.font = `500 11px ${FONT}`;
          multiline(ctx, orderLines, c, y, rowH);
          break;
        case 'note':
          ctx.fillStyle = pal.muted;
          ctx.font = `500 11px ${FONT}`;
          multiline(ctx, noteLines, c, y, rowH);
          break;
        case 'price':
          ctx.fillStyle = pal.ink;
          ctx.font = `500 11px ${FONT}`;
          cellText(ctx, `${fmt(it.price)}đ`, c, y, rowH);
          break;
        case 'sl':
          ctx.fillStyle = pal.ink;
          ctx.font = `600 11px ${FONT}`;
          cellText(ctx, String(it.qty), c, y, rowH);
          break;
        case 'sub':
          ctx.fillStyle = pal.ink;
          ctx.font = `700 11px ${FONT}`;
          cellText(ctx, `${fmt(it.subtotal)}đ`, c, y, rowH);
          break;
      }
    }
    hLine(ctx, MX, MX + tableW, y + rowH, pal.line);
    y += rowH;
  });

  /* ── totals ── */
  y = totalRow(ctx, pal, cols, 'Tạm tính', d.totalQty, d.itemsSubtotal, false, y);
  if (d.shipFee) y = totalRow(ctx, pal, cols, 'Phí giao hàng', null, d.shipFee, false, y);
  if (d.serviceFee) y = totalRow(ctx, pal, cols, 'Phí dịch vụ', null, d.serviceFee, false, y);
  if (d.discount) y = totalRow(ctx, pal, cols, 'Giảm giá', null, d.discount, false, y);
  y = totalRow(ctx, pal, cols, 'TỔNG CỘNG', d.totalQty, d.grand, true, y);

  const tableBottom = y;

  /* ── grid: column separators over body + totals, then outer border ── */
  ctx.strokeStyle = pal.line;
  ctx.lineWidth = 1;
  for (let i = 1; i < cols.length; i++) {
    vLine(ctx, cols[i].x, tableTop + TH_H, tableBottom, pal.line);
  }
  strokeRect(ctx, MX, tableTop, tableW, tableBottom - tableTop, pal.line, 1.25);

  /* ── payment footer ── */
  y = tableBottom + 22;
  ctx.fillStyle = pal.ink;
  ctx.font = `700 12px ${FONT}`;
  const lead = `Chuyển tiền cho ${d.ordererName || 'người đặt'}:  `;
  ctx.fillText(lead, MX, y);
  const leadW = ctx.measureText(lead).width;
  ctx.fillStyle = pal.primaryInk;
  ctx.font = `600 12px ${FONT}`;
  ctx.fillText(fit(ctx, d.paymentLine, W - MX * 2 - leadW), MX + leadW, y);

  y += 22;
  ctx.fillStyle = pal.muted;
  ctx.font = `500 11px ${FONT}`;
  ctx.fillText('Mở app, kiểm tra đơn của bạn và đánh dấu đã thanh toán.', MX, y);

  return y + 18;
}

function totalRow(
  ctx: C,
  pal: Palette,
  cols: Col[],
  label: string,
  qty: number | null,
  value: number,
  highlight: boolean,
  y0: number,
): number {
  const tableW = cols.reduce((s, c) => s + c.w, 0);
  const rowH = highlight ? 32 : 26;
  ctx.fillStyle = highlight ? pal.primarySoft : pal.card;
  ctx.fillRect(MX, y0, tableW, rowH);

  const colSl = cols.find((c) => c.key === 'sl')!;
  const colSub = cols.find((c) => c.key === 'sub')!;
  const cy = y0 + rowH / 2 + 4;

  /* Label, right-aligned just before the SL column. */
  ctx.fillStyle = highlight ? pal.primaryInk : pal.ink;
  ctx.font = highlight ? `800 13px ${FONT}` : `600 11px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(label, colSl.x - 10, cy);

  if (qty != null) {
    ctx.textAlign = 'center';
    ctx.fillText(String(qty), colSl.x + colSl.w / 2, cy);
  }

  ctx.textAlign = 'right';
  ctx.font = highlight ? `800 13px ${FONT}` : `700 11px ${FONT}`;
  ctx.fillStyle = highlight ? pal.primaryInk : pal.ink;
  ctx.fillText(`${fmt(value)}đ`, colSub.x + colSub.w - 8, cy);
  ctx.textAlign = 'left';

  hLine(ctx, MX, MX + tableW, y0 + rowH, pal.line);
  return y0 + rowH;
}

/* ─────────────────────────── helpers ─────────────────────────── */

type C = CanvasRenderingContext2D;

function fmt(n: number): string {
  return Math.round(n || 0).toLocaleString('vi-VN');
}

function cellText(ctx: C, text: string, col: Col, top: number, rowH: number): void {
  const padX = 8;
  let tx: number;
  if (col.align === 'right') {
    ctx.textAlign = 'right';
    tx = col.x + col.w - padX;
  } else if (col.align === 'center') {
    ctx.textAlign = 'center';
    tx = col.x + col.w / 2;
  } else {
    ctx.textAlign = 'left';
    tx = col.x + padX;
  }
  ctx.fillText(fit(ctx, text, col.w - padX * 2), tx, top + rowH / 2 + 4);
  ctx.textAlign = 'left';
}

function multiline(ctx: C, lines: string[], col: Col, top: number, rowH: number): void {
  const padX = 8;
  const blockH = lines.length * LINE_H;
  let ty = top + (rowH - blockH) / 2 + 11;
  ctx.textAlign = 'left';
  for (const ln of lines) {
    ctx.fillText(fit(ctx, ln, col.w - padX * 2), col.x + padX, ty);
    ty += LINE_H;
  }
}

function fit(ctx: C, text: string, maxW: number): string {
  if (maxW <= 0) return '';
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}

function wrapLines(ctx: C, text: string, maxW: number, maxLines: number): string[] {
  const words = (text || '').split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const all: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width <= maxW || !cur) cur = test;
    else {
      all.push(cur);
      cur = w;
    }
  }
  if (cur) all.push(cur);
  if (all.length <= maxLines) return all;
  const kept = all.slice(0, maxLines);
  kept[maxLines - 1] = `${kept[maxLines - 1]} ${all.slice(maxLines).join(' ')}`;
  return kept;
}

function hLine(ctx: C, x1: number, x2: number, y: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y + 0.5);
  ctx.lineTo(x2, y + 0.5);
  ctx.stroke();
}

function vLine(ctx: C, x: number, y1: number, y2: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 0.5, y1);
  ctx.lineTo(x + 0.5, y2);
  ctx.stroke();
}

function strokeRect(ctx: C, x: number, y: number, w: number, h: number, color: string, lw: number): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.strokeRect(x, y, w, h);
}

async function ensureFonts(): Promise<void> {
  try {
    await (document as unknown as { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
  } catch {
    /* fonts API unavailable — fall back to system font */
  }
}

/**
 * Resolve theme CSS vars (which hold oklch()/var() values) to concrete rgb()
 * strings the canvas can paint, by reading computed style off a throwaway node.
 */
function resolvePalette(): Palette {
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;left:-9999px;top:-9999px;visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);
  const read = (cssVar: string, fallback: string): string => {
    probe.style.color = '';
    probe.style.color = `var(${cssVar}, ${fallback})`;
    const c = getComputedStyle(probe).color;
    return c && c !== 'rgba(0, 0, 0, 0)' ? c : fallback;
  };
  const pal: Palette = {
    bg: read('--bg', '#f9f1e2'),
    card: read('--card', '#ffffff'),
    zebra: read('--bg', '#f7f2ea'),
    ink: read('--ink', '#1f1813'),
    muted: read('--muted', '#8a7a64'),
    line: read('--line', '#e6d6bb'),
    primary: read('--primary', '#b5502f'),
    primaryInk: read('--primary-ink', '#8a3a20'),
    primarySoft: read('--primary-soft', '#f6e3d8'),
    accent: read('--accent', '#5a8f5a'),
    amber: read('--amber', '#e0a23a'),
    rose: read('--rose', '#c14e63'),
  };
  probe.remove();
  return pal;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
