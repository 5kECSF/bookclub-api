import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class CustomExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const status = exception.getStatus();

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      // Customize your error message here
      const errorMessage = 'An internal server error occurred. Please try again later.';
      response.status(status).json({ message: errorMessage });
    } else {
      // For other error statuses, you can handle them differently if needed
      response.status(status).json(exception.getResponse());
    }
  }
}
