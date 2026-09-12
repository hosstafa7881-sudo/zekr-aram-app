// Tiny image-inspection helper for the QA scripts: loads a produced PNG into a
// canvas inside a Playwright page and answers questions about actual pixels,
// so a check like "the white bottom box really got drawn" is verified from the
// image itself rather than from the code that was supposed to draw it.
import fs from 'node:fs';

async function withCanvas(context, file, fn, arg) {
  const page = await context.newPage();
  await page.setContent('<canvas id="c"></canvas>');
  const dataUri = `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
  const out = await page.evaluate(
    async ({ uri, argument, source }) => {
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = uri;
      });
      const canvas = document.getElementById('c');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      // eslint-disable-next-line no-new-func
      return new Function(`return (${source})`)()(ctx, canvas, argument);
    },
    { uri: dataUri, argument: arg, source: fn.toString() }
  );
  await page.close();
  return out;
}

/** The RGB of one pixel, as [r, g, b]. */
export function pixelAt(context, file, x, y) {
  return withCanvas(
    context,
    file,
    (ctx, canvas, p) => Array.from(ctx.getImageData(p.x, p.y, 1, 1).data).slice(0, 3),
    { x, y }
  );
}

/** Image dimensions. */
export function imageSize(context, file) {
  return withCanvas(context, file, (ctx, canvas) => ({
    width: canvas.width,
    height: canvas.height,
  }));
}

/**
 * Height, in pixels, of the run of near-white pixels found by walking UP a
 * vertical line from `fromBottom` px above the image's bottom edge. Used to
 * measure the white promo box on the counter image, whose height tells us
 * whether the third «دانلود از …» line was drawn (280px) or not (210px).
 */
export function whiteBoxHeight(context, file, x, fromBottom) {
  return withCanvas(
    context,
    file,
    (ctx, canvas, p) => {
      // Pure #ffffff only — the story image's soft-green background is itself
      // very light (≈ rgb(240,250,238)), so a loose threshold would call it
      // white too.
      const isWhite = (y) => {
        const d = ctx.getImageData(p.x, y, 1, 1).data;
        return d[0] >= 252 && d[1] >= 252 && d[2] >= 252;
      };
      let y = canvas.height - p.fromBottom;
      while (y > 0 && !isWhite(y)) y--;
      if (y <= 0) return 0;
      const bottom = y;
      while (y > 0 && isWhite(y)) y--;
      return bottom - y;
    },
    { x, fromBottom }
  );
}

/** Crops a region out of the PNG and writes it to `outFile` (for report screenshots). */
export async function cropTo(context, file, outFile, { x, y, width, height }) {
  const dataUrl = await withCanvas(
    context,
    file,
    (ctx, canvas, p) => {
      const out = document.createElement('canvas');
      out.width = p.width;
      out.height = p.height;
      out.getContext('2d').drawImage(canvas, p.x, p.y, p.width, p.height, 0, 0, p.width, p.height);
      return out.toDataURL('image/png');
    },
    { x, y, width, height }
  );
  fs.writeFileSync(outFile, Buffer.from(dataUrl.split(',')[1], 'base64'));
  return outFile;
}
