import { Module } from '@nestjs/common';
//self import
import { AuthService } from './auth.service';

//modules
import { User, UserSchema, UsersModule } from '../users';
import { CryptoModule } from '@/providers/crypto/crypto.module';
import { VerificationModule } from '@/providers/verification';

import { GuardsModule } from '@/providers/guards/guards.module';

import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';

// import EmailMockService from "@providers/Verification";
// import { FirebaseService } from '../../providers/firebase/firebaseAdmin'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    UsersModule,
    CryptoModule,
    VerificationModule,
    GuardsModule,
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService, UsersModule],
})
export class AuthModule {}
