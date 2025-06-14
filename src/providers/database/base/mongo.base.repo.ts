import { ClientSession, FilterQuery, Model, UpdateQuery } from 'mongoose';
// import { IGenericRepository } from './IGenericRepo';
import { ErrConst } from '@/common/constants';
import { FAIL, Resp, Succeed } from '@/common/constants/return.consts';
import { ColorEnums, logTrace } from '@/common/logger';
import { pagiKeys, PaginatedRes } from '@/common/types/common.types.dto';
import { pickKeys } from '@/common/util/object-functions';
import { isEmpty } from 'class-validator';
import { RemovedModel, UpdateResponse } from './mongo.entity';

export abstract class MongoGenericRepository<T> {
  private _repository: Model<T>;
  private _populateOnFind: string[];

  protected constructor(repository: Model<T>, populateOnFind: string[] = []) {
    this._repository = repository;
    this._populateOnFind = populateOnFind;
  }

  // public async filterManyAndPaginate(
  //   filter: FilterQuery<T>,
  //   pagination?: PaginationInputs,
  // ): Promise<Resp<PaginatedRes<T>>> {
  //   let items: T[] = [];
  //   // Always make default pagination = 25 with first page
  //   const limit = pagination?.limit || 25;
  //   const page = pagination?.page || 1;
  //   const sort = pagination?.sort || '_id';

  //   // logTrace('filter', filter);
  //   try {
  //     items = await this._repository
  //       .find(filter)
  //       .skip((page - 1) * limit)
  //       .limit(limit)
  //       .sort(sort)
  //       .lean();

  //     const count = await this._repository.countDocuments(filter);

  //     // logTrace(`FINDMANY=====>>${count}`, items, ColorEnums.BgBlue);
  //     return Succeed({ count, body: items });
  //   } catch (e) {
  //     logTrace(`${this._repository.modelName}--findManyError=`, e.message, ColorEnums.FgRed);
  //     return FAIL(e.message);
  //   }
  // }

  public async searchManyAndPaginate(
    fieldsToSearch: (keyof T)[],
    filter: FilterQuery<T>,
    keysToFilter: (keyof T)[],
    additionalQuery: Record<string, any> = {},
  ): Promise<Resp<PaginatedRes<T>>> {
    try {
      const paginateQuery = pickKeys(filter, [...pagiKeys]);
      // logTrace('keys to remove', keysToRemove);
      const query = pickKeys(filter, [...(keysToFilter as string[])]);
      // logTrace('filter', filter);

      let mainQuery: Record<string, any> = additionalQuery;
      // this adds text search capability
      if (filter.q) {
        // const searchText = new RegExp(filter.searchText, 'i'); // Case-insensitive search
        // logTrace('searchTxt', searchText);
        mainQuery = {
          ...mainQuery,
          $or: fieldsToSearch.map((field) => ({
            [field]: { $regex: `${filter.q}`, $options: 'i' },
          })),
        };
      }
      // logTrace('query', mainQuery, filter.searchText);
      Object.keys(query).forEach((key) => {
        if (query[key]) {
          mainQuery[key] = query[key];
        }
      });
      //--- the above function with out text search

      let items: T[] = [];
      // Always make default pagination = 25 with first page
      const limit = parseInt(paginateQuery?.limit) || 25;
      const page = parseInt(paginateQuery?.page) || 1;
      const sort = paginateQuery?.sort || '_id';
      const sortDir = paginateQuery?._sortDir === 'desc' ? -1 : 1;

      // logTrace('main!', mainQuery);

      items = await this._repository
        .find(mainQuery)
        .skip((page - 1) * limit)
        .limit(limit + 1)
        .collation({ locale: 'en', strength: 2 })
        .sort({ [sort]: sortDir })
        .lean();
      let hasNext = false;
      if (items.length > limit) {
        hasNext = true;
        items.pop();
      }

      const count = await this._repository.countDocuments(mainQuery);
      // logTrace(`FINDMANY=====>>${count}`, items, ColorEnums.BgBlue);
      const response: PaginatedRes<T> = {
        body: items,
        count,
        hasNext,
        hasPrev: page > 1,
      };

      return Succeed(response);
    } catch (e) {
      logTrace(`${this._repository.modelName}--findManyError=`, e.message, ColorEnums.FgRed);
      return FAIL(e.message);
    }
  }

