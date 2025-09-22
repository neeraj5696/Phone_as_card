import {NativeModules} from 'react-native';

interface NFCModule {
  isNFCEnabled(): Promise<boolean>;
  isNFCAvailable(): Promise<boolean>;
  enableHCE(aid: string): Promise<boolean>;
  setCredentials(keyData: string, accessRights: string): Promise<boolean>;
}

interface BLEModule {
  isBLEEnabled(): Promise<boolean>;
  checkPermissions(): Promise<boolean>;
  startAdvertising(credentialData: string): Promise<boolean>;
  stopAdvertising(): Promise<boolean>;
}

interface SecurityModule {
  generateSecureKey(): Promise<boolean>;
  encryptData(data: string): Promise<{encryptedData: string; iv: string}>;
  decryptData(encryptedData: string, iv: string): Promise<string>;
}

export const NFCNative: NFCModule = NativeModules.NFCModule;
export const BLENative: BLEModule = NativeModules.BLEModule;
export const SecurityNative: SecurityModule = NativeModules.SecurityModule;