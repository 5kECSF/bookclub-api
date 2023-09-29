import { Module } from '@nestjs/common';

import { VerificationService } from './index';

@Module({
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
