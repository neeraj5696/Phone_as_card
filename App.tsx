import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, PermissionsAndroid, Platform} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NFCNative, BLENative, SecurityNative} from './src/services/NativeModules';

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

  const startBLE = async () => {
    try {
      if (!cardData) {
        Alert.alert('Error', 'Enter card data');
        return;
      }
      if (!BLENative || !SecurityNative) {
        Alert.alert('Error', 'Native modules not available');
        return;
      }
      
      const hasPermissions = await requestBluetoothPermissions();
      if (!hasPermissions) {
        Alert.alert('Error', 'Bluetooth permissions required');
        return;
      }
      
      await SecurityNative.generateSecureKey();
      const encrypted = await SecurityNative.encryptData(cardData);
      
      console.log('\n🔵 === BLE TECHNOLOGY DETAILS ===');
      console.log('📡 Technology: Bluetooth Low Energy (BLE) 4.0+');
      console.log('🏷️  Protocol: GATT (Generic Attribute Profile)');
      console.log('🆔 Service UUID: 12345678-1234-1234-1234-123456789abc');
      console.log('🆔 Characteristic UUID: 87654321-4321-4321-4321-cba987654321');
      console.log('🔒 Encryption: AES-256-GCM (Android Keystore)');
      console.log('\n📤 DATA BEING SENT TO ACCESS CONTROL:');
      console.log('📝 Original credential:', cardData);
      console.log('🔐 Encrypted payload:', encrypted.encryptedData);
      console.log('🔑 Initialization Vector:', encrypted.iv);
      console.log('📏 Encrypted data size:', encrypted.encryptedData.length, 'characters');
      console.log('📊 Transmission power: High (for maximum range)');
      console.log('\n🎯 TARGET DEVICES: Suprema Mobile Access, BLE readers');
      console.log('⚡ TRANSMISSION: 2.4 GHz, up to 10m range, hands-free');
      
      await BLENative.startAdvertising(encrypted.encryptedData);
      setBleActive(true);
      Alert.alert('Success', 'BLE active');
      
      console.log('\n✅ BLE ADVERTISING ACTIVE - Broadcasting credentials');
      console.log('🔍 Readers can now discover and connect to read credentials');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'BLE failed');
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
          placeholder="Enter card data"
          secureTextEntry
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
});

export default App;
