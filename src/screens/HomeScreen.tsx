import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert} from 'react-native';
import {NFCNative, BLENative} from '../services/NativeModules';

interface Props {
  navigation: any;
}

const HomeScreen: React.FC<Props> = ({navigation}) => {
  const [nfcEnabled, setNfcEnabled] = useState(false);
  const [bleEnabled, setBleEnabled] = useState(false);

  useEffect(() => {
    checkCapabilities();
  }, []);

  const checkCapabilities = async () => {
    try {
      const nfc = await NFCNative.isNFCEnabled();
      const ble = await BLENative.isBLEEnabled();
      setNfcEnabled(nfc);
      setBleEnabled(ble);
    } catch (error) {
      console.log('Capability check failed:', error);
    }
  };

  const navigateToNFC = () => {
    if (!nfcEnabled) {
      Alert.alert('NFC Disabled', 'Please enable NFC in device settings');
      return;
    }
    navigation.navigate('NFC');
  };

  const navigateToBLE = () => {
    if (!bleEnabled) {
      Alert.alert('Bluetooth Disabled', 'Please enable Bluetooth in device settings');
      return;
    }
    navigation.navigate('BLE');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Access Methods</Text>
      
      <TouchableOpacity 
        style={[styles.methodButton, !nfcEnabled && styles.disabledButton]} 
        onPress={navigateToNFC}
      >
        <Text style={styles.methodTitle}>NFC Access</Text>
        <Text style={styles.methodSubtitle}>MIFARE DESFire Emulation</Text>
        <Text style={[styles.status, nfcEnabled ? styles.enabled : styles.disabled]}>
          {nfcEnabled ? 'Ready' : 'Disabled'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.methodButton, !bleEnabled && styles.disabledButton]} 
        onPress={navigateToBLE}
      >
        <Text style={styles.methodTitle}>BLE Access</Text>
        <Text style={styles.methodSubtitle}>Bluetooth Low Energy</Text>
        <Text style={[styles.status, bleEnabled ? styles.enabled : styles.disabled]}>
          {bleEnabled ? 'Ready' : 'Disabled'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  methodButton: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.6,
  },
  methodTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 5,
  },
  methodSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  status: {
    fontSize: 14,
    fontWeight: '500',
  },
  enabled: {
    color: '#4CAF50',
  },
  disabled: {
    color: '#F44336',
  },
});

export default HomeScreen;