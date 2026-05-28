/**
 * Renders a shareable PNG of a finalised order as a spreadsheet-style table —
 * each diner's dishes are grouped together with a per-person total — plus a
 * Grand Total and the orderer's payment info, so the orderer can drop it in the
 * group chat.
 *
 * Pure Canvas 2D (no html2canvas dependency). Colours come from the live theme
 * CSS vars so the image matches whichever palette is active.
 */

export interface SummaryDish {
  /** Dish name + options. */
  dish: string;
  note: string;
  /** Unit price. */
  price: number;
  qty: number;
  /** price × qty. */
  subtotal: number;
}

export interface SummaryGroup {
  /** Diner who ordered these dishes. */
  name: string;
  dishes: SummaryDish[];
  /** This diner's share of fees (ship + service). */
  fee: number;
  /** This diner's share of the discount (≤ 0). */
  discount: number;
  /** Final amount this diner must pay — món subtotal + their fee − discount. */
  total: number;
}

export interface PaymentSummaryData {
  shop: string;
  shopSub: string;
  roomName: string;
  dateLabel: string;
  /** Person who placed/collects the order. */
  ordererName: string;
  appUrl: string;
  /** Where to send money, e.g. "Vietcombank · 0123456789 · NGUYEN VAN A". */
  paymentLine: string;
  groups: SummaryGroup[];
  /** Order totals for the reconciliation cluster. */
  itemsSubtotal: number;
  shipFee: number;
  serviceFee: number;
  /** Voucher amount — negative when a discount applies. */
  discount: number;
  /** Final order total = itemsSubtotal + fees + discount. */
  grand: number;
}

interface Palette {
  bg: string;
  card: string;
  zebra: string;
  ink: string;
  muted: string;
  line: string;
  lineSoft: string;
  primary: string;
  primaryInk: string;
  primarySoft: string;
  accent: string;
  amber: string;
  rose: string;
}

interface Col {
  key: 'no' | 'name' | 'order' | 'note' | 'price' | 'sl' | 'fee' | 'disc' | 'sub';
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
  /* Add the per-person PHÍ / GIẢM columns only when the order actually has them. */
  const showFee = data.groups.some((g) => Math.round(g.fee) !== 0);
  const showDiscount = data.groups.some((g) => Math.round(g.discount) !== 0);
  /* Widen the canvas per extra column so MÓN keeps its width. */
  const W = 820 + (showFee ? 82 : 0) + (showDiscount ? 82 : 0);
  /* Generous working height; we crop to the real content height at the end. */
  const dishCount = data.groups.reduce((s, g) => s + g.dishes.length, 0);
  const WORK_H = 480 + dishCount * 64;

  const work = document.createElement('canvas');
  work.width = W * DPR;
  work.height = WORK_H * DPR;
  const ctx = work.getContext('2d')!;
  ctx.scale(DPR, DPR);
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, W, WORK_H);

  const cols = buildCols(W, showFee, showDiscount);

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

