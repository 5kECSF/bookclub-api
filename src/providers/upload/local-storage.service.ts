import { UploadDto } from '@/app/upload/upload.entity';
import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { EnvVar } from '../../common/config/config.instances';
import { FAIL, Resp, Succeed } from '../../common/constants/return.consts';
import { FileServiceInterface } from './file-service.interface';

/** where LOCAL files are written: UPLOAD_DIR or `<cwd>/uploads` */
export function getLocalUploadDir(): string {
  return path.resolve(EnvVar.getInstance.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));
}

/** public url prefix of LOCAL files (served statically by main.ts / app.setup.ts) */
export const LOCAL_UPLOAD_ROUTE = '/uploads';

/**
 * STORAGE_PROVIDER=LOCAL: stores files on the local disk, served under `${SERVER_URL}/uploads/`
 * (meant for development, tests and the e2e server)
 */
@Injectable()
export class LocalStorageService implements FileServiceInterface {
  private readonly logger = new Logger('LocalStorage');
  readonly dir = getLocalUploadDir();

  /** never allow paths outside of the upload dir */
  private safeName(name: string): string {
    const base = path.basename(String(name || ''));
    if (!base || base === '.' || base === '..') throw new Error('invalid file name');
    return base;
  }

  async UploadOne(fName: string, file: Buffer): Promise<Resp<UploadDto>> {
    try {
      const name = this.safeName(fName);
      await fs.mkdir(this.dir, { recursive: true });
      await fs.writeFile(path.join(this.dir, name), file);
      const serverUrl = EnvVar.getInstance.SERVER_URL.replace(/\/+$/, '');
      return Succeed({
        url: `${serverUrl}${LOCAL_UPLOAD_ROUTE}/${encodeURIComponent(name)}`,
        suffix: '',
        pathId: 'local',
        fileName: name,
      });
    } catch (e) {
      this.logger.error(`upload failed: ${e.message}`);
      return FAIL(e.message, 500);
    }
  }

  async deleteFileByPrefix(prefix: string): Promise<Resp<boolean>> {
    try {
      const safePrefix = this.safeName(prefix);
      let files: string[] = [];
      try {
        files = await fs.readdir(this.dir);
      } catch {
        return Succeed(true); // nothing uploaded yet
      }
      await Promise.all(
        files
          .filter((f) => f.startsWith(safePrefix))
          .map((f) => fs.rm(path.join(this.dir, f), { force: true })),
      );
      return Succeed(true);
    } catch (e) {
      return FAIL(`failed to delete local files: ${e.message}`, 500);
    }
  }

  async deleteFileByName(fileName: string): Promise<Resp<boolean>> {
    try {
      await fs.rm(path.join(this.dir, this.safeName(fileName)), { force: true });
      return Succeed(true);
    } catch (e) {
      return FAIL(`failed to delete local file: ${e.message}`, 500);
    }
  }
}
