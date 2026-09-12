// مورد ۱۹ — a REAL scannable QR code on the ready-made story image, pointing
// at the store download link. Generated locally by the tiny `qrcode-generator`
// library (MIT, pure JS, no network), then drawn as plain filled squares on
// the canvas.

import qrcode from 'qrcode-generator';

export interface QrDrawOptions {
  dark?: string;
  light?: string;
  /** Quiet zone in modules — the QR spec asks for 4; anything less can fail to scan. */
  marginModules?: number;
}

/**
 * Draws a QR code for `text` into the square (x, y, size). Returns false when
 * the text can't be encoded (e.g. absurdly long), so callers can leave the
 * area blank instead of drawing something broken.
 */
export function drawQrCode(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  options: QrDrawOptions = {}
): boolean {
  const dark = options.dark || '#101a10';
  const light = options.light || '#ffffff';
  const marginModules = options.marginModules ?? 4;

  let qr: ReturnType<typeof qrcode>;
  try {
    // typeNumber 0 = pick the smallest version that fits; 'M' error correction
    // is the usual choice for printed/scanned marketing codes.
    qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
  } catch {
    return false;
  }

  const moduleCount = qr.getModuleCount();
  const totalModules = moduleCount + marginModules * 2;
  const moduleSize = size / totalModules;

  ctx.save();
  ctx.fillStyle = light;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = dark;
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (!qr.isDark(row, col)) continue;
      // Math.ceil on the size avoids hairline gaps between modules on
      // fractional module sizes, which is what makes a drawn QR fail to scan.
      ctx.fillRect(
        x + (col + marginModules) * moduleSize,
        y + (row + marginModules) * moduleSize,
        Math.ceil(moduleSize),
        Math.ceil(moduleSize)
      );
    }
  }
  ctx.restore();
  return true;
}