function buildCols(W: number, showFee: boolean, showDiscount: boolean): Col[] {
  const tableW = W - MX * 2;
  const fixed = { no: 40, name: 92, note: 132, price: 88, sl: 38, fee: 82, disc: 82, sub: 106 };
  let used = fixed.no + fixed.name + fixed.note + fixed.price + fixed.sl + fixed.sub;
  if (showFee) used += fixed.fee;
  if (showDiscount) used += fixed.disc;
  const orderW = tableW - used;
  const defs: Omit<Col, 'x'>[] = [
    { key: 'no', title: 'STT', w: fixed.no, align: 'center' },
    { key: 'name', title: 'TÊN', w: fixed.name, align: 'left' },
    { key: 'order', title: 'MÓN', w: orderW, align: 'left' },
    { key: 'note', title: 'GHI CHÚ', w: fixed.note, align: 'left' },
    { key: 'price', title: 'ĐƠN GIÁ', w: fixed.price, align: 'right' },
    { key: 'sl', title: 'SL', w: fixed.sl, align: 'center' },
  ];
  if (showFee) defs.push({ key: 'fee', title: 'PHÍ', w: fixed.fee, align: 'right' });
  if (showDiscount) defs.push({ key: 'disc', title: 'GIẢM', w: fixed.disc, align: 'right' });
  defs.push({ key: 'sub', title: 'CẦN TRẢ', w: fixed.sub, align: 'right' });
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

  /* ── data rows — one block per diner, their dishes grouped together ── */
  const colNo = cols.find((c) => c.key === 'no')!;
  const colName = cols.find((c) => c.key === 'name')!;
  const colOrder = cols.find((c) => c.key === 'order')!;
  const colNote = cols.find((c) => c.key === 'note')!;
  const colPrice = cols.find((c) => c.key === 'price')!;
  const colSl = cols.find((c) => c.key === 'sl')!;
  const colFee = cols.find((c) => c.key === 'fee');
  const colDisc = cols.find((c) => c.key === 'disc');
  const colSub = cols.find((c) => c.key === 'sub')!;
  /* Per-dish columns end at SL's right edge; merged columns sit after it. */
  const perDishRight = colSl.x + colSl.w;

  d.groups.forEach((g, gi) => {
    /* Measure each dish so we know the block height before painting. */
    ctx.font = `500 11px ${FONT}`;
    const layouts = g.dishes.map((dish) => {
      const orderLines = wrapLines(ctx, dish.dish, colOrder.w - 16, 3);
      const noteLines = wrapLines(ctx, dish.note, colNote.w - 16, 3);
      const nLines = Math.max(orderLines.length, noteLines.length, 1);
      return { dish, orderLines, noteLines, h: ROW_PAD + nLines * LINE_H };
    });
    const groupTop = y;
    const groupH = layouts.reduce((s, l) => s + l.h, 0);

    ctx.fillStyle = gi % 2 === 0 ? pal.card : pal.zebra;
    ctx.fillRect(MX, groupTop, tableW, groupH);

    /* Per-dish cells: món, ghi chú, đơn giá, SL. */
    let dy = groupTop;
    layouts.forEach((l, di) => {
      ctx.fillStyle = pal.ink;
      ctx.font = `500 11px ${FONT}`;
      multiline(ctx, l.orderLines, colOrder, dy, l.h);
      ctx.fillStyle = pal.muted;
      ctx.font = `500 11px ${FONT}`;
      multiline(ctx, l.noteLines, colNote, dy, l.h);
      ctx.fillStyle = pal.ink;
      ctx.font = `500 11px ${FONT}`;
      cellText(ctx, `${fmt(l.dish.price)}đ`, colPrice, dy, l.h);
      ctx.font = `600 11px ${FONT}`;
      cellText(ctx, String(l.dish.qty), colSl, dy, l.h);
      /* Faint divider between this diner's dishes (kept clear of the merged
         STT/TÊN/PHÍ/GIẢM/CẦN TRẢ columns so those read as one cell). */
      if (di < layouts.length - 1) hLine(ctx, colOrder.x, perDishRight, dy + l.h, pal.lineSoft);
      dy += l.h;
    });

    /* Merged columns centred across the whole block: STT, TÊN, per-diner PHÍ /
       GIẢM (when shown), and the final CẦN TRẢ. */
    ctx.fillStyle = pal.muted;
    ctx.font = `600 11px ${FONT}`;
    cellText(ctx, String(gi + 1), colNo, groupTop, groupH);
    ctx.fillStyle = pal.ink;
    ctx.font = `700 11px ${FONT}`;
    cellText(ctx, g.name, colName, groupTop, groupH);
    if (colFee) {
      ctx.fillStyle = pal.ink;
      ctx.font = `600 11px ${FONT}`;
      cellText(ctx, g.fee ? `${fmt(g.fee)}đ` : '—', colFee, groupTop, groupH);
    }
    if (colDisc) {
      ctx.fillStyle = g.discount ? pal.rose : pal.muted;
      ctx.font = `600 11px ${FONT}`;
      cellText(ctx, g.discount ? `${fmt(g.discount)}đ` : '—', colDisc, groupTop, groupH);
    }
    ctx.fillStyle = pal.ink;
    ctx.font = `800 11.5px ${FONT}`;
    cellText(ctx, `${fmt(g.total)}đ`, colSub, groupTop, groupH);

    hLine(ctx, MX, MX + tableW, groupTop + groupH, pal.line);
    y += groupH;
  });

  const tableBottom = y;

  /* ── grid: column separators over body, then outer border ── */
  ctx.strokeStyle = pal.line;
  ctx.lineWidth = 1;
  for (let i = 1; i < cols.length; i++) {
    vLine(ctx, cols[i].x, tableTop + TH_H, tableBottom, pal.line);
  }
  strokeRect(ctx, MX, tableTop, tableW, tableBottom - tableTop, pal.line, 1.25);

  /* ── reconciliation cluster (right) + payment block (left) ── */
  const blockTop = tableBottom + 20;
  const boxW = Math.min(320, tableW);
  const boxX = MX + tableW - boxW;
  const boxBottom = drawSummaryBox(ctx, pal, d, boxX, boxW, blockTop);
  const payBottom = drawPaymentBlock(ctx, pal, d, MX, boxX - MX - 24, blockTop);

  return Math.max(boxBottom, payBottom) + 16;
}

