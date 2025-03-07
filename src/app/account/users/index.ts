// Export items of this module, to know which modules depend on this module

export { User as User, UserSchema as UserSchema } from './entities/user.entity';

export { UserService as UserService } from './users.service';

export { RegisterUserInput as RegisterUserInput } from './entities/user.dto';

export * from './users.module';
