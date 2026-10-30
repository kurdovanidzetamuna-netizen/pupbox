import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

/**
 * Database refusals in plain words instead of "Internal server error":
 * the thing is gone (deleted meanwhile, or a wrong link) → 404; it already
 * exists (a code or slug taken) → 409; other rows still use it → 409. Any
 * other database error stays a 500 and is logged.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('Database');

  catch(e: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const [status, message] = answer(e);
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) this.logger.error(`${e.code}: ${e.message}`);
    res.status(status).json({ statusCode: status, message, error: HttpStatus[status] });
  }
}

function answer(e: Prisma.PrismaClientKnownRequestError): [number, string] {
  switch (e.code) {
    case 'P2025': // the row to change or delete isn't there
    case 'P2001':
      return [HttpStatus.NOT_FOUND, 'Not found — it may have been deleted. Refresh and try again.'];
    case 'P2002': {
      const fields = (e.meta?.target as string[] | string | undefined) ?? '';
      return [HttpStatus.CONFLICT, `That ${[fields].flat().join(', ') || 'value'} is already used. Choose another.`];
    }
    case 'P2003': // still used by other rows
    case 'P2014':
      return [HttpStatus.CONFLICT, 'This is still used elsewhere, so it can’t be removed. Switch it off instead.'];
    default:
      return [HttpStatus.INTERNAL_SERVER_ERROR, 'Internal server error'];
  }
}
