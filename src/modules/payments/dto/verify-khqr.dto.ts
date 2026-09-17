import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyKhqrDto {
  @ApiProperty({ example: 'order-uuid-1234' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ example: 'b0a858e45330e7161b9d4e9b9cf9c63b' })
  @IsString()
  @IsNotEmpty()
  md5: string;
}
