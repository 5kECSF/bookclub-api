// Export items of this module, to know which modules depend on this module

export { User as User, UserSchema as UserSchema } from './entities/user.entity';
export { emailRegex as emailRegex } from './entities/user.entity';

export { UserService as UserService } from './users.service';

export { RegisterUserInput as RegisterUserInput } from './dto/user.mut.dto';

export { UserRes as UserRes } from './dto/resp.user.dto';
