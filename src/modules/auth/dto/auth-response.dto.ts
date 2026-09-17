import { ApiProperty } from '@nestjs/swagger';

export class UserPayloadDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  phone?: string | null;

  @ApiProperty()
  role: string;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ type: UserPayloadDto })
  user: UserPayloadDto;
}
