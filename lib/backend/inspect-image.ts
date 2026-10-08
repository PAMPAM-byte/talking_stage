import sharp from 'sharp';
export async function inspectImage(bytes: Buffer) {
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new Error('Choose an image up to 5 MB.');
  const pipeline = sharp(bytes, { limitInputPixels: 24_000_000, failOn: 'warning' });
  const meta = await pipeline.metadata();
  if (!['jpeg','png','webp'].includes(meta.format ?? '') || (meta.pages ?? 1) !== 1 || !meta.width || !meta.height
    || meta.width < 256 || meta.height < 256 || meta.width > 8192 || meta.height > 8192) throw new Error('Choose a still JPEG, PNG or WebP image, at least 256 pixels on each side.');
  // Full decoding verifies data, strips metadata and normalizes the stored original.
  const original = await pipeline.rotate().webp({ quality: 88 }).toBuffer();
  const variants = await Promise.all([320,640,1280].map(async width => ({ width, bytes: await sharp(original).resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer() })));
  return { original, variants, width: meta.width, height: meta.height };
}
