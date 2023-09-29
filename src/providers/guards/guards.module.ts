import { Module, Global } from '@nestjs/common';
import { JwtGuard } from './guard.rest';

import { CryptoModule } from '../crypto/crypto.module';

@Global()
@Module({
  imports: [CryptoModule],
  providers: [JwtGuard],
  exports: [JwtGuard, CryptoModule],
})
export class GuardsModule {}
