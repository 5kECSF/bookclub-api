import { Module } from '@nestjs/common';
import { AppController } from './app/app.controller';
import { AppService } from './app/app.service';
import { UsersModule } from './app/users/users.module';
import { DatabaseModule } from './providers/database/databaseModule';
import { AuthModule } from './app/auth/auth.module';
import { ProfileModule } from './app/profile/profile.module';
import { GenreModule } from './app/genres/genre.module';
import { CategoryModule } from './app/category/category.module';
import { BookModule } from './app/book/book.module';
import { DonationModule } from './app/donation/donation.module';

import { NotificationModule } from './app/notification/notification.module';
import { FeedbackModule } from './app/feedback/feedback.module';
import { FileModule } from './app/file/file.module';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    DatabaseModule,
    UsersModule,
    AuthModule,
    ProfileModule,
    GenreModule,
    CategoryModule,
    BookModule,
    DonationModule,

    NotificationModule,
    FeedbackModule,
    FileModule,
    // ThrottlerModule.forRoot([
    //   {
    //     ttl: 60000,
    //     limit: 10,
    //   },
    // ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // {
    //   provide: APP_GUARD,
    //   useClass: ThrottlerGuard,
    // },
  ],
})
export class AppModule {}
