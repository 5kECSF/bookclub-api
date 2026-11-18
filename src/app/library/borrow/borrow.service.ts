import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';

import {
  BookReturned,
  BookTaken,
  Borrow,
  BorrowAccept,
  BorrowDocument,
  BorrowStatus,
  OpenBorrowStatuses,
} from './entities/borrow.entity';

import { ACCOUNT_STATUS } from '@/app/account/profile/dto/profile.dto';
import { UserService } from '@/app/account/users';
import { NotificationEnum } from '@/app/extra/notification/entities/notification.entity';
import { NotificationService } from '@/app/extra/notification/notification.service';
import { Resp } from '@/common/constants/return.consts';
import { ItemStatus } from '@/common/types/enums';
import { MongoGenericRepository } from '@/providers/database/base/mongo.base.repo';
import mongoose, { ClientSession, Model } from 'mongoose';
import { BookService } from '../book/book.service';
import { DonationService, reject, runInTransaction } from '../donation/donation.service';
import { availableStatusFilter, bookStatus } from '../donation/entities/donation.entity';
import { CreateBorrowInput } from './entities/borrow.dto';

/** parses a date input, returns null for invalid values */
function toDate(value: unknown): Date | null {
  if (value === undefined || value === null || value === '') return null;
  const d = new Date(value as any);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Borrow workflow (state machine):
 *   WAITLIST --accept(instance)--> ACCEPTED --markTaken--> BORROWED --markReturned--> RETURNED
 *   WAITLIST --cancel (owner) / remove (admin)--> deleted
 *   ACCEPTED --remove (admin)--> deleted, the reserved copy is released
 */
@Injectable()
export class BorrowService extends MongoGenericRepository<Borrow> {
  constructor(
    @InjectModel(Borrow.name) private borrowModel: Model<BorrowDocument>,
    @InjectConnection() private readonly connection: mongoose.Connection,
    private readonly bookService: BookService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
    private readonly donationService: DonationService,
  ) {
    super(borrowModel);
  }

  private async getBorrowInState(
    id: string,
    expected: BorrowStatus,
    action: string,
    session: ClientSession,
  ): Promise<Borrow> {
    const borrow = await this.findById(id, session);
    if (!borrow.ok) reject(borrow.errMessage, borrow.code);
    if (borrow.body.status !== expected) {
      reject(
        `Can't ${action}: the borrow is ${borrow.body.status}, it must be ${expected}`,
        HttpStatus.CONFLICT,
      );
    }
    return borrow.body;
  }

  /** conditional update: fails with 409 if another request changed the status meanwhile */
  private async transition(
    id: string,
    from: BorrowStatus,
    update: Record<string, any>,
    session: ClientSession,
  ): Promise<Borrow> {
    const res = await this.findOneAndUpdate({ _id: id, status: from }, update, session);
    if (!res.ok) reject(`The borrow is no longer ${from}`, HttpStatus.CONFLICT);
    return res.body;
  }

  private async updateUser(userId: string, update: Record<string, any>, session: ClientSession) {
    const res = await this.userService.updateById(userId, update, session);
    if (!res.ok) reject(res.errMessage, res.code);
  }

  private async notify(userId: string, title: string, body: string, session: ClientSession) {
    const res = await this.notificationService.createOne(
      { title, body: body || title, type: NotificationEnum.Individual, userId },
      session,
    );
    if (!res.ok) reject(res.errMessage, res.code);
  }

  //a user requests to borrow a book
  async RequestBorrow(bookId: string, userId: string): Promise<Resp<Borrow>> {
    return runInTransaction(this.connection, async (session) => {
      const usr = await this.userService.findById(userId, session);
      if (!usr.ok) reject(usr.errMessage, HttpStatus.NOT_FOUND);
      if (usr.body.accountStatus != ACCOUNT_STATUS.ACTIVE)
        reject('Your Account is not Active', HttpStatus.FORBIDDEN);

      const book = await this.bookService.findById(bookId, session);
      if (!book.ok) reject(book.errMessage, HttpStatus.NOT_FOUND);
      if (book.body.status !== ItemStatus.Active)
        reject('This book is not available for borrowing', HttpStatus.BAD_REQUEST);

      // only one open (waitlisted/accepted/borrowed) borrow per user & book
      const open = await this.countDoc(
        { userId, bookId, status: { $in: OpenBorrowStatuses } },
        session,
      );
      if (!open.ok) reject(open.errMessage, open.code);
      if (open.body > 0)
        reject('You already have an open request for this book', HttpStatus.CONFLICT);

      const createDto: CreateBorrowInput = {
        status: BorrowStatus.WaitList,
        userId: userId,
        bookId: bookId,
        bookName: book.body.title,
        userName: `${usr.body.firstName} ${usr.body.lastName}`,
        // books without an image used to crash here
        imgUrl: book.body.upload?.url,
      };
      const resp = await this.createOne(createDto, session);
      if (!resp.ok) reject(resp.errMessage, resp.code);

      await this.updateUser(userId, { $addToSet: { requestedBooks: bookId } }, session);
      return resp.body;
    });
  }

  // the owner cancels his own WAITLIST request
  async cancleRequest(id: string, userId: string): Promise<Resp<Borrow>> {
    return runInTransaction(this.connection, async (session) => {
      const borrow = await this.findById(id, session);
      if (!borrow.ok || String(borrow.body.userId) !== String(userId))
        reject('Borrow request not found', HttpStatus.NOT_FOUND);
      if (borrow.body.status !== BorrowStatus.WaitList)
        reject(
          `Only waitlisted requests can be cancelled (this one is ${borrow.body.status})`,
          HttpStatus.CONFLICT,
        );

      const res = await this.findOneAndRemove(
        { _id: id, userId, status: BorrowStatus.WaitList },
        session,
      );
      if (!res.ok) reject('The request is no longer waitlisted', HttpStatus.CONFLICT);

      await this.updateUser(userId, { $pull: { requestedBooks: res.body.bookId } }, session);
      return res.body;
    });
  }

  /**
   * admin removes/rejects a borrow:
   * - WAITLIST: rejected, pulled from user.requestedBooks, user notified
   * - ACCEPTED: the reserved copy is released (AVAILABLE again), pulled from user.approvedBooks
   * - RETURNED: history record is deleted
   * - BORROWED: refused (mark it returned first)
   */
  async RemoveBorrow(id: string, note?: string): Promise<Resp<Borrow>> {
    return runInTransaction(this.connection, async (session) => {
      const borrow = await this.findById(id, session);
      if (!borrow.ok) reject(borrow.errMessage, borrow.code);
      const b = borrow.body;
      if (b.status === BorrowStatus.Borrowed)
        reject("A borrowed book can't be deleted, mark it as returned first", HttpStatus.CONFLICT);

      const res = await this.findOneAndRemove({ _id: id, status: b.status }, session);
      if (!res.ok) reject('The borrow changed meanwhile, try again', HttpStatus.CONFLICT);

      if (b.status === BorrowStatus.WaitList) {
        await this.updateUser(b.userId, { $pull: { requestedBooks: b.bookId } }, session);
        await this.notify(
          b.userId,
          `Your request to borrow ${b.bookName} has been rejected`,
          note,
          session,
        );
      } else if (b.status === BorrowStatus.Accepted) {
        if (b.instanceId) {
          const inst = await this.donationService.findOneAndUpdate(
            { _id: b.instanceId, status: bookStatus.Reserved },
            { status: bookStatus.Available, $unset: { borrowerId: 1, borrowerName: 1 } },
            session,
          );
          if (!inst.ok) reject(inst.errMessage, inst.code);
          await this.donationService.recomputeBookCounts(b.bookId, session);
        }
        await this.updateUser(b.userId, { $pull: { approvedBooks: b.bookId } }, session);
        await this.notify(
          b.userId,
          `Your reservation of ${b.bookName} has been cancelled`,
          note,
          session,
        );
      }
      return res.body;
    });
  }

  async AcceptBorrow(id: string, message: BorrowAccept): Promise<Resp<Borrow>> {
    return runInTransaction(this.connection, async (session) => {
      const borrow = await this.getBorrowInState(id, BorrowStatus.WaitList, 'accept', session);

      //Get the specific instance (donation / physical copy)
      if (!message?.instanceId) reject('instanceId is required', HttpStatus.BAD_REQUEST);
      const instance = await this.donationService.findById(message.instanceId, session);
      if (!instance.ok) reject(instance.errMessage, instance.code);
      if (String(instance.body.bookId) !== String(borrow.bookId))
        reject('The selected copy belongs to another book', HttpStatus.BAD_REQUEST);

      // reserve the copy, only if it is still available
      const instanceUpdate = await this.donationService.findOneAndUpdate(
        { _id: message.instanceId, status: availableStatusFilter },
        {
          status: bookStatus.Reserved,
          borrowerId: borrow.userId,
          borrowerName: borrow.userName,
        },
        session,
      );
      if (!instanceUpdate.ok)
        reject(
          `The selected copy is not available (it is ${instance.body.status})`,
          HttpStatus.CONFLICT,
        );

      //mark the request as accepted
      const update: Record<string, any> = {
        status: BorrowStatus.Accepted,
        instanceUid: instance.body.uid,
        instanceId: message.instanceId,
        acceptedDate: new Date(),
      };
      if (message.note) update.note = message.note;
      const accepted = await this.transition(id, BorrowStatus.WaitList, update, session);

      //update the books available count (it used to count Borrow documents)
      await this.donationService.recomputeBookCounts(accepted.bookId, session);

      await this.updateUser(
        accepted.userId,
        {
          $pull: { requestedBooks: accepted.bookId },
          $addToSet: { approvedBooks: accepted.bookId },
        },
        session,
      );
      await this.notify(
        accepted.userId,
        `Your request to borrow ${accepted.bookName} have been accepted`,
        message.note,
        session,
      );
      return accepted;
    });
  }

  async MarkTaken(id: string, body: BookTaken): Promise<Resp<Borrow>> {
    return runInTransaction(this.connection, async (session) => {
      const takenDate = body?.takenDate ? toDate(body.takenDate) : new Date();
      const dueDate = toDate(body?.dueDate);
      if (!takenDate) reject('takenDate is not a valid date', HttpStatus.BAD_REQUEST);
      if (!dueDate) reject('dueDate is required and must be a valid date', HttpStatus.BAD_REQUEST);
      if (dueDate <= takenDate) reject('dueDate must be after takenDate', HttpStatus.BAD_REQUEST);

      const borrow = await this.getBorrowInState(
        id,
        BorrowStatus.Accepted,
        'mark as taken',
        session,
      );

      const update: Record<string, any> = { status: BorrowStatus.Borrowed, takenDate, dueDate };
      if (body?.note) update.note = body.note;
      const taken = await this.transition(id, BorrowStatus.Accepted, update, session);

      //update the book instance
      const updateInstance = await this.donationService.updateById(
        borrow.instanceId,
        { status: bookStatus.Taken, borrowerId: borrow.userId, borrowerName: borrow.userName },
        session,
      );
      if (!updateInstance.ok) reject(updateInstance.errMessage, updateInstance.code);
      await this.donationService.recomputeBookCounts(borrow.bookId, session);

      //Update the users list of borrowed books
      await this.updateUser(
        taken.userId,
        {
          $pull: { approvedBooks: taken.bookId },
          $addToSet: { borrowedBooks: taken.bookId },
        },
        session,
      );
      await this.notify(
        taken.userId,
        `The book ${taken.bookName} is marked as taken by you`,
        `You have taken The book ${taken.bookName}, if it is a mistake, contact us`,
        session,
      );
      return taken;
    });
  }

  async MarkReturned(id: string, body: BookReturned): Promise<Resp<Borrow>> {
    return runInTransaction(this.connection, async (session) => {
      const returnedDate = body?.returnedDate ? toDate(body.returnedDate) : new Date();
      if (!returnedDate) reject('returnedDate is not a valid date', HttpStatus.BAD_REQUEST);

      const borrow = await this.getBorrowInState(
        id,
        BorrowStatus.Borrowed,
        'mark as returned',
        session,
      );
      const returned = await this.transition(
        id,
        BorrowStatus.Borrowed,
        { status: BorrowStatus.Returned, returnedDate },
        session,
      );

      const updateInstance = await this.donationService.updateById(
        borrow.instanceId,
        { status: bookStatus.Available, $unset: { borrowerId: 1, borrowerName: 1 } },
        session,
      );
      if (!updateInstance.ok) reject(updateInstance.errMessage, updateInstance.code);
      await this.donationService.recomputeBookCounts(borrow.bookId, session);

      await this.updateUser(
        returned.userId,
        {
          $pull: { borrowedBooks: returned.bookId },
          $addToSet: { returnedBooks: returned.bookId },
        },
        session,
      );
      await this.notify(
        returned.userId,
        `The book ${returned.bookName} is marked as Returned`,
        `You have Returned The book ${returned.bookName}, if it is a mistake, contact us`,
        session,
      );
      return returned;
    });
  }
}
