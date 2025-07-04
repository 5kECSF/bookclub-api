import { Module } from '@nestjs/common';

import { getMongoUri } from '@/common/config/config.utills';
import { MongooseModule } from '@nestjs/mongoose';
import { ColorEnums, logTrace } from '../../common/logger';
import { DatabaseService } from './database.service';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: async () => {
        const mongoUri = getMongoUri();
        logTrace('monogUri', mongoUri.substring(0, 20), ColorEnums.BgGreen);
        // logTrace('monogUri', mongoUri, ColorEnums.BgGreen);
        try {
          const mongooseOptions = {
            uri: mongoUri,
          };
          // await mongoose.connect(mongoUri, mongooseOptions);

          console.info('MongoDB  trying to connect');

          return mongooseOptions;
        } catch (e) {
          console.error('Error connecting to MongoDB:', e);
          throw e;
        }
      },
    }),

    // MongooseModule.forRoot(EnvConstants.mongodbUri),
    // TypegooseModule.forRoot(EnvConfigs.mongodbUri),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
