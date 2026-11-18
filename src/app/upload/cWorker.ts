/**
 * image resize worker thread. Only used from the compiled build (dist/app/upload/cWorker.js);
 * under ts-node/jest FileProviderService resizes in process instead.
 * (relative imports only: path aliases are not resolved inside a raw worker)
 */
import { parentPort } from 'worker_threads';
import { compressImage } from './image-compress';

interface ImageResizeRequest {
  file: Buffer | Uint8Array;
}

parentPort?.on('message', async ({ file }: ImageResizeRequest) => {
  try {
    const buffer = await compressImage(Buffer.from(file));
    parentPort?.postMessage({ buffer });
  } catch (error) {
    parentPort?.postMessage({ error: error.message });
  }
});
