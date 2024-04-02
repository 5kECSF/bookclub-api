import { ObjectId } from 'mongoose';

export type UpdateResponse = {
  matchedCount: number;
  modifiedCount: number;
  acknowledged: boolean;
  upsertedId: unknown | ObjectId;
  upsertedCount: number;
};

export type RemovedModel = {
  deletedCount: number;
  acknowledged: boolean;
};

export type CreatedModel = {
  id: string;
  created: boolean;
};
