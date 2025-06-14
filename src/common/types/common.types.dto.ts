import { IsOptional } from 'class-validator';
import { Request, Response } from 'express';
import { RoleType } from './enums';

export interface HttpContext {
  req: Request;
  res: Response;
}

export const pagiKeys = ['limit', 'sort', 'page', '_sortDir'];

enum SortDir {
  asc = 'asc',
  desc = 'desc',
}

export class PaginationInputs {
  @IsOptional()
  searchText?: string;

  @IsOptional()
  limit?: number = 25;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  sort?: string = '_id';

  @IsOptional()
  _sortDir?: SortDir = SortDir.desc;
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
  hasNext?: boolean;
  hasPrev?: boolean;

  body: T[];
}

// --------------------          Unused

export const imageFileRegex = /^image\/(jpeg|jpg|png|gif|bmp)/;
