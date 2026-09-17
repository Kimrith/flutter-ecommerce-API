import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../../../generated/prisma';

export class OrderItemDto {
  @ApiProperty({ example: '8457be0d-8606-4d33-8c1a-de20669ad556' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({
    type: [OrderItemDto],
    description: 'Array of cart items stored in client localStorage / app state',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Order must contain at least 1 item' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @IsNotEmpty()
  items: OrderItemDto[];

  @ApiPropertyOptional({
    description: 'Optional ID of a saved user address in database',
  })
  @IsString()
  @IsOptional()
  addressId?: string;

  @ApiPropertyOptional({ example: 'St 271, Mean Chey, Phnom Penh' })
  @IsString()
  @IsOptional()
  shippingAddressString?: string;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.BAKONG_KHQR })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod = PaymentMethod.BAKONG_KHQR;
}
