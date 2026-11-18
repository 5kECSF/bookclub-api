import { ClientSession, FilterQuery, Model, UpdateQuery } from 'mongoose';
// import { IGenericRepository } from './IGenericRepo';
import { ErrConst } from '@/common/constants';
import { FAIL, Resp, Succeed } from '@/common/constants/return.consts';
import { ColorEnums, logTrace } from '@/common/logger';
import { pagiKeys, PaginatedRes } from '@/common/types/common.types.dto';
import { pickKeys } from '@/common/util/object-functions';
import { isEmpty } from 'class-validator';
import { RemovedModel, UpdateResponse } from './mongo.entity';

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
      // 1. pick the keys that are alowed to be directly filtered in
      const query = pickKeys(filter, [...(keysToFilter as string[])]);

      //2. use a copy of the additional query as a starting point
      const mainQuery: Record<string, any> = { ...additionalQuery };
      //3. if there is a search query adds text search capability
      if (filter.q) {
        const searchOr = fieldsToSearch.map((field) => ({
          [field]: { $regex: escapeRegex(`${filter.q}`), $options: 'i' },
        }));
        // never overwrite an `$or` coming from the additional (scoping) query
        if (mainQuery.$or) {
          mainQuery.$and = [...(mainQuery.$and || []), { $or: searchOr }];
        } else {
          mainQuery.$or = searchOr;
        }
      }
      // 4. for each direct filter query add it to the main query
      Object.keys(query).forEach((key) => {
        // keys already constrained by the additional (scoping) query can't be overridden by users
        // explicit `false` (parsed boolean query params) is a valid filter value
        if ((query[key] || query[key] === false) && !(key in additionalQuery)) {
          mainQuery[key] = query[key];
        }
      });
      //--- the above function with out text search

      let items: T[] = [];
      //6. setup limit, page, sort & sortdir
      //6.1 Always make default pagination = 25 with first page
      const limit = parseInt(paginateQuery?.limit) || 25;
      const page = parseInt(paginateQuery?.page) || 1;
      const sort = paginateQuery?.sort || '_id';
      const sortDir = paginateQuery?._sortDir === 'desc' ? -1 : 1;
      const skip = (page - 1) * limit;

      //7. perform the query, with limit +1
      items = await this._repository
        .find(mainQuery)
        .skip(skip)
        .limit(limit + 1)
        .collation({ locale: 'en', strength: 2 })
        .sort({ [sort]: sortDir, _id: -1 })
        .lean();

      //if len(result) is greater than the query pop the last element and make hasNext true
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
    try {
      const count = await this._repository.countDocuments(filter, { session });
      return Succeed(count);
    } catch (e) {
      logTrace(`${this._repository.modelName}--countError=`, e.message, ColorEnums.FgRed, 3);
      return FAIL(e.message, 500);
    }
  }

  //-----  find One Query
  async findById(id: string, session?: ClientSession): Promise<Resp<T>> {
    try {
      const item: T = await this._repository
        .findById(id)
        .session(session || null)
        .populate(this._populateOnFind)
        .lean();
      // logTrace(`FINDOne=====>>`, item, ColorEnums.BgBlue);
      if (!item) return FAIL(`${ErrConst.NOT_FOUND} ${id}`, 404);
      return Succeed(item);
    } catch (e) {
      logTrace(`${this._repository.modelName}--FindByIdError=`, e.message, ColorEnums.FgRed, 3);
      return FAIL(e.message, 500);
    }
  }

  public async findOne(where: FilterQuery<T>, session?: ClientSession): Promise<Resp<T>> {
    try {
      const user: T = await this._repository
        .findOne(where)
        .session(session || null)
        .populate(this._populateOnFind)
        .lean();
      if (!user) return FAIL(ErrConst.NOT_FOUND, 404);
      return Succeed(user);
    } catch (e) {
      logTrace(`${this._repository.modelName}--FindOneError=`, e.message, ColorEnums.FgRed, 3);
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
        .updateOne(filter, input, { upsert: true, session })
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
      const updated: T = await this._repository
        .findOneAndUpdate(filter, input, { new: true, session })
        .lean();
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
        .updateMany(filter, input, { session })
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
      const deleted: T = await this._repository.findByIdAndDelete(_id, { session }).lean();
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
      const deleted: RemovedModel = await this._repository.deleteOne(filter, { session });
      return Succeed(deleted);
    } catch (e) {
      logTrace(`${this._repository.modelName}--DeleteOneError =`, e.message, ColorEnums.FgRed);
      return FAIL(e.message);
    }
  }

  async findOneAndRemove(filter: FilterQuery<T>, session?: ClientSession): Promise<Resp<T>> {
    try {
      const deleted = (await this._repository.findOneAndDelete(filter, { session }).lean()) as T;
      if (!deleted) return FAIL(ErrConst.NOT_FOUND, 404);
      return Succeed(deleted);
    } catch (e) {
      logTrace(`${this._repository.modelName}--DeleteOneError =`, e.message, ColorEnums.FgRed);
      return FAIL(e.message);
    }
  }

  public async deleteMany(
    filter: FilterQuery<T>,
    session?: ClientSession,
  ): Promise<Resp<RemovedModel>> {
    try {
      const deleted: RemovedModel = await this._repository.deleteMany(filter, { session });
      return Succeed(deleted);
    } catch (e) {
      logTrace(`${this._repository.modelName}--DeleteManyError =`, e.message, ColorEnums.FgRed);
      return FAIL(e.message);
    }
  }
}
