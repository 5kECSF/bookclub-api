import * as sharp from 'sharp';

/** shared by the worker thread (cWorker.ts) and the in-process fallback */
export async function compressImage(file: Buffer): Promise<Buffer> {
  const { format } = await sharp(file).metadata();
  let imageSharp = sharp(file);
  // never upscale small images
  const resize = { width: 1000, withoutEnlargement: true };

  // Apply different settings based on the image format
  if (format === 'jpeg' || format === 'jpg') {
    imageSharp = imageSharp.jpeg({ quality: 50 }).resize(resize);
  } else if (format === 'png') {
    imageSharp = imageSharp.png({ quality: 70 }).resize(resize);
  } else if (format === 'webp') {
    imageSharp = imageSharp.webp({ quality: 70 }).resize(resize);
  } else {
    // By default, just use JPEG compression
    imageSharp = imageSharp.jpeg({ quality: 70 });
  }
  return imageSharp.toBuffer();
}
