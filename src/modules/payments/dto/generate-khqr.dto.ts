import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum KhqrCurrency {
  USD = 'USD',
  KHR = 'KHR',
}

export class GenerateKhqrDto {
  @ApiProperty({ example: 'order-uuid-1234' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiPropertyOptional({ enum: KhqrCurrency, default: KhqrCurrency.USD })
  @IsEnum(KhqrCurrency)
  @IsOptional()
  currency?: KhqrCurrency = KhqrCurrency.USD;
}
