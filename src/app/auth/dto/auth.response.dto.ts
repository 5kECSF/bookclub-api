import { User } from '../dependencies.auth';

//Auth-token.object-types

export class AuthToken {
  accessToken?: string;
  refreshToken?: string;
  sessionId?: string;
  expiresIn?: number;
}

export class AuthTokenResponse {
  authToken?: AuthToken;

  user?: User;
}

export class TokenResponse {
  token?: string;
}
