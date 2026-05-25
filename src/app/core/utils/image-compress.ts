/**
 * Browser-side image compression so we can both POST a smaller file to the AI
 * extractor AND embed a thumbnail copy into RTDB without blowing past the
 * per-node size budget.
 */
export interface CompressedImage {
  /** Smaller File suitable for multipart upload. Keeps original name. */
  file: File;
  /** Base64 data URL (JPEG) for storage in RTDB / display. */
  dataUrl: string;
  /** Final size in bytes. */
  bytes: number;
}

export interface CompressOpts {
  /** Longest edge in pixels. Default 1200. */
  maxEdge?: number;
  /** JPEG quality 0..1. Default 0.7. */
  quality?: number;
  /** Cap output bytes — drop quality if exceeded. Default 350_000 (~340KB). */
  targetBytes?: number;
}

/** Compress one File to a JPEG dataURL + File. */
export async function compressImage(
  source: File,
  opts: CompressOpts = {},
): Promise<CompressedImage> {
  const maxEdge = opts.maxEdge ?? 1200;
  const targetBytes = opts.targetBytes ?? 350_000;
  let quality = opts.quality ?? 0.7;

  const bitmap = await loadBitmap(source);
  const { width, height } = fit(bitmap.width, bitmap.height, maxEdge);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, width, height);
  if ('close' in bitmap) (bitmap as ImageBitmap).close();

  /* Re-encode at decreasing quality until under target — small images already
     compress well so usually first pass is enough. */
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  let bytes = approxBytes(dataUrl);
  while (bytes > targetBytes && quality > 0.4) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
    bytes = approxBytes(dataUrl);
  }

  const blob = await dataUrlToBlob(dataUrl);
  const baseName = source.name.replace(/\.(png|jpe?g|webp|gif|bmp|heic|heif)$/i, '');
  const file = new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
  return { file, dataUrl, bytes };
}

function fit(w: number, h: number, maxEdge: number): { width: number; height: number } {
  if (w <= maxEdge && h <= maxEdge) return { width: w, height: h };
  const ratio = w > h ? maxEdge / w : maxEdge / h;
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall through to <img> fallback */
    }
  }
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không đọc được ảnh'));
    };
    img.src = url;
  });
}

function approxBytes(dataUrl: string): number {
  const idx = dataUrl.indexOf(',');
  const b64 = idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}
