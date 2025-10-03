import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, PermissionsAndroid, Platform} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NFCNative, BLENative, SecurityNative} from './src/services/NativeModules';
import BLEScannerScreen from './src/screens/BLEScannerScreen';

function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [nfcActive, setNfcActive] = useState(false);
  const [bleActive, setBleActive] = useState(false);
  const [cardData, setCardData] = useState('');

  useEffect(() => {
    testNativeModules();
  }, []);

  const testNativeModules = async () => {
    try {
      console.log('🔍 Testing native modules...');
      if (NFCNative) {
        const nfcAvailable = await NFCNative.isNFCAvailable();
        const nfcEnabled = await NFCNative.isNFCEnabled();
        console.log('📱 NFC hardware available:', nfcAvailable);
        console.log('📱 NFC enabled:', nfcEnabled);
      }
      if (BLENative) {
        const bleEnabled = await BLENative.isBLEEnabled();
        console.log('📱 BLE enabled:', bleEnabled);
      }
      if (SecurityNative) {
        await SecurityNative.generateSecureKey();
        console.log('🔐 Security key generated');
      }
    } catch (e) {
      console.log('❌ Native module test error:', e);
    }
  };

  const startNFC = async () => {
    try {
      if (!cardData) {
        Alert.alert('Error', 'Enter card data');
        return;
      }
      if (!NFCNative || !SecurityNative) {
        Alert.alert('Error', 'Native modules not available');
        return;
      }
      
      // Check NFC hardware availability
      const nfcAvailable = await NFCNative.isNFCAvailable();
      if (!nfcAvailable) {
        console.log('❌ NFC hardware not available on this device');
        Alert.alert('NFC Not Available', 'This device does not have NFC hardware');
        return;
      }
      
      // Check if NFC is enabled
      const nfcEnabled = await NFCNative.isNFCEnabled();
      if (!nfcEnabled) {
        console.log('❌ NFC is disabled');
        Alert.alert('NFC Disabled', 'Please enable NFC in device settings');
        return;
      }
      
      await SecurityNative.generateSecureKey();
      const encrypted = await SecurityNative.encryptData(cardData);
      
      console.log('\n🔐 === NFC TECHNOLOGY DETAILS ===');
      console.log('📡 Technology: NFC Host-based Card Emulation (HCE)');
      console.log('🏷️  Protocol: ISO 14443-4 (MIFARE DESFire)');
      console.log('🆔 Application ID (AID): F0394148148100');
      console.log('🔒 Encryption: AES-256-GCM (Android Keystore)');
      console.log('\n📤 DATA BEING SENT TO ACCESS CONTROL:');
      console.log('📝 Original credential:', cardData);
      console.log('🔐 Encrypted payload:', encrypted.encryptedData);
      console.log('🔑 Initialization Vector:', encrypted.iv);
      console.log('📏 Encrypted data size:', encrypted.encryptedData.length, 'characters');
      console.log('\n🎯 TARGET DEVICES: Suprema BioStation 2A, MIFARE readers');
      console.log('⚡ TRANSMISSION: Contactless 13.56 MHz, up to 4cm range');
      
      await NFCNative.enableHCE('F0394148148100');
      await NFCNative.setCredentials(encrypted.encryptedData, 'READ_WRITE');
      setNfcActive(true);
      Alert.alert('Success', 'NFC active');
      
      console.log('\n✅ NFC HCE ACTIVE - Ready for reader interaction');
      console.log('👆 Tap phone to access control reader to transmit credentials');
    } catch (e: any) {
      console.log('❌ NFC Error:', e.message);
      Alert.alert('Error', e.message || 'NFC failed');
    }
  };

  const requestBluetoothPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        
        return (
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE] === PermissionsAndroid.RESULTS.GRANTED &&
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  if (currentScreen === 'scanner') {
    return (
      <SafeAreaProvider>
        <View style={styles.container}>
          <TouchableOpacity style={styles.backButton} onPress={() => setCurrentScreen('home')}>
            <Text style={styles.buttonText}>← Back</Text>
          </TouchableOpacity>
          <BLEScannerScreen />
        </View>
      </SafeAreaProvider>
    );
  }

  const startBLE = async () => {
    try {
      if (!cardData) {
        Alert.alert('Error', 'Enter CSN (Card Serial Number)');
        return;
      }
      if (!BLENative) {
        Alert.alert('Error', 'Native modules not available');
        return;
      }
      
      const hasPermissions = await requestBluetoothPermissions();
      if (!hasPermissions) {
        Alert.alert('Error', 'Bluetooth permissions required');
        return;
      }
      
      // Validate CSN format (should be a number)
      const csnNumber = parseInt(cardData);
      if (isNaN(csnNumber)) {
        Alert.alert('Error', 'CSN must be a valid number (e.g., 123456789)');
        return;
      }
      
      console.log('\n🔵 === CSN MOBILE BLE TECHNOLOGY ===');
      console.log('📡 Technology: CSN Mobile over Bluetooth Low Energy');
      console.log('🏷️  Protocol: GATT with CSN and ToM services');
      console.log('🆔 CSN Service UUID: 0000FFE0-0000-1000-8000-00805F9B34FB');
      console.log('🆔 ToM Service UUID: 0000FFE2-0000-1000-8000-00805F9B34FB');
      console.log('🔢 CSN Data:', cardData);
      console.log('📊 Byte Order: MSB (Most Significant Byte first)');
      console.log('📡 Advertising mode: BALANCED');
      console.log('\n🎯 COMPATIBLE WITH: Biometric access control systems');
      console.log('✅ Supports: CSN Mobile + Template on Mobile (ToM)');
      console.log('⚡ TRANSMISSION: 2.4 GHz, up to 10m range');
      console.log('🔍 DISCOVERY: Device name + TX power + CSN/ToM services');
      
      await BLENative.startCSNAdvertising(cardData);
      setBleActive(true);
      
      // Get advertising status for debugging
      const status = await BLENative.getAdvertisingStatus();
      console.log('\n📊 CSN MOBILE STATUS:');
      console.log('✅ Advertising active:', status.isAdvertising);
      console.log('✅ GATT server open:', status.isGattServerOpen);
      console.log('🆔 Service UUID:', status.serviceUUID);
      
      Alert.alert('Success', 'CSN Mobile BLE active - Ready for access control');
      
      console.log('\n✅ CSN MOBILE BLE ACTIVE');
      console.log('🔍 Access control readers can now discover CSN services');
      console.log('📱 Your phone will appear as a CSN Mobile device');
      console.log('💡 TROUBLESHOOTING: Ensure access control supports CSN Mobile');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'CSN Mobile BLE failed');
    }
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Text style={styles.title}>Phone as Card</Text>
        
        <TextInput
          style={styles.input}
          value={cardData}
          onChangeText={setCardData}
          placeholder="Enter CSN (Card Serial Number)"
          keyboardType="numeric"
          secureTextEntry={false}
        />
        
        <TouchableOpacity 
          style={[styles.button, nfcActive && styles.activeButton]} 
          onPress={nfcActive ? () => setNfcActive(false) : startNFC}
        >
          <Text style={styles.buttonText}>
            {nfcActive ? 'Stop NFC' : 'Start NFC'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, bleActive && styles.activeButton]} 
          onPress={bleActive ? () => setBleActive(false) : startBLE}
        >
          <Text style={styles.buttonText}>
            {bleActive ? 'Stop BLE' : 'Start BLE'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.scanButton} 
          onPress={() => setCurrentScreen('scanner')}
        >
          <Text style={styles.buttonText}>🔍 BLE Scanner</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  activeButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  scanButton: {
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  backButton: {
    backgroundColor: '#FF9500',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
});

export default App;
