import { IsEmail, IsString, MinLength, IsOptional, IsIn, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  /** A mobile number (any country; without a +code it is read as Georgian), confirmed by SMS after sign-up. */
  @ApiProperty({ example: '+995599123456' })
  @IsString()
  @MaxLength(30)
  phone: string;

  /** Ticked "send me offers and reminders" — never pre-ticked. */
  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean;

  @ApiProperty({ example: 'REF123ABC', required: false })
  @IsOptional()
  @IsString()
  referralCode?: string;

  /** The site language at sign-up; emails are written in it. */
  @IsOptional()
  @IsIn(['ka', 'en'])
  language?: 'ka' | 'en';
}
