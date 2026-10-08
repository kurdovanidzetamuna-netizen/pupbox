import { IsEmail, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail() @MaxLength(200) email: string;
}

export class ResetPasswordDto {
  @IsString() @Length(20, 100) token: string;
  @IsString() @MinLength(8) @MaxLength(128) password: string;
}
