import { type Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  pageSize: number;

  @ApiProperty({ example: 137 })
  total: number;

  @ApiProperty({ example: 7 })
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMetaDto;
}

export function PaginatedResponseDto<T>(itemType: Type<T>): Type<Paginated<T>> {
  class PaginatedResponse implements Paginated<T> {
    @ApiProperty({ type: [itemType] })
    data: T[];

    @ApiProperty({ type: PaginationMetaDto })
    meta: PaginationMetaDto;
  }
  Object.defineProperty(PaginatedResponse, 'name', { value: `Paginated${itemType.name}` });
  return PaginatedResponse;
}
