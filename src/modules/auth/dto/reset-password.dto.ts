import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_MAX_LENGTH } from '../utils/password-policy';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token from the reset link' })
  @IsString()
  @MinLength(20)
  @MaxLength(100)
  token: string;

  @ApiProperty({
    description:
      'At least 12 characters, with an uppercase letter, a number and a special character',
  })
  @IsString()
  @MaxLength(PASSWORD_MAX_LENGTH)
  password: string;
}
