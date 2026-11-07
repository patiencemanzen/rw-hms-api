import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ enum: ['ok', 'error', 'shutting_down'], example: 'ok' })
  status: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'object', properties: { status: { type: 'string' } } },
    example: { database: { status: 'up' } },
  })
  info?: Record<string, { status: string }>;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'object', properties: { status: { type: 'string' } } },
    example: {},
  })
  error?: Record<string, { status: string }>;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'object', properties: { status: { type: 'string' } } },
    example: { database: { status: 'up' } },
  })
  details: Record<string, { status: string }>;
}
