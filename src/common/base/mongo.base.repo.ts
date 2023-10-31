import { FilterQuery, Model, UpdateQuery } from 'mongoose';
// import { IGenericRepository } from './IGenericRepo';

import { pagiKeys, PaginationInputs } from '../common.types.dto';
import { ColorEnums, logTrace } from '../logger';
import { RemovedModel, UpdateResponse } from './mongo.entity';
import { FAIL, Resp, Succeed } from '../constants/return.consts';
import { ErrConst } from '../constants';
import { pickKeys, removeKeys } from '../util/util';

export class PaginatedResponse<T> {
  count: number;
  data: T[];
}

export abstract class MongoGenericRepository<T> {
  private _repository: Model<T>;
  private _populateOnFind: string[];

  protected constructor(repository: Model<T>, populateOnFind: string[] = []) {
    this._repository = repository;
    this._populateOnFind = populateOnFind;
  }

  public async filterManyAndPaginate(
    filter: FilterQuery<T>,
    pagination?: PaginationInputs,
  ): Promise<Resp<PaginatedResponse<T>>> {
    let items: T[] = [];
    // Always make default pagination = 25 with first page
    const limit = pagination?.limit || 25;
    const page = pagination?.page || 1;
    const sort = pagination?.sort || '_id';

    // logTrace('filter', filter);
    try {
      items = await this._repository
        .find(filter)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort(sort)
        .lean();

      const count = await this._repository.countDocuments(filter);

      // logTrace(`FINDMANY=====>>${count}`, items, ColorEnums.BgBlue);
      return Succeed({ count, data: items });
    } catch (e) {
      logTrace(`${this._repository.modelName}--findManyError=`, e.message, ColorEnums.FgRed);
      return FAIL(e.message);
    }
  }

  public async searchManyAndPaginate(
    fieldsToSearch: string[],
    filter: FilterQuery<T>,
    _pagination?: any,
    keysToRemove: string[] = [],
  ): Promise<Resp<PaginatedResponse<T>>> {
    try {
      const paginateQuery = pickKeys(filter, [...pagiKeys]);
      // logTrace('keys to remove', keysToRemove);
      const query = removeKeys(filter, [...pagiKeys, ...keysToRemove, 'searchText']);

      let mainQuery: Record<string, any> = {};
      // this adds text search capability
      if (filter.searchText) {
        const searchText = new RegExp(filter.searchText, 'i'); // Case-insensitive search
        mainQuery = {
          $or: fieldsToSearch.map((field) => ({ [field]: searchText })),
        };
      }

      Object.keys(query).forEach((key) => {
        mainQuery[key] = query[key];
      });

      //--- the above function with out text search

      let items: T[] = [];
      // Always make default pagination = 25 with first page
      const limit = paginateQuery?.limit || 25;
      const page = paginateQuery?.page || 1;
      const sort = paginateQuery?.sort || '_id';

      // logTrace('filter', filter);

      items = await this._repository
        .find(mainQuery)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort(sort)
        .lean();

      const count = await this._repository.countDocuments(mainQuery);
      // logTrace(`FINDMANY=====>>${count}`, items, ColorEnums.BgBlue);

      return Succeed({ count, data: items });
    } catch (e) {
      logTrace(`${this._repository.modelName}--findManyError=`, e.message, ColorEnums.FgRed);
      return FAIL(e.message);
    }
  }

  //-----  find One Query
  async findById(id: string): Promise<Resp<T>> {
    try {
      const item: T = await this._repository.findById(id).populate(this._populateOnFind).lean();
      // logTrace(`FINDOne=====>>`, item, ColorEnums.BgBlue);
      if (!item) return FAIL(`${ErrConst.NOT_FOUND} ${id}`, 404);
      return Succeed(item);
    } catch (e) {
      logTrace(`${this._repository.modelName}--FindByIdError=`, e.message, ColorEnums.FgRed);
      return FAIL(e.message, 500);
    }
  }

  public async findOne(where: FilterQuery<T>): Promise<Resp<T>> {
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
  async createOne(input: Partial<T>): Promise<Resp<T>> {
    try {
      const created: T = await this._repository.create({ ...input });

      return Succeed(created);
    } catch (e) {
      logTrace(`${this._repository.modelName}--CreateError =`, e.message, ColorEnums.FgRed);

      return FAIL(e.message, 400);
    }
  }

  // ====================  UPDATING QUERIES

  //Update queries & returns the updated document
  async updateById(_id: string, input: UpdateQuery<T>): Promise<Resp<T>> {
    try {
      const updated: T = await this._repository.findByIdAndUpdate(_id, input, { new: true }).lean();
      // logTrace('UPDATED ONE >===>> ', updated, ColorEnums.BgCyan);
      if (!updated) return FAIL(ErrConst.NOT_FOUND, 404);
      return Succeed(updated);
    } catch (e) {
      logTrace(`${this._repository.modelName}--UpdateByIdError =`, e.message, ColorEnums.FgRed);
      return FAIL(e.message);
    }
  }

  // UPSERTS and returns teh matched, modified , upserted count
  async upsertOne(filter: FilterQuery<T>, input: UpdateQuery<T>): Promise<Resp<UpdateResponse>> {
    try {
      const updated: UpdateResponse = await this._repository
        .updateOne(filter, input, { new: true, upsert: true })
        .lean();
      return Succeed(updated);
    } catch (e) {
      logTrace(`${this._repository.modelName}--updateOneError =`, e.message, ColorEnums.FgRed);
      return FAIL(e.message, 500);
    }
  }

  // Update and returns teh matched, modified , upserted count
  async updateOneAndReturnCount(filter: FilterQuery<T>, input: UpdateQuery<T>) {
    try {
      const updated: UpdateResponse = await this._repository.updateOne(filter, input).lean();
      return Succeed(updated);
    } catch (e) {
      logTrace(`${this._repository.modelName}--updateOneError =`, e.message, ColorEnums.FgRed);
      return FAIL(e.message);
    }
  }

  //Update and return the updated document
  async findOneAndUpdate(filter: FilterQuery<T>, input: UpdateQuery<T>): Promise<Resp<T>> {
    try {
      const updated: T = await this._repository.findOneAndUpdate(filter, input).lean();
      if (!updated) return FAIL(ErrConst.NOT_FOUND, 404);
      return Succeed(updated);
    } catch (e) {
      logTrace(`${this._repository.modelName}--updateOneError =`, e.message, ColorEnums.FgRed);
      return FAIL(e.message);
    }
  }

  public async updateMany(filter: FilterQuery<T>, input: UpdateQuery<T>) {
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
  public async findByIdAndDelete(_id: string): Promise<Resp<T>> {
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

  async deleteOne(filter: FilterQuery<T>): Promise<Resp<RemovedModel>> {
    try {
      const deleted: RemovedModel = await this._repository.deleteOne(filter);
      return Succeed(deleted);
    } catch (e) {
      logTrace(`${this._repository.modelName}--DeleteOneError =`, e.message, ColorEnums.FgRed);
      return FAIL(e.message);
    }
  }

  async findOneAndRemove(filter: FilterQuery<T>): Promise<Resp<T>> {
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