/** Receipt-style cluster: tạm tính món, phí, giảm giá, tổng đơn. */
function drawSummaryBox(ctx: C, pal: Palette, d: PaymentSummaryData, x: number, w: number, y0: number): number {
  const rows: { label: string; value: number; neg?: boolean }[] = [
    { label: 'Tạm tính (tổng món)', value: d.itemsSubtotal },
  ];
  if (d.shipFee) rows.push({ label: 'Phí giao hàng', value: d.shipFee });
  if (d.serviceFee) rows.push({ label: 'Phí dịch vụ', value: d.serviceFee });
  if (d.discount) rows.push({ label: 'Giảm giá', value: d.discount, neg: true });

  const padX = 14;
  const rowH = 22;
  const grandH = 32;
  const padTop = 10;
  const padBot = 10;
  const divGap = 8;
  const boxH = padTop + rows.length * rowH + divGap + grandH + padBot;

  fillRoundRect(ctx, x, y0, w, boxH, 12, pal.card);
  strokeRoundRect(ctx, x, y0, w, boxH, 12, pal.line, 1.25);

  let cy = y0 + padTop;
  for (const r of rows) {
    ctx.textAlign = 'left';
    ctx.font = `500 11.5px ${FONT}`;
    ctx.fillStyle = pal.muted;
    ctx.fillText(fit(ctx, r.label, w - padX * 2 - 90), x + padX, cy + 15);
    ctx.textAlign = 'right';
    ctx.font = `600 11.5px ${FONT}`;
    ctx.fillStyle = r.neg ? pal.rose : pal.ink;
    ctx.fillText(`${fmt(r.value)}đ`, x + w - padX, cy + 15);
    cy += rowH;
  }

  hLine(ctx, x + padX, x + w - padX, cy + 4, pal.line);
  cy += divGap;

  /* Grand total — emphasised. */
  fillRoundRect(ctx, x + 4, cy, w - 8, grandH, 8, pal.primarySoft);
  ctx.textAlign = 'left';
  ctx.font = `800 13px ${FONT}`;
  ctx.fillStyle = pal.primaryInk;
  ctx.fillText('Tổng đơn', x + padX, cy + 21);
  ctx.textAlign = 'right';
  ctx.font = `800 14px ${FONT}`;
  ctx.fillStyle = pal.primaryInk;
  ctx.fillText(`${fmt(d.grand)}đ`, x + w - padX, cy + 21);
  ctx.textAlign = 'left';

  return y0 + boxH;
}

/** Left block: where to send money + a reconciliation hint. */
function drawPaymentBlock(ctx: C, pal: Palette, d: PaymentSummaryData, x: number, w: number, y0: number): number {
  let cy = y0 + 14;
  ctx.textAlign = 'left';
  ctx.font = `700 12px ${FONT}`;
  ctx.fillStyle = pal.ink;
  ctx.fillText(fit(ctx, `Chuyển tiền cho ${d.ordererName || 'người đặt'}`, w), x, cy);
  cy += 20;

  ctx.font = `600 12px ${FONT}`;
  ctx.fillStyle = pal.primaryInk;
  for (const ln of wrapLines(ctx, d.paymentLine, w, 3)) {
    ctx.fillText(fit(ctx, ln, w), x, cy);
    cy += 17;
  }

  cy += 6;
  ctx.font = `500 11px ${FONT}`;
  ctx.fillStyle = pal.muted;
  for (const ln of wrapLines(ctx, 'CẦN TRẢ = tiền món + phí − giảm. Mọi người chuyển đúng cột CẦN TRẢ nhé.', w, 3)) {
    ctx.fillText(fit(ctx, ln, w), x, cy);
    cy += 15;
  }
  return cy;
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

function pathRoundRect(ctx: C, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function fillRoundRect(ctx: C, x: number, y: number, w: number, h: number, r: number, fill: string): void {
  pathRoundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function strokeRoundRect(ctx: C, x: number, y: number, w: number, h: number, r: number, stroke: string, lw: number): void {
  pathRoundRect(ctx, x, y, w, h, r);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw;
  ctx.stroke();
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
    lineSoft: read('--line-soft', '#efe2cb'),
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
