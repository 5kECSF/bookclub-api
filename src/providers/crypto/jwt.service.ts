import { Injectable } from '@nestjs/common';

import { verify, JwtPayload, sign, decode } from 'jsonwebtoken';
import { UserFromToken } from '@/common/common.types.dto';
import { ENV_TYPES } from '@/common/config/config.utills';
import { EnvVar } from '@/common/config/config.instances';

import { FAIL, Resp, Succeed } from '@/common/constants/return.consts';
import { logTrace } from '@/common/logger';

@Injectable()
export class CustomJwtService {
  private _envConfig: ENV_TYPES;

  constructor() {
    this._envConfig = EnvVar.getInstance;
  }

  // =============== Any other Token, user provides the secret & payload type
  public async signJwtToken(payload: any, secret: string, options) {
    return sign(payload, secret, options);
  }

  public async verifyJwtToken(token: string, secret: string) {
    return verify(token, secret, {
      algorithms: ['HS256'],
    }) as JwtPayload;
  }

  // =====================   Access & refresh Tokens
  public async signAccessToken(payload: any) {
    const token = sign(payload, EnvVar.getInstance.JWT_ACCESS_SECRET, {
      expiresIn: EnvVar.getInstance.JWT_EXPIRY_TIME,
      algorithm: 'HS256',
    });
    return token;
  }

  public async verifyAccessToken(authorization: string) {
    try {
      const [_, token] = authorization.split(' ');
      // logTrace('Access Token==', token);
      const decoded = await verify(token, EnvVar.getInstance.JWT_ACCESS_SECRET, {
        algorithms: ['HS256'],
        complete: true,
      });

      return decoded.payload;
    } catch (e) {
      logTrace('=====err', e.message);
      throw e;
    }

    // return jwt.verify(token, EnvVar.getInstance.jwt.jwtAccessSecret, {
    //   algorithms: ['HS256'],
    //   complete: true
    // })
  }

  public async signRefreshToken(payload: any) {
    const token = sign(payload, EnvVar.getInstance.JWT_REFRESH_SECRET, {
      expiresIn: EnvVar.getInstance.JWT_REFRESH_EXPIRY_TIME,
      algorithm: 'HS256',
    });

    return token;
  }

  public async verifyRefreshToken(token: string): Promise<Resp<UserFromToken>> {
    try {
      // const [_, token] = authorization.split(' ');
      logTrace(EnvVar.getInstance.JWT_REFRESH_SECRET, token);
      const decoded = verify(token, EnvVar.getInstance.JWT_REFRESH_SECRET, {
        algorithms: ['HS256'],
      }) as JwtPayload;

      if (!decoded._id) return FAIL('NO User id found on the JWT');
      const userToken: UserFromToken = {
        expiryDate: decoded.exp,
        _id: decoded._id,
        role: decoded.role,
        sessionId: decoded.sessionId,
      };
      return Succeed(userToken);
    } catch (e) {
      logTrace('verifying Token Error', e.message);
      return FAIL(e.message);
    }
  }
}
