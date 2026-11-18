import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as sharp from 'sharp';
import { ACCOUNT_STATUS } from '../../src/app/account/profile/dto/profile.dto';
import * as argon2 from 'argon2';
import { ItemStatus, RoleType } from '../../src/common/types/enums';
import type { FileServiceInterface } from '../../src/providers/upload/file-service.interface';

/**
 * NOTE: only plain values/types are imported from src/: the e2e server seeds an app booted from
 * the compiled dist/ build, where src/ classes would be different DI tokens.
 */
const FILE_SERVICE = 'FILE_SERVICE';

export const SEED_USERS = {
  admin: {
    email: 'admin@bookclub.test',
    password: 'Admin@1234',
    firstName: 'Ada',
    lastName: 'Admin',
    role: RoleType.ADMIN,
    active: true,
    accountStatus: ACCOUNT_STATUS.ACTIVE,
  },
  reader: {
    email: 'reader@bookclub.test',
    password: 'Reader@1234',
    firstName: 'Rita',
    lastName: 'Reader',
    role: RoleType.USER,
    active: true,
    accountStatus: ACCOUNT_STATUS.ACTIVE,
  },
  pending: {
    email: 'pending@bookclub.test',
    password: 'Pending@1234',
    firstName: 'Pete',
    lastName: 'Pending',
    role: RoleType.USER,
    active: true,
    accountStatus: ACCOUNT_STATUS.UN_APPROVED,
  },
};

export type SeedUserKey = keyof typeof SEED_USERS;

/** a small solid color PNG */
export function makePng(color = '#4f46e5', size = 32): Promise<Buffer> {
  return sharp({
    create: { width: size, height: size, channels: 3, background: color },
  })
    .png()
    .toBuffer();
}

export async function seedUsers(app: INestApplication) {
  const connection = app.get<Connection>(getConnectionToken());
  const ids: Record<SeedUserKey, string> = {} as any;
  for (const [key, u] of Object.entries(SEED_USERS)) {
    const { password, ...rest } = u;
    await connection.collection('users').updateOne(
      { email: u.email },
      {
        $set: {
          ...rest,
          fullName: `${u.firstName} ${u.lastName}`,
          password: await argon2.hash(password),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );
    const doc = await connection.collection('users').findOne({ email: u.email });
    ids[key as SeedUserKey] = doc._id.toString();
  }
  return ids;
}

const CATEGORIES = [
  { name: 'Fiction', desc: 'Novels and stories', color: '#e11d48' },
  { name: 'Christian Living', desc: 'Faith and practice', color: '#0891b2' },
];
const GENRES = [
  { name: 'Classic', categories: ['Fiction'], color: '#ca8a04' },
  { name: 'Mystery', categories: ['Fiction'], color: '#7c3aed' },
  { name: 'Devotional', categories: ['Christian Living'], color: '#16a34a' },
];

/** active categories & genres with a real image stored through the configured file service */
export async function seedTaxonomy(app: INestApplication) {
  const connection = app.get<Connection>(getConnectionToken());
  const files = app.get<FileServiceInterface>(FILE_SERVICE);
  const now = new Date();
  const make = async (prefix: string, name: string, color: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const fileName = `seed-${prefix}-${slug}.png`;
    const up = await files.UploadOne(fileName, await makePng(color, 64));
    return {
      slug: `seed_${prefix}_${slug}`,
      status: ItemStatus.Active,
      upload: up.ok ? { fileName, url: up.body.url, pathId: up.body.pathId } : undefined,
      count: 0,
      createdAt: now,
      updatedAt: now,
    };
  };
  for (const c of CATEGORIES) {
    await connection.collection('categories').updateOne(
      { name: c.name },
      {
        $set: { name: c.name, desc: c.desc, order: 10, ...(await make('ctg', c.name, c.color)) },
      },
      { upsert: true },
    );
  }
  for (const g of GENRES) {
    await connection.collection('genres').updateOne(
      { name: g.name },
      {
        $set: {
          name: g.name,
          categories: g.categories,
          category: g.categories[0],
          ...(await make('gnr', g.name, g.color)),
        },
      },
      { upsert: true },
    );
  }
  return { categories: CATEGORIES.map((c) => c.name), genres: GENRES.map((g) => g.name) };
}
