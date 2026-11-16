import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';
import { ErrorCode } from '../errors/error-codes';

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema?: ZodSchema<unknown>) {}

  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (metadata.type === 'custom') {
      return value;
    }

    const schemaToUse = this.schema;

    if (!schemaToUse) {
      return value;
    }

    const result = schemaToUse.safeParse(value);

    if (!result.success) {
      const details = this.formatZodErrors(result.error);
      throw new BadRequestException({
        message: 'Validation failed',
        errorCode: ErrorCode.VALIDATION_ERROR,
        details,
        target: metadata.type,
      });
    }

    return result.data;
  }

  private formatZodErrors(error: ZodError): ValidationErrorDetail[] {
    return error.issues.map((issue) => ({
      field: issue.path.length > 0 ? issue.path.join('.') : 'root',
      message: issue.message,
    }));
  }
}
