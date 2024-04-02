import { User } from '@/app/account/users';
import { ApiProperty } from '@nestjs/swagger';

//Auth-token.object-types

export class AuthToken {
  accessToken?: string;
  refreshToken?: string;
  sessionId?: string;
  expiresIn?: number;
}

export class AuthTokenResponse {
  @ApiProperty({ type: AuthToken })
  authToken?: AuthToken;

  @ApiProperty({ type: User })
  userData?: User;
}

export class TokenResponse {
  token?: string;
}
