# Phone as Card - Setup Instructions

## Overview
React Native app with native Kotlin modules for NFC MIFARE DESFire emulation and BLE access control.

## Features
- **NFC HCE**: MIFARE DESFire EV1/EV2 emulation using Host-based Card Emulation
- **BLE GATT**: Bluetooth Low Energy advertising with secure credential transmission
- **Security**: Android Keystore encryption with biometric authentication
- **Cross-platform UI**: React Native with TypeScript

## Setup

### 1. Install Dependencies
```bash
npm install
cd android && ./gradlew clean
cd ios && pod install  # iOS only
```

### 2. Android Permissions
The app requires these permissions (already configured):
- NFC, Bluetooth, Location, Biometric

### 3. Run the App
```bash
npm run android  # Android
npm run ios      # iOS
```

## Usage

### NFC Access
1. Enter AID (default: F0394148148100)
2. Enter card credential data
3. Start emulation
4. Tap phone to NFC reader

### BLE Access
1. Enter credential data
2. Start advertising
3. Reader devices can connect via BLE GATT

## Security
- Credentials encrypted with AES-256 in Android Keystore
- Biometric authentication required
- Secure key generation and storage

## Native Modules
- `NFCModule.kt`: NFC HCE and MIFARE DESFire handling
- `BLEModule.kt`: BLE advertising and GATT server
- `SecurityModule.kt`: Android Keystore encryption

## Compatibility
- **NFC**: Android devices with NFC HCE support
- **BLE**: Android/iOS devices with Bluetooth LE
- **Target**: Suprema BioStation 2A and compatible readers