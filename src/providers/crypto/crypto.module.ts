import { Module } from '@nestjs/common';
import { CryptoService } from './crypto.service';
import { CustomJwtService } from './jwt.service';

@Module({
  providers: [CryptoService, CustomJwtService],
  exports: [CryptoService, CustomJwtService],
})
export class CryptoModule {}
