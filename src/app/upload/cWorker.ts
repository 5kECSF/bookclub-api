import { ColorEnums, logTrace } from '@/common/logger';
import * as sharp from 'sharp';

import { parentPort } from 'worker_threads';
interface ImageResizeRequest {
  file: Buffer;
}
// async function compress(file) {
//   try {
//     logTrace('before', Buffer.byteLength(file.buffer), ColorEnums.BgYellow);
//     const { format } = await sharp(file).metadata();
//     let imageSharp = sharp(file);

//     // Apply different settings based on the image format
//     if (format === 'jpeg' || format === 'jpg') {
//       imageSharp = imageSharp.jpeg({ quality: 50 }).resize(1000);
//     } else if (format === 'png') {
//       imageSharp = imageSharp.png({ quality: 70 }).resize(1000);
//     } else if (format === 'webp') {
//       imageSharp = imageSharp.webp({ quality: 70 }).resize(1000);
//     } else {
//       // You can add handling for other image formats here
//       // By default, just use JPEG compression
//       imageSharp = imageSharp.jpeg({ quality: 70 });
//     }

//     const compressedImageBuffer = await imageSharp.toBuffer();
//     logTrace('after', Buffer.byteLength(compressedImageBuffer), ColorEnums.BgCyan);
//     return compressedImageBuffer;
//   } catch (e) {
//     console.log(e);
//     throw e;
//   }
// }
// parentPort?.postMessage(compress(workerData.value));

parentPort?.on('message', async ({ file }: ImageResizeRequest) => {
  try {
    logTrace('before', Buffer.byteLength(file.buffer), ColorEnums.BgYellow);
    const { format } = await sharp(file).metadata();
    let imageSharp = sharp(file);

    // Apply different settings based on the image format
    if (format === 'jpeg' || format === 'jpg') {
      imageSharp = imageSharp.jpeg({ quality: 50 }).resize(1000);
    } else if (format === 'png') {
      imageSharp = imageSharp.png({ quality: 70 }).resize(1000);
    } else if (format === 'webp') {
      imageSharp = imageSharp.webp({ quality: 70 }).resize(1000);
    } else {
      // You can add handling for other image formats here
      // By default, just use JPEG compression
      imageSharp = imageSharp.jpeg({ quality: 70 });
    }

    const compressedImageBuffer = await imageSharp.toBuffer();
    logTrace('after', Buffer.byteLength(compressedImageBuffer), ColorEnums.BgCyan);
    parentPort?.postMessage({ buffer: compressedImageBuffer });
  } catch (error) {
    parentPort?.postMessage({ error: error.message });
  }
});
