import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ColorEnums, logTrace } from './logger';
import { stat } from 'fs';

@Catch(HttpException)
export class CustomExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const errorMessage = 'An internal server error occurred. Please try again later.';

    try {
      const status = exception.getStatus();
      const respMessage = exception.getResponse();
      logTrace(status, exception.getResponse(), ColorEnums.BgRed);
      if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
        // Customize your error message here
        response.status(status).json({ message: errorMessage });
      } else {
        // For other error statuses, you can handle them differently if needed
        response.status(status).json(respMessage);
      }
    } catch (error) {
      response.status(500).json({ message: errorMessage });
    }
  }
}
