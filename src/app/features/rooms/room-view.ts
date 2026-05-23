import * as CryptoJS from 'crypto-js';

import { environment } from '../../../environments/environment';
import { RoomRO } from '../../core/ro/room.ro';
import { DeliveryRO } from '../../core/ro/delivery.ro';

/** Presentation model used by RoomCard — derived from RoomRO + active DeliveryRO. */
export interface RoomView {
  key: string;
  name: string;
  desc: string;
  shop: string | null;
  /** Shop photo URL — when present, the avatar renders this image instead of the emoji. */
  shopPhoto: string | null;
  icon: string;
  initialLabel: string;
  color: [string, string];
  /**
   * 'editing'   — someone is in the create-order form (lock acquired)
   * 'live'      — order confirmed, members are choosing dishes
   * 'completed' — order finalised, waiting on payment reconciliation
   * 'idle'      — no delivery in progress
   */
  status: 'editing' | 'live' | 'completed' | 'idle';
  private: boolean;
  isMine: boolean;
}

/** Stable color pairs picked deterministically from the room key hash. */
const COLOR_PAIRS: [string, string][] = [
  ['#c98549', '#7e4a23'],
  ['#5a7a3c', '#2c4a1f'],
  ['#a05a3a', '#5a3520'],
  ['#5e7a3c', '#34481f'],
  ['#3556a8', '#1c2e5a'],
  ['#b87a3c', '#704620'],
  ['#7a6f3a', '#43391a'],
  ['#c95a37', '#5a2818'],
];

/** Coarse emoji map from shop name keywords. Default 🍚 if nothing matches. */
const ICON_MAP: Array<[RegExp, string]> = [
  [/cà ?phê|coffee|highlands|starbucks/i, '☕'],
  [/trà ?sữa|milk ?tea|tocotoco|gong cha|phúc long/i, '🧋'],
  [/trà(?! ?sữa)|tea/i, '🍵'],
  [/phở|bún bò|bún|noodle|mì|ramen/i, '🍜'],
  [/pizza|burger|gà rán|fried/i, '🍕'],
  [/sushi|nhật/i, '🍣'],
  [/bánh mì/i, '🥖'],
  [/kem|ice ?cream/i, '🍦'],
  [/nước ?ép|sinh tố|juice/i, '🥤'],
  [/cơm/i, '🍚'],
];

function hashKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h;
}

function pickColor(key: string): [string, string] {
  return COLOR_PAIRS[hashKey(key) % COLOR_PAIRS.length];
}

function pickIcon(shop: string | null): string {
  if (!shop) return '🍚';
  for (const [re, emoji] of ICON_MAP) if (re.test(shop)) return emoji;
  return '🍚';
}

function initialFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts
    .slice(-2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Map raw Firebase records into the view model used by RoomCard. */
export function mapRoom(room: RoomRO, delivery: DeliveryRO | undefined, meKey: string | null): RoomView {
  const completed = !!delivery && delivery.isCompleted === true;
  const editing =
    !!delivery && delivery.isEdit === true && delivery.isCreate !== true && !completed;
  const active = !!delivery && delivery.isCreate === true && !completed;
  const status: RoomView['status'] = completed
    ? 'completed'
    : editing
    ? 'editing'
    : active
    ? 'live'
    : 'idle';
  const shop = (active || completed) ? delivery?.delivery?.name || null : null;
  const shopPhoto = (active || completed) ? pickShopPhoto(delivery) : null;
  return {
    key: room.key,
    name: room.name || '(Phòng không tên)',
    desc: room.description || '',
    shop,
    shopPhoto,
    icon: pickIcon(shop),
    initialLabel: initialFromName(room.name || '?'),
    color: pickColor(room.key),
    status,
    private: !!room.isPrivate,
    isMine: !!meKey && room.createUser === meKey,
  };
}

/** Pick the largest available shop photo URL, or null if none. */
function pickShopPhoto(delivery: DeliveryRO | undefined): string | null {
  const photos = delivery?.delivery?.photos;
  if (!photos || !photos.length) return null;
  /* Prefer the widest photo for sharper rendering at small sizes. */
  const best = [...photos].sort((a, b) => (b.width || 0) - (a.width || 0))[0];
  return best?.value || null;
}

/** Encrypt with the master key from environment.pwd (legacy convention). */
export function encryptPassword(plain: string): string {
  return CryptoJS.AES.encrypt(plain, environment.pwd).toString();
}

/** Returns true if typed plaintext, when AES-decrypted against the stored cipher, matches. */
export function verifyPassword(storedCipher: string, typedPlain: string): boolean {
  if (!storedCipher || !typedPlain) return false;
  try {
    const decoded = CryptoJS.AES.decrypt(storedCipher.trim(), environment.pwd).toString(CryptoJS.enc.Utf8);
    return decoded === typedPlain;
  } catch {
    return false;
  }
}
