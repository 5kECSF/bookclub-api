import { Module } from '@nestjs/common';
import { AuthModule } from './app/account/auth/auth.module';
import { ProfileModule } from './app/account/profile/profile.module';
import { UsersModule } from './app/account/users/users.module';
import { AppController } from './app/app.controller';
import { AppService } from './app/app.service';
import { BookModule } from './app/library/book/book.module';
import { CategoryModule } from './app/library/category/category.module';
import { DonationModule } from './app/library/donation/donation.module';
import { GenreModule } from './app/library/genres/genre.module';
import { DatabaseModule } from './providers/database/databaseModule';

import { UploadModule } from '@/app/upload/upload.module';
import { FeedbackModule } from './app/extra/feedback/feedback.module';
import { NotificationModule } from './app/extra/notification/notification.module';
// import { APP_GUARD } from '@nestjs/core';
// import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthorModule } from '@/app/library/author/author.module';
import { BorrowModule } from './app/library/borrow/borrow.module';
import { StatsModule } from './app/library/stats/stats.module';
import { FileModule } from './providers/upload/file.module';

import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { PingService } from './app/extra/health/ping.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
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
    UploadModule,
    AuthorModule,
    BorrowModule,
    FileModule,
    StatsModule,
    HttpModule,
    // TerminusModule,
    // HealthModule,
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
    PingService,
    // {
    //   provide: APP_GUARD,
    //   useClass: ThrottlerGuard,
    // },
  ],
})
export class AppModule {}
