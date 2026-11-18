import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';

import {
  availableStatusFilter,
  bookStatus,
  Donation,
  DonationDocument,
} from './entities/donation.entity';

import { UserService } from '@/app/account/users';
import { FAIL, Resp, Succeed } from '@/common/constants/return.consts';

import { ClientSession, Connection, Model } from 'mongoose';
import { MongoGenericRepository } from '../../../providers/database/base/mongo.base.repo';
import { BookService } from '../book/book.service';
import { CreateDonationInput, UpdateDonationDto } from './entities/donation.dto';

const LockedStatuses: bookStatus[] = [bookStatus.Reserved, bookStatus.Taken];

/** runs `fn` inside a transaction, rejected `Resp`s are returned as is */
export async function runInTransaction<T>(
  connection: Connection,
  fn: (session: ClientSession) => Promise<T>,
): Promise<Resp<T>> {
  const session = await connection.startSession();
  try {
    let result: T;
    await session.withTransaction(
      async () => {
        result = await fn(session);
      },
      {
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' },
        maxTimeMS: 5000,
      },
    );
    return Succeed(result);
  } catch (e: any) {
    if (e && typeof e === 'object' && 'ok' in e && e.ok === false) return e as Resp<T>;
    return FAIL(e?.message || 'An unexpected error occurred during the transaction', 500);
  } finally {
    await session.endSession();
  }
}

/** throws a FAIL response (to be caught by runInTransaction) */
export function reject(message: string, code = 400): never {
  throw FAIL(message, code);
}

@Injectable()
export class DonationService extends MongoGenericRepository<Donation> {
  constructor(
    @InjectModel(Donation.name) private donationModel: Model<DonationDocument>,
    @Inject(forwardRef(() => BookService))
    private readonly bookService: BookService,
    @InjectConnection() private readonly connection: Connection,
    private readonly userService: UserService,
  ) {
    super(donationModel);
  }

  /** recompute book.instanceCnt & book.availableCnt from the donation collection */
  async recomputeBookCounts(bookId: string, session?: ClientSession): Promise<void> {
    if (!bookId) return;
    // sequential: a session/transaction can't run concurrent operations
    const instanceCnt = await this.countDoc({ bookId }, session);
    const availableCnt = await this.countDoc({ bookId, status: availableStatusFilter }, session);
    if (!instanceCnt.ok) reject(instanceCnt.errMessage, instanceCnt.code);
    if (!availableCnt.ok) reject(availableCnt.errMessage, availableCnt.code);
    const upd = await this.bookService.updateOneAndReturnCount(
      { _id: bookId },
      { instanceCnt: instanceCnt.body, availableCnt: availableCnt.body },
      session,
    );
    if (!upd.ok) reject(upd.errMessage, upd.code);
  }

  /** recompute user.donatedCount from the donation collection */
  async recomputeDonorCount(donorId: string, session?: ClientSession): Promise<void> {
    if (!donorId) return;
    const cnt = await this.countDoc({ donorId }, session);
    if (!cnt.ok) reject(cnt.errMessage, cnt.code);
    const upd = await this.userService.updateOneAndReturnCount(
      { _id: donorId },
      { donatedCount: cnt.body },
      session,
    );
    if (!upd.ok) reject(upd.errMessage, upd.code);
  }

