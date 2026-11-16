export interface DeviceSessionResponse {
  id: string;
  deviceName: string;
  deviceType: string;
  deviceIdentifier: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string;
  isCurrent: boolean;
}
