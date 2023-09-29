import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { GuardsModule, User, UserSchema, UsersModule } from '../auth/dependencies.auth';



@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    UsersModule,
    GuardsModule,

  ],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