  public async CreateDonation(createDto: CreateDonationInput): Promise<Resp<Donation>> {
    return runInTransaction(this.connection, async (session) => {
      if (LockedStatuses.includes(createDto.status)) {
        reject(`A new copy can't be ${createDto.status}`, 400);
      }
      const usr = await this.userService.findById(createDto.donorId, session);
      if (!usr.ok) reject(usr.errMessage, usr.code);

      const book = await this.bookService.findById(createDto.bookId, session);
      if (!book.ok) reject(book.errMessage, book.code);

      // instance numbers keep growing even after deletions (count+1 could collide on `uid`)
      const last = await this.donationModel
        .findOne({ bookId: createDto.bookId })
        .sort({ instanceNo: -1 })
        .session(session)
        .lean();
      const instanceNo = (last?.instanceNo || 0) + 1;

      const data: Partial<Donation> = {
        bookId: createDto.bookId,
        donorId: createDto.donorId,
        note: createDto.note,
        donatedDate: createDto.donatedDate,
        status: createDto.status || bookStatus.Available,
        donorName: `${usr.body.firstName} ${usr.body.lastName}`,
        bookName: book.body.title,
        // books without an image used to crash here
        imgUrl: book.body.upload?.url || createDto.imgUrl,
        instanceNo,
        uid: book.body.uid ? `${book.body.uid}-${instanceNo}` : undefined,
      };
      Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

      const resp = await this.createOne(data, session);
      if (!resp.ok) reject(resp.errMessage, resp.code);

      await this.recomputeBookCounts(createDto.bookId, session);
      await this.recomputeDonorCount(createDto.donorId, session);
      return resp.body;
    });
  }

  public async UpdateDonation(id: string, dto: UpdateDonationDto): Promise<Resp<Donation>> {
    return runInTransaction(this.connection, async (session) => {
      const old = await this.findById(id, session);
      if (!old.ok) reject(old.errMessage, old.code);

      // RESERVED/TAKEN are owned by the borrow workflow
      const isLocked = LockedStatuses.includes(old.body.status);
      if (dto.status && dto.status !== old.body.status) {
        if (isLocked || LockedStatuses.includes(dto.status)) {
          reject('RESERVED/TAKEN status is managed by the borrow workflow', 409);
        }
      }
      if (isLocked && dto.bookId && dto.bookId !== old.body.bookId) {
        reject("A reserved/taken copy can't be moved to another book", 409);
      }
      const update: Partial<Donation> = {};
      for (const key of ['note', 'donatedDate', 'status'] as const) {
        if (dto[key] !== undefined) (update as any)[key] = dto[key];
      }
      if (dto.bookId && dto.bookId !== old.body.bookId) {
        const book = await this.bookService.findById(dto.bookId, session);
        if (!book.ok) reject(book.errMessage, book.code);
        update.bookId = dto.bookId;
        update.bookName = book.body.title;
        update.imgUrl = book.body.upload?.url;
      }
      if (dto.donorId && dto.donorId !== old.body.donorId) {
        const usr = await this.userService.findById(dto.donorId, session);
        if (!usr.ok) reject(usr.errMessage, usr.code);
        update.donorId = dto.donorId;
        update.donorName = `${usr.body.firstName} ${usr.body.lastName}`;
      }
      if (Object.keys(update).length === 0) reject('Nothing to update', 400);

      const res = await this.findOneAndUpdate({ _id: id }, update, session);
      if (!res.ok) reject(res.errMessage, res.code);

      // keep book & donor counters in sync (status, book or donor may have changed)
      await this.recomputeBookCounts(old.body.bookId, session);
      if (res.body.bookId !== old.body.bookId)
        await this.recomputeBookCounts(res.body.bookId, session);
      if (res.body.donorId !== old.body.donorId) {
        await this.recomputeDonorCount(old.body.donorId, session);
        await this.recomputeDonorCount(res.body.donorId, session);
      }
      return res.body;
    });
  }

  public async RemoveDonation(id: string): Promise<Resp<Donation>> {
    return runInTransaction(this.connection, async (session) => {
      const existing = await this.findById(id, session);
      if (!existing.ok) reject(existing.errMessage, existing.code);
      if (LockedStatuses.includes(existing.body.status)) {
        reject(`This copy is ${existing.body.status} by a borrower and can't be deleted`, 409);
      }
      const res = await this.findOneAndRemove({ _id: id }, session);
      if (!res.ok) reject(res.errMessage, res.code);
      await this.recomputeBookCounts(res.body.bookId, session);
      await this.recomputeDonorCount(res.body.donorId, session);
      return res.body;
    });
  }
}
