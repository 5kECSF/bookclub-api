import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Donation, DonationDocument } from './entities/donation.entity';

import { MongoGenericRepository } from '../../../providers/database/base/mongo.base.repo';
import { Model } from 'mongoose';

@Injectable()
export class DonationService extends MongoGenericRepository<Donation> {
  constructor(@InjectModel(Donation.name) private questionModel: Model<DonationDocument>) {
    super(questionModel);
  }
}
