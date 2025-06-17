import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';

import {
  BookReturned,
  BookTaken,
  Borrow,
  BorrowAccept,
  BorrowDocument,
  BorrowStatus,
} from './entities/borrow.entity';

import { UserService } from '@/app/account/users';
import { NotificationEnum } from '@/app/extra/notification/entities/notification.entity';
import { NotificationService } from '@/app/extra/notification/notification.service';
import { errCode } from '@/common/constants/response.consts';
import { FAIL, Resp, Succeed } from '@/common/constants/return.consts';
import { MongoGenericRepository } from '@/providers/database/base/mongo.base.repo';
import mongoose, { Model } from 'mongoose';
import { BookService } from '../book/book.service';
import { DonationService } from '../donation/donation.service';
import { bookStatus } from '../donation/entities/donation.entity';
import { CreateBorrowInput } from './entities/borrow.dto';

@Injectable()
export class BorrowService extends MongoGenericRepository<Borrow> {
  constructor(
    @InjectModel(Borrow.name) private tagModel: Model<BorrowDocument>,
    @InjectConnection() private readonly connection: mongoose.Connection,
    private readonly bookService: BookService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
    private readonly donationService: DonationService,
  ) {
    super(tagModel);
  }

  //accept a users request to borrow
  async RequestBorrow(id: string, userId: string): Promise<Resp<Borrow>> {
    const session = await this.connection.startSession();
    try {
      let result: Borrow;
      await session.withTransaction(
        async () => {
          const usr = await this.userService.findById(userId);
          if (!usr.ok) Promise.reject(FAIL(usr.errMessage, errCode.USER_NOT_FOUND));
          const book = await this.bookService.findById(id);
          if (!book.ok) Promise.reject(FAIL(usr.errMessage, errCode.NOT_FOUND));
          const createDto: CreateBorrowInput = {
            status: BorrowStatus.WaitList,
            userId: userId,
            bookId: id,
            bookName: book.body.title,
            userName: `${usr.body.firstName} ${usr.body.lastName}`,
            imgUrl: book.body.upload.url,
          };
          const resp = await this.createOne(createDto, session);
          if (!resp.ok) Promise.reject(FAIL(resp.errMessage, resp.code));

          const userUpdate = await this.userService.updateById(
            resp.body.userId,
            {
              $addToSet: { requestedBooks: id },
            },
            session,
          );
          if (!userUpdate.ok) return Promise.reject(FAIL(userUpdate.errMessage, userUpdate.code));

          result = resp.body;
        },
        {
          readConcern: { level: 'snapshot' },
          writeConcern: { w: 'majority' },
          maxTimeMS: 5000,
        },
      );
      return Succeed(result);
    } catch (e: any) {
      if (e instanceof Error) {
        return FAIL(e?.message, 500); // Type assertion since we know it's a Resp<T>
      }
      if (e && 'ok' in e && e.ok === false) {
        return e as Resp<Borrow>;
      }
      // Handle unexpected errors (e.g., database connection issues)
      return FAIL('An unexpected error occurred during the transaction', 500);
    } finally {
      await session.endSession();
    }
  }

  async cancleRequest(id: string, userId: string): Promise<Resp<Borrow>> {
    const session = await this.connection.startSession();
    try {
      let result: Borrow;
      await session.withTransaction(
        async () => {
          const res = await this.findOneAndRemove(
            {
              userId: userId,
              _id: id,
              status: BorrowStatus.WaitList,
            },
            session,
          );
          if (!res.ok) return Promise.reject(FAIL(res.errMessage, res.code));

          const userUpdate = await this.userService.updateById(
            res.body.userId,
            {
              $pull: { requestedBooks: res.body.bookId },
            },
            session,
          );
          if (!userUpdate.ok) return Promise.reject(FAIL(userUpdate.errMessage, userUpdate.code));

          result = res.body;
        },
        {
          readConcern: { level: 'snapshot' },
          writeConcern: { w: 'majority' },
          maxTimeMS: 5000,
        },
      );
      return Succeed(result);
    } catch (e: any) {
      if (e instanceof Error) {
        return FAIL(e?.message, 500); // Type assertion since we know it's a Resp<T>
      }
      if (e && 'ok' in e && e.ok === false) {
        return e as Resp<Borrow>;
      }
      // Handle unexpected errors (e.g., database connection issues)
      return FAIL('An unexpected error occurred during the transaction', 500);
    } finally {
      await session.endSession();
    }
  }

