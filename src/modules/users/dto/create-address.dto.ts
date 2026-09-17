import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ example: 'St 271, House #12' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({ example: 'Phnom Penh' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiPropertyOptional({ example: 'Mean Chey' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ example: '12000' })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({ example: 'Cambodia', default: 'Cambodia' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
