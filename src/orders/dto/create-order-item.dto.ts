import { IsInt, IsNumber, IsString, Min, MinLength } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderItemDto {
  @ApiProperty({
    example: 'Mouse',
  })
  @IsString()
  @MinLength(1)
  productName: string;

  @ApiProperty({
    example: 2,
  })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({
    example: 150,
  })
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0.01)
  price: number;
}
