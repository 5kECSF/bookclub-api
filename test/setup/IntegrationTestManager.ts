import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
// import * as cookieParser from 'cookie-parser';
import { Connection } from 'mongoose';
import { AppModule } from '../../src/app.module';
import { getConnectionToken } from '@nestjs/mongoose';
import { AuthService } from '../../src/app/account/auth/auth.service';
import { UserService } from '../../src/app/account/users';
import {
  adminLogin,
  defaultAdmin,
  defaultUser1,
} from '../../src/app/account/users/test/e2e/user.stub';
import { LoginUserInput } from '../../src/app/account/auth/dto/auth.input.dto';
// import { DatabaseService } from '../../src/providers/database/database.service';

// import { adminUser } from '../features/users/tests/stubs/user.stub';

/**
 * this is integration test manager class that setups things like
 */
export class IntegrationTestManager {
  public httpServer: any;
  public authService: AuthService;
  public userService: UserService;
  public app: INestApplication;
  public modules: TestingModule;

  public userAccessToken: string;
  public adminAccessToken: string;
  public userRefreshToken: string;
  public adminRefreshToken: string;

  private connection: Connection;

  async beforeAll(collectionName: string): Promise<void> {
    // compile the app module
    this.modules = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    this.app = await this.modules.createNestApplication();
    // this.app.use(cookieParser());
    this.httpServer = await this.app.getHttpServer();

    await this.app.init();

    /**
     * dropping the collection to clear old test data, users are always dropped
     */
    this.connection = this.modules.get(getConnectionToken());
    await this.connection.collection(collectionName).drop();
    await this.connection.collection('users').drop();

    /**
     * Creating default User & Admin for the testing purposes
     *
     */
    this.authService = this.modules.get<AuthService>(AuthService);
    this.userService = this.modules.get<UserService>(UserService);

    await this.userService.createUser(defaultUser1);
    await this.userService.createUser(defaultAdmin);

    /**
     * Getting tokens by logging the user and admin
     */
    const adminUserResp = await this.authService.login(adminLogin);
    const userResp = await this.authService.login(adminLogin);

    /**
     * setting the access & the refresh tokens
     */
    this.adminAccessToken = adminUserResp.val.authToken.accessToken;
    this.adminRefreshToken = adminUserResp.val.authToken.refreshToken;

    this.userAccessToken = userResp.val.authToken.accessToken;
    this.userRefreshToken = userResp.val.authToken.refreshToken;

    // this.connection = this.modules.get<DatabaseService>(DatabaseService).getDbHandle();
  }

  async afterAll(collectionName: string) {
    // await this.connection.dropDatabase();
    /**
     * drop collections after each test, user collection is always dropped
     */
    await this.connection.collection(collectionName).drop();
    await this.connection.collection('users').drop();
    await this.app.close();
    await this.modules.close();
  }

  getCollection(collectionName: string) {
    return this.connection.collection(collectionName);
  }

  getAccessToken(): string {
    return 'this.adminToken.accessToken';
  }
}
