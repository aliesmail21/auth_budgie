import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedSession, AuthenticatedRequest } from '../guards/jwt-auth.guard';

export const CurrentSession = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedSession | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.session;
  },
);
