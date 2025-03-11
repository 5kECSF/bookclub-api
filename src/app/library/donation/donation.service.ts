import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Donation, DonationDocument } from './entities/donation.entity';

import { UserService } from '@/app/account/users';
import { FAIL, Resp, Succeed } from '@/common/constants/return.consts';
import { InjectConnection } from '@nestjs/mongoose';

import { Connection, Model } from 'mongoose';
import { MongoGenericRepository } from '../../../providers/database/base/mongo.base.repo';
import { BookService } from '../book/book.service';
import { CreateDonationInput } from './entities/donation.dto';

@Injectable()
export class DonationService extends MongoGenericRepository<Donation> {
  constructor(
    @InjectModel(Donation.name) private questionModel: Model<DonationDocument>,
    private readonly bookService: BookService,
    @InjectConnection() private readonly connection: Connection,
    private readonly userService: UserService,
  ) {
    super(questionModel);
  }

  public async CreateDonation(createDto: CreateDonationInput): Promise<Resp<Donation>> {
    const session = await this.connection.startSession();
    try {
      let result: Donation;
      await session.withTransaction(
        async () => {
          const usr = await this.userService.findById(createDto.donorId, session);
          if (!usr.ok) return Promise.reject(FAIL(usr.errMessage, usr.code));

          const book = await this.bookService.findById(createDto.bookId, session);
          if (!book.ok) return Promise.reject(FAIL(book.errMessage, book.code));

          createDto.donorName = `${usr.body.firstName} ${usr.body.lastName}`;
          createDto.instanceNo = (book.body.instanceCnt || 0) + 1;
          createDto.bookName = book.body.title;
          createDto.bookImg = book.body.upload;
          if (book.body.uid) createDto.uid = `${book.body.uid}-${createDto.instanceNo}`;

          //resp here

          //update the books instanceCnt
          const instanceCnt = await this.countDoc({ bookId: createDto.bookId });
          if (!instanceCnt.ok)
            return Promise.reject(FAIL(instanceCnt.errMessage, instanceCnt.code));

          const updateBookCnt = await this.bookService.updateOneAndReturnCount(
            { _id: createDto.bookId },
            { instanceCnt: instanceCnt.body, availableCnt: book.body.availableCnt + 1 },
            session,
          );
          if (!updateBookCnt.ok)
            return Promise.reject(FAIL(updateBookCnt.errMessage, updateBookCnt.code));

          const resp = await this.createOne(createDto, session);
          if (!resp.ok) return Promise.reject(FAIL(resp.errMessage, resp.code));

          //Update the users donation cnt
          const dontedCnt = await this.countDoc({ donorId: createDto.donorId });
          if (!dontedCnt.ok) throw new HttpException(dontedCnt.errMessage, dontedCnt.code);
          const DonorCnt = await this.userService.updateOneAndReturnCount(
            { _id: createDto.donorId },
            { donatedCount: dontedCnt.body },
            session,
          );
          if (!DonorCnt.ok) return Promise.reject(FAIL(DonorCnt.errMessage, DonorCnt.code));
          result = resp.body;
        },
        {
          readConcern: { level: 'snapshot' },
          writeConcern: { w: 'majority' },
          maxTimeMS: 5000,
        },
      );

      return Succeed(result);
    } catch (error: any) {
      // Catch the rejected Promise and return the error response
      if (error instanceof Error) {
        return FAIL(error?.message, 500); // Type assertion since we know it's a Resp<T>
      }
      if (error && 'ok' in error && error.ok === false) {
        return error as Resp<Donation>;
      }
      // Handle unexpected errors (e.g., database connection issues)
      return FAIL('An unexpected error occurred during the transaction', 500);
    } finally {
      await session.endSession();
    }
  }
}
