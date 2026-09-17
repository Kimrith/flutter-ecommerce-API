import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class BakongWebhookDto {
  @ApiProperty({ example: 'b0a858e45330e7161b9d4e9b9cf9c63b' })
  @IsString()
  @IsNotEmpty()
  md5: string;

  @ApiPropertyOptional({ example: 'TXN-987654321' })
  @IsString()
  @IsOptional()
  transactionId?: string;

  @ApiPropertyOptional({ example: 'SUCCESS' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  data?: any;
}
