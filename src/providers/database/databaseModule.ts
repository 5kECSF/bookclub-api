import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseService } from './database.service';
import { EnvVar } from '../../common/config/config.instances';
import { ColorEnums, logTrace } from '../../common/logger';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: async () => {
        const mongoUri = EnvVar.getInstance.MONGODB_URI;
        logTrace('monogUri', mongoUri.substring(0, 20), ColorEnums.BgGreen);
        logTrace('monogUri', mongoUri, ColorEnums.BgGreen);
        try {
          const mongooseOptions = {
            uri: mongoUri,
          };
          // await mongoose.connect(mongoUri, mongooseOptions);

          console.info('MongoDB connected successfully!', 'mongoUri');

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
