import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

export type SequenceDocument = Sequence & Document;

export enum SeqType {
  Book = 'Book',
}

@Schema()
export class Sequence {
  @Prop({ required: true, default: 1 })
  value: number;
}

export const SequenceModel = SchemaFactory.createForClass(Sequence);

@Injectable()
export class SequenceService {
  constructor(
    @InjectModel(Sequence.name) private readonly sequenceModel: Model<SequenceDocument>,
  ) {}

  async getNextSequenceValue(): Promise<number> {
    const sequence = await this.sequenceModel.findOneAndUpdate(
      {},
      { $inc: { value: 1 } },
      {
        new: true,
        upsert: true,
      },
    );
    return sequence.value;
  }
}
