import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  /** Not needed when the account has no password yet (made with Google or Facebook). */
  @IsOptional() @IsString() @MaxLength(128) currentPassword?: string;
  @IsString() @MinLength(8) @MaxLength(128) newPassword: string;
}

export class DeleteAccountDto {
  /** Not needed when the account has no password (made with Google or Facebook). */
  @IsOptional() @IsString() @MaxLength(128) password?: string;
}
