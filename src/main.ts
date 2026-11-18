import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { EnvVar } from './common/config/config.instances';

export async function bootstrap(port: number | string = EnvVar.getInstance.PORT) {
  const app = await NestFactory.create(AppModule);
  await configureApp(app);
  await app.listen(port);
  console.log(` server started Check docs@  http://localhost:${port}/swagger`);
  return app;
}

// only start automatically when executed directly (node dist/main), not when imported
if (require.main === module) {
  bootstrap();
}
