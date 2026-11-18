import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import { promises as fs } from 'fs';
import { EnvVar } from './common/config/config.instances';
import { CustomExceptionFilter } from './common/custom-exception.filter';
import { getLocalUploadDir, LOCAL_UPLOAD_ROUTE } from './providers/upload/local-storage.service';

export interface ConfigureOptions {
  swagger?: boolean;
}

/**
 * global app configuration shared by main.ts, the integration tests and the e2e server
 */
export async function configureApp(app: INestApplication, options: ConfigureOptions = {}) {
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.use(cookieParser());
  app.useGlobalFilters(new CustomExceptionFilter());
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // STORAGE_PROVIDER=LOCAL: serve the uploaded files
  if (EnvVar.getInstance.STORAGE_PROVIDER === 'LOCAL') {
    const dir = getLocalUploadDir();
    await fs.mkdir(dir, { recursive: true });
    app.use(LOCAL_UPLOAD_ROUTE, express.static(dir, { index: false, fallthrough: false }));
  }

  if (options.swagger !== false) {
    const config = new DocumentBuilder()
      .setTitle('Book club API')
      .setDescription('this is the documentation for the Book Club API')
      .setVersion('1.0')
      .addTag('version one')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('swagger', app, document);
  }
  return app;
}
