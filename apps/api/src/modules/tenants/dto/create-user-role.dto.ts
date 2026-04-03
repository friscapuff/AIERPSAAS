import { IsString, IsUUID } from 'class-validator';

export class CreateUserRoleDto {
  @IsUUID()
  userId: string;

  @IsString()
  roleId: string;
}
