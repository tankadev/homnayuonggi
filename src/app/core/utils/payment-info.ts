/**
 * Parses a user's freeform payment list (stored on /users/*\/payment as
 * [{ label, value, checked?, disabled? }]) into a structured + display-ready
 * shape, so any screen can show "how to pay the orderer" consistently.
 */

export type PayMethod = 'bank' | 'momo' | 'cash';

export interface PaymentLine {
  kind: PayMethod;
  /** Human label — bank name, "MoMo", or "Tiền mặt". */
  label: string;
  /** Account number / phone (with holder appended), or a hint for cash. */
  value: string;
  /** Raw copyable token (account no / phone). Absent for cash. */
  copy?: string;
}

export interface OwnerPaymentInfo {
  method: PayMethod;
  bank: { name: string; acc: string; holder: string; branch: string };
  momo: { phone: string; holder: string };
  /** Display-ready lines, in priority order (bank, momo, else cash). */
  lines: PaymentLine[];
}

interface PaymentEntry {
  label?: string;
  value?: string;
  checked?: boolean;
  disabled?: boolean;
}

export function parseOwnerPayment(
  payment?: PaymentEntry[] | null,
  fallbackPhone?: string,
  fallbackHolder?: string,
): OwnerPaymentInfo {
  const get = (re: RegExp): string => {
    if (!payment) return '';
    const hit = payment.find((p) => re.test(p.label || '') && p.checked !== false && !p.disabled);
    return (hit?.value || '').trim();
  };

  const bankName = get(/ngân hàng|bank/i);
  const bankAcc = get(/(số tài khoản|stk|acc)/i);
  let bankHolder = get(/(chủ tài khoản|holder|tên)/i);
  let momoPhone = get(/momo|sđt|phone/i);

  if (!momoPhone && fallbackPhone) momoPhone = fallbackPhone.trim();
  if (!bankHolder && fallbackHolder) bankHolder = (fallbackHolder || '').trim();

  const method: PayMethod = momoPhone && !bankAcc ? 'momo' : bankAcc ? 'bank' : 'cash';

  const bank = { name: bankName, acc: bankAcc, holder: bankHolder, branch: '' };
  const momo = { phone: momoPhone, holder: bankHolder };

  const lines: PaymentLine[] = [];
  if (bankAcc) {
    lines.push({
      kind: 'bank',
      label: bankName || 'Ngân hàng',
      value: bankHolder ? `${bankAcc} · ${bankHolder}` : bankAcc,
      copy: bankAcc,
    });
  }
  if (momoPhone) {
    lines.push({ kind: 'momo', label: 'MoMo', value: momoPhone, copy: momoPhone });
  }
  if (!lines.length) {
    lines.push({ kind: 'cash', label: 'Tiền mặt', value: 'Trả trực tiếp cho chủ đơn' });
  }

  return { method, bank, momo, lines };
}
