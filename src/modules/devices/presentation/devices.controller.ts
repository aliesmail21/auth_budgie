import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { DevicesService, DeviceSessionResponse } from '../application/devices.service';
import {
  JwtAuthGuard,
  AuthenticatedUser,
  AuthenticatedSession,
} from '../../auth/application/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/application/decorators/current-user.decorator';
import { CurrentSession } from '../../auth/application/decorators/current-session.decorator';
import { ApiStandardErrors } from '../../../common/decorators/api-standard-errors.decorator';

@ApiTags('Device Management')
@Controller('account/devices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@ApiStandardErrors({ auth: true })
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  @ApiOperation({
    summary: 'List all active devices',
    description:
      'Retrieves all currently active authenticated device sessions for the user, highlighting the current device.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of active device sessions.',
  })
  async listDevices(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSession() session: AuthenticatedSession,
  ): Promise<DeviceSessionResponse[]> {
    return this.devicesService.listDevices(user.id, session.id);
  }

  @Delete(':sessionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke a specific device session',
    description:
      'Revokes an individual device session (e.g. lost/stolen device). Enforces strict ownership checks.',
  })
  @ApiParam({
    name: 'sessionId',
    type: 'string',
    description: 'UUID of the device session to revoke',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Device session revoked successfully.',
  })
  async revokeDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId', new ParseUUIDPipe({ version: '4' })) sessionId: string,
  ): Promise<{ message: string }> {
    return this.devicesService.revokeDevice(user.id, sessionId);
  }
}
