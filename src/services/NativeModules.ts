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
  startCSNAdvertising(csnData: string): Promise<boolean>;
  startSupremaAdvertising(userId: string, expiryDate: string): Promise<boolean>;
  stopAdvertising(): Promise<boolean>;
  getAdvertisingStatus(): Promise<{
    isAdvertising: boolean;
    isGattServerOpen: boolean;
    serviceUUID: string;
    iBeaconUUID: string;
    major: number;
    minor: number;
  }>;
}

interface BLECentralModule {
  startScan(): Promise<boolean>;
  stopScan(): Promise<boolean>;
  connectToDevice(deviceAddress: string): Promise<boolean>;
  disconnect(): Promise<boolean>;
  readCharacteristic(): Promise<boolean>;
  writeCharacteristic(data: string): Promise<boolean>;
  enableNotifications(): Promise<boolean>;
}

interface SecurityModule {
  generateSecureKey(): Promise<boolean>;
  encryptData(data: string): Promise<{encryptedData: string; iv: string}>;
  decryptData(encryptedData: string, iv: string): Promise<string>;
}

export const NFCNative: NFCModule = NativeModules.NFCModule;
export const BLENative: BLEModule = NativeModules.BLEModule;
export const BLECentralNative: BLECentralModule = NativeModules.BLECentralModule;
export const SecurityNative: SecurityModule = NativeModules.SecurityModule;

// Export BLE Event Emitter
import { NativeEventEmitter } from 'react-native';
export const BLEEventEmitter = new NativeEventEmitter(NativeModules.BLEModule);
export const BLECentralEventEmitter = new NativeEventEmitter(NativeModules.BLECentralModule);