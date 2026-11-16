import { ExecutionContext } from '@nestjs/common';
import { ClientMetadata } from './client-info.decorator';

function getParamDecoratorFactory(decorator: (...args: unknown[]) => ParameterDecorator) {
  class Test {
    public test(@decorator() _value: unknown) {}
  }
  const args = Reflect.getMetadata('__routeArguments__', Test, 'test');
  const key = Object.keys(args)[0] as string;
  return args[key].factory;
}

describe('ClientMetadata Decorator', () => {
  it('should extract client IP and user-agent from execution context', () => {
    const factory = getParamDecoratorFactory(ClientMetadata);

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          ip: '192.168.1.100',
          socket: { remoteAddress: '192.168.1.1' },
          headers: {
            'user-agent': 'Budgie-Flutter-Client/1.0.0',
          },
        }),
      }),
    } as unknown as ExecutionContext;

    const result = factory(null, mockContext);

    expect(result).toEqual({
      ipAddress: '192.168.1.100',
      userAgent: 'Budgie-Flutter-Client/1.0.0',
    });
  });

  it('should fallback to socket.remoteAddress if req.ip is undefined', () => {
    const factory = getParamDecoratorFactory(ClientMetadata);

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          ip: undefined,
          socket: { remoteAddress: '10.0.0.5' },
          headers: {},
        }),
      }),
    } as unknown as ExecutionContext;

    const result = factory(null, mockContext);

    expect(result.ipAddress).toBe('10.0.0.5');
    expect(result.userAgent).toBeUndefined();
  });
});
