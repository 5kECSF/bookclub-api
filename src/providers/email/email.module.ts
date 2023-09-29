import { Module } from '@nestjs/common';

import { EmailService } from './index';

@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