  async countDoc(filter: FilterQuery<T>, session?: ClientSession): Promise<Resp<number>> {
    const count = await this._repository.countDocuments(filter, { session });
    return Succeed(count);
  }

  //-----  find One Query
  async findById(id: string, session?: ClientSession): Promise<Resp<T>> {
    try {
      const item: T = await this._repository
        .findById(id)
        .session(session)
        .populate(this._populateOnFind)
        .lean();
      // logTrace(`FINDOne=====>>`, item, ColorEnums.BgBlue);
      if (!item) return FAIL(`${ErrConst.NOT_FOUND} ${id}`, 404);
      return Succeed(item);
    } catch (e) {
      logTrace(`${this._repository.modelName}--FindByIdError=`, e.message, ColorEnums.FgRed);
      return FAIL(e.message, 500);
    }
  }

  public async findOne(where: FilterQuery<T>, session?: ClientSession): Promise<Resp<T>> {
    try {
      const user: T = await this._repository.findOne(where).populate(this._populateOnFind).lean();
      if (!user) return FAIL(ErrConst.NOT_FOUND, 404);
      return Succeed(user);
    } catch (e) {
      logTrace(`${this._repository.modelName}--FindOneError=`, e.message, ColorEnums.FgRed);
      return FAIL(e.message, 500);
    }
  }

  //----- find many query
  async getAll(): Promise<Resp<T[]>> {
    try {
      const user: T[] = await this._repository.find().populate(this._populateOnFind).exec();

      return Succeed(user);
    } catch (e) {
      logTrace(`${this._repository.modelName}--find() error=`, e.message, ColorEnums.FgRed);
      return FAIL(e.message);
    }
  }

  //Create Query
  async createOne(input: Partial<T>, session?: ClientSession): Promise<Resp<T>> {
    try {
      const created: T[] = await this._repository.create([input], { session });

      return Succeed(created[0]);
    } catch (e) {
      if ('code' in e && e.code === 11000) {
        const field = Object.keys(e.keyValue)[0];
        const value = e.keyValue[field];
        const errMessage = `Duplicate key error: ${field} '${value}' already exists`;
        logTrace(`${this._repository.modelName}--UpdateOneError=`, errMessage, ColorEnums.FgRed);
        return FAIL(errMessage, 409);
      }
      // console.log(e);
      logTrace(`${this._repository.modelName}--CreateError =`, e.message, ColorEnums.FgRed);

      return FAIL(e.message, 400);
    }
  }

  // ====================  UPDATING QUERIES

  //Update queries & returns the updated document
  async updateById(_id: string, input: UpdateQuery<T>, session?: ClientSession): Promise<Resp<T>> {
    if (isEmpty(input)) {
      return FAIL('Empty object');
    }
    try {
      const updated: T = await this._repository
        .findByIdAndUpdate(_id, input, { new: true, session })
        .lean();
      // logTrace('UPDATED ONE >===>> ', updated, ColorEnums.BgCyan);
      if (!updated) return FAIL(ErrConst.NOT_FOUND, 404);
      return Succeed(updated);
    } catch (e) {
      if ('code' in e && e.code === 11000) {
        const field = Object.keys(e.keyValue)[0];
        const value = e.keyValue[field];
        const errMessage = `Duplicate key error: ${field} '${value}' already exists`;
        logTrace(`${this._repository.modelName}--UpdateOneError=`, errMessage, ColorEnums.FgRed);
        return FAIL(errMessage, 409);
      }
      logTrace(`${this._repository.modelName}--UpdateByIdError =`, e.message, ColorEnums.FgRed);
      return FAIL(e.message);
    }
  }

  // UPSERTS and returns teh matched, modified , upserted count
  async upsertOne(
    filter: FilterQuery<T>,
    input: UpdateQuery<T>,
    session?: ClientSession,
  ): Promise<Resp<UpdateResponse>> {
    try {
      const updated: UpdateResponse = await this._repository
        .updateOne(filter, input, { new: true, upsert: true, session })
        .lean();
      return Succeed(updated);
    } catch (e) {
      if ('code' in e && e.code === 11000) {
        const field = Object.keys(e.keyValue)[0];
        const value = e.keyValue[field];
        const errMessage = `Duplicate key error: ${field} '${value}' already exists`;
        logTrace(`${this._repository.modelName}--UpdateOneError=`, errMessage, ColorEnums.FgRed);
        return FAIL(errMessage, 409);
      }
      logTrace(`${this._repository.modelName}--updateOneError =`, e.message, ColorEnums.FgRed);
      return FAIL(e.message, 500);
    }
  }

