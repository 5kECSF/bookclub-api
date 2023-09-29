import { Request, Response } from 'express';
import { IsOptional } from 'class-validator';

export interface HttpContext {
  req: Request;
  res: Response;
}

export const pagiKeys = ['limit', 'sort', 'page'];

export class PaginationInputs {
  @IsOptional()
  searchText?: string;

  @IsOptional()
  limit?: number = 25;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  sort?: string = '_id';
}

export enum RoleType {
  USER = 'USER',
  ADMIN = 'ADMIN',
  KID = 'KID',
}

export class UserFromToken {
  _id?: string;
  role?: RoleType;
  sessionId?: string;
  expiryDate?: number;
}

export interface IAuthToken {
  accessToken?: string;
  refreshToken?: string;
}

export class PaginatedRes<T> {
  count: number;

  data: T[];
}

// --------------------          Unused

export class MessageError {
  message: string;
  code: string;
}
