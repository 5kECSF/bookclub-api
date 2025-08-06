import { EnvVar } from '@/common/config/config.instances';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
@Injectable()
export class PingService {
  private readonly logger = new Logger(PingService.name);
  private readonly pingUrl = EnvVar.getInstance.SELF_PING_URL || 'http://localhost:3000/health';

  constructor(private readonly httpService: HttpService) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async pingSelf() {
    try {
      const response = await firstValueFrom(this.httpService.get(this.pingUrl));
      this.logger.log(
        `Self-ping successful: ${response.status} - ${response.data} pingurl: ${this.pingUrl}`,
      );
    } catch (error) {
      this.logger.error(`Self-ping failed: ${error.message}`);
    }
  }
}