  // Update and returns teh matched, modified , upserted count
  async updateOneAndReturnCount(
    filter: FilterQuery<T>,
    input: UpdateQuery<T>,
    session?: ClientSession,
  ) {
    try {
      const updated: UpdateResponse = await this._repository
        .updateOne(filter, input, { session })
        .lean();
      return Succeed(updated);
    } catch (e) {
      if ('code' in e && e.code === 11000) {
        const field = Object.keys(e.keyValue)[0];
        const value = e.keyValue[field];
        const errMessage = `Duplicate key error: ${field} '${value}' already exists`;
        logTrace(`${this._repository.modelName}--UpdateOneError=`, errMessage, ColorEnums.FgRed);
        return FAIL(errMessage, 409);
      }
      logTrace(`${this._repository.modelName}--updateOneError =`, e.message, ColorEnums.FgRed);
      return FAIL(e.message);
    }
  }

  //Update and return the updated document
  async findOneAndUpdate(
    filter: FilterQuery<T>,
    input: UpdateQuery<T>,
    session?: ClientSession,
  ): Promise<Resp<T>> {
    try {
      const updated: T = await this._repository.findOneAndUpdate(filter, input, { session }).lean();
      if (!updated) return FAIL(ErrConst.NOT_FOUND, 404);
      return Succeed(updated);
    } catch (e) {
      logTrace(`${this._repository.modelName}--updateOneError =`, e.message, ColorEnums.FgRed);
      return FAIL(e.message);
    }
  }

  public async updateMany(filter: FilterQuery<T>, input: UpdateQuery<T>, session?: ClientSession) {
    try {
      const updated: UpdateResponse = await this._repository
        .updateMany(filter, input, { new: true })
        .lean();
      return Succeed(updated);
    } catch (e) {
      logTrace(`${this._repository.modelName}--UpdateManyError =`, e.message, ColorEnums.FgRed);
      return FAIL(e.message);
    }
  }

  // ====================  Delete QUERIES
  public async findByIdAndDelete(_id: string, session?: ClientSession): Promise<Resp<T>> {
    try {
      if (!_id) return FAIL('Id Is Required', 400);
      const deleted: T = await this._repository.findByIdAndDelete(_id).lean();
      if (!deleted) return FAIL(ErrConst.NOT_FOUND, 404);
      // logTrace('Deleted ONE >===>> ', deleted, ColorEnums.BgMagenta);

      return Succeed(deleted);
    } catch (e) {
      logTrace(`${this._repository.modelName}--DeleteByIdError =`, e.message, ColorEnums.FgRed);
      return FAIL(e.message, 500);
    }
  }

  async deleteOne(filter: FilterQuery<T>, session?: ClientSession): Promise<Resp<RemovedModel>> {
    try {
      const deleted: RemovedModel = await this._repository.deleteOne(filter);
      return Succeed(deleted);
    } catch (e) {
      logTrace(`${this._repository.modelName}--DeleteOneError =`, e.message, ColorEnums.FgRed);
      return FAIL(e.message);
    }
  }

  async findOneAndRemove(filter: FilterQuery<T>, session?: ClientSession): Promise<Resp<T>> {
    try {
      const deleted = await this._repository.findOneAndRemove(filter);
      if (!deleted) return FAIL(ErrConst.NOT_FOUND, 404);
      return Succeed(deleted);
    } catch (e) {
      logTrace(`${this._repository.modelName}--DeleteOneError =`, e.message, ColorEnums.FgRed);
      return FAIL(e.message);
    }
  }

  public async deleteMany(filter: FilterQuery<T>): Promise<Resp<RemovedModel>> {
    try {
      const deleted: RemovedModel = await this._repository.deleteMany(filter);
      return Succeed(deleted);
    } catch (e) {
      logTrace(`${this._repository.modelName}--DeleteManyError =`, e.message, ColorEnums.FgRed);
      return FAIL(e.message);
    }
  }
}