  async AcceptBorrow(id: string, message: BorrowAccept): Promise<Resp<Borrow>> {
    const session = await this.connection.startSession();
    try {
      let result: Borrow;
      await session.withTransaction(
        async () => {
          //Get the specific instance
          const instance = await this.donationService.findById(message.instanceId, session);
          if (!instance.ok) return Promise.reject(FAIL(instance.errMessage, instance.code));
          //mark the request as accepted
          const resp = await this.updateById(
            id,
            {
              status: BorrowStatus.Accepted,
              instanceUid: instance.body.uid,
              instanceId: message.instanceId,
              acceptedDate: new Date(),
            },
            session,
          );
          if (!resp.ok) return Promise.reject(FAIL(resp.errMessage, resp.code));
          /**
           * ======  mark the instance book as reserved and update the id of the user who have taken it
           */
          const instanceUpdate = await this.donationService.updateById(message.instanceId, {
            status: bookStatus.Reserved,
            borrowerId: resp.body.userId,
            borrowerName: resp.body.userName,
          });
          if (!instanceUpdate.ok)
            return Promise.reject(FAIL(instanceUpdate.errMessage, instanceUpdate.code));
          //count the available items for this book
          const instanceCnt = await this.countDoc(
            {
              bookId: resp.body.bookId,
              status: bookStatus.Available,
            },
            session,
          );
          if (!instanceCnt.ok)
            return Promise.reject(FAIL(instanceCnt.errMessage, instanceCnt.code));
          //update the books available items
          const bookUpdate = await this.bookService.updateById(
            resp.body.bookId,
            {
              availableCnt: instanceCnt.body,
            },
            session,
          );
          if (!bookUpdate.ok) Promise.reject(FAIL(bookUpdate.errMessage, bookUpdate.code));
          //update the users requested and accepted books
          const userUpdate = await this.userService.updateById(
            resp.body.userId,
            {
              $pull: { requestedBooks: resp.body.bookId },
              $addToSet: { approvedBooks: resp.body.bookId },
            },
            session,
          );
          if (!userUpdate.ok) return Promise.reject(FAIL(userUpdate.errMessage, userUpdate.code));

          await this.notificationService.createOne({
            title: `Your request to borrow ${resp.body.bookName} have been accepted`,
            body: message.note,
            type: NotificationEnum.Individual,
            userId: resp.body.userId,
          });
          //TODO: add email notifications

          result = resp.body;
        },
        {
          readConcern: { level: 'snapshot' },
          writeConcern: { w: 'majority' },
          maxTimeMS: 5000,
        },
      );
      return Succeed(result);
    } catch (e: any) {
      if (e instanceof Error) {
        return FAIL(e?.message, 500); // Type assertion since we know it's a Resp<T>
      }
      if (e && 'ok' in e && e.ok === false) {
        return e as Resp<Borrow>;
      }
      // Handle unexpected errors (e.g., database connection issues)
      return FAIL('An unexpected error occurred during the transaction', 500);
    } finally {
      await session.endSession();
    }
  }

