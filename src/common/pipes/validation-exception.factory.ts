import { HttpStatus } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { ErrorCode } from '../constants/error-codes';
import type { FieldErrorDto } from '../dto/error-response.dto';
import { AppException } from '../exceptions/app.exception';

function flatten(errors: ValidationError[], parentPath = ''): FieldErrorDto[] {
  return errors.flatMap((error) => {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;
    const own: FieldErrorDto[] = error.constraints
      ? [{ field, messages: Object.values(error.constraints) }]
      : [];
    return [...own, ...flatten(error.children ?? [], field)];
  });
}

export function validationExceptionFactory(errors: ValidationError[]): AppException {
  return new AppException(
    ErrorCode.VALIDATION_FAILED,
    'Validation failed',
    HttpStatus.BAD_REQUEST,
    flatten(errors),
  );
}