  async MarkTaken(id: string, body: BookTaken): Promise<Resp<Borrow>> {
    const session = await this.connection.startSession();
    try {
      let result: Borrow;
      await session.withTransaction(
        async () => {
          //update the borrow model
          const resp = await this.updateById(
            id,
            {
              status: BorrowStatus.Borrowed,
              takenDate: body.takenDate,
              dueDate: body.dueDate,
              note: body.note,
            },
            session,
          );
          if (!resp.ok) return Promise.reject(FAIL(resp.errMessage, resp.code));
          //update the book instance
          const updateInstance = await this.donationService.updateById(
            resp.body.instanceId,
            {
              status: bookStatus.Taken,
            },
            session,
          );
          if (!updateInstance.ok)
            return Promise.reject(FAIL(updateInstance.errMessage, updateInstance.code));
          //Update the users list of borrowed books
          const userUpdate = await this.userService.updateById(
            resp.body.userId,
            {
              $pull: { approvedBooks: resp.body.bookId },
              $addToSet: { borrowedBooks: resp.body.bookId },
            },
            session,
          );
          if (!userUpdate.ok) return Promise.reject(FAIL(userUpdate.errMessage, userUpdate.code));
          await this.notificationService.createOne({
            title: `The book ${resp.body.bookName} is marked as taken by you`,
            body: `You have taken The book ${resp.body.bookName}, if it is a mistake, contact us`,
            type: NotificationEnum.Individual,
            userId: resp.body.userId,
          });
          //TODO: add email notifications

          result = resp.body;
        },
        {
          readConcern: { level: 'snapshot' },
          writeConcern: { w: 'majority' },
          maxTimeMS: 5000,
        },
      );
      return Succeed(result);
    } catch (e: any) {
      if (e instanceof Error) {
        return FAIL(e?.message, 500); // Type assertion since we know it's a Resp<T>
      }
      if (e && 'ok' in e && e.ok === false) {
        return e as Resp<Borrow>;
      }
      // Handle unexpected errors (e.g., database connection issues)
      return FAIL('An unexpected error occurred during the transaction', 500);
    } finally {
      await session.endSession();
    }
  }

  async MarkReturned(id: string, body: BookReturned): Promise<Resp<Borrow>> {
    const session = await this.connection.startSession();
    try {
      let result: Borrow;
      await session.withTransaction(
        async () => {
          const resp = await this.updateById(
            id,
            {
              status: BorrowStatus.Returned,
              returnedDate: body.returnedDate,
            },
            session,
          );
          if (!resp.ok) return Promise.reject(FAIL(resp.errMessage, resp.code));

          const updateInstance = await this.donationService.updateById(
            resp.body.instanceId,
            {
              status: bookStatus.Available,
            },
            session,
          );
          if (!updateInstance.ok)
            return Promise.reject(FAIL(updateInstance.errMessage, updateInstance.code));

          const instanceCnt = await this.donationService.countDoc(
            {
              bookId: resp.body.bookId,
              status: bookStatus.Available,
            },
            session,
          );
          if (!instanceCnt.ok)
            return Promise.reject(FAIL(instanceCnt.errMessage, instanceCnt.code));
          const updateBook = await this.bookService.updateById(
            resp.body.bookId,
            {
              availableCnt: instanceCnt.body,
            },
            session,
          );
          if (!updateBook.ok) return Promise.reject(FAIL(updateBook.errMessage, updateBook.code));
          const userUpdate = await this.userService.updateById(
            resp.body.userId,
            {
              $pull: { borrowedBooks: resp.body.bookId },
              $addToSet: { returnedBooks: resp.body.bookId },
            },
            session,
          );
          if (!userUpdate.ok) return Promise.reject(FAIL(userUpdate.errMessage, userUpdate.code));

          result = resp.body;
        },
        {
          readConcern: { level: 'snapshot' },
          writeConcern: { w: 'majority' },
          maxTimeMS: 5000,
        },
      );
      await this.notificationService.createOne({
        title: `The book ${result.bookName} is marked as Returned`,
        body: `You have Returned The book ${result.bookName}, if it is a mistake, contact us`,
        type: NotificationEnum.Individual,
        userId: result.userId,
      });
      return Succeed(result);
    } catch (e: any) {
      if (e instanceof Error) {
        return FAIL(e?.message, 500); // Type assertion since we know it's a Resp<T>
      }
      if (e && 'ok' in e && e.ok === false) {
        return e as Resp<Borrow>;
      }
      // Handle unexpected errors (e.g., database connection issues)
      return FAIL('An unexpected error occurred during the transaction', 500);
    } finally {
      await session.endSession();
    }
  }
}
