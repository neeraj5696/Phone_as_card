import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert, TextInput} from 'react-native';
import {BLENative, BLEEventEmitter, SecurityNative} from '../services/NativeModules';

const BLEScreen: React.FC = () => {
  const [isAdvertising, setIsAdvertising] = useState(false);
  const [credentialData, setCredentialData] = useState('');
  const [userId, setUserId] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [connectionCount, setConnectionCount] = useState(0);

  useEffect(() => {
    const successListener = BLEEventEmitter.addListener('BLE_ADVERTISE_SUCCESS', () => {
      console.log('✅ [EVENT] BLE advertising started successfully');
      Alert.alert('Advertising Active', 'BLE advertising is now active');
    });

    const failedListener = BLEEventEmitter.addListener('BLE_ADVERTISE_FAILED', (errorCode) => {
      console.error(`❌ [EVENT] BLE advertising failed with code: ${errorCode}`);
      Alert.alert('BLE Error', `Advertising failed with code: ${errorCode}`);
      setIsAdvertising(false);
    });

    const readListener = BLEEventEmitter.addListener('BLE_CREDENTIAL_READ', (deviceAddress) => {
      console.log(`📄 [EVENT] Credential read by device: ${deviceAddress}`);
      Alert.alert('Access Granted', `Device ${deviceAddress} read credentials`);
      setConnectionCount(prev => prev + 1);
    });

    return () => {
      successListener.remove();
      failedListener.remove();
      readListener.remove();
    };
  }, []);

  const startSupremaAdvertising = async () => {
    try {
      if (!userId.trim() || !expiryDate.trim()) {
        console.error('❌ [UI] Missing required fields: User ID or Expiry Date');
        Alert.alert('Error', 'Please enter User ID and Expiry Date');
        return;
      }
      
      console.log(`🟢 [UI] Starting Suprema advertising - User ID: ${userId}, Expiry: ${expiryDate}`);
      Alert.alert('Starting', 'Initializing Suprema BLE advertising...');
      
      await BLENative.startSupremaAdvertising(userId, expiryDate);
      setIsAdvertising(true);
      
      console.log('✅ [UI] Suprema BLE advertising started successfully');
      Alert.alert('Success', 'Suprema BLE advertising started\nDevice is now discoverable');
    } catch (error: any) {
      console.error('❌ [UI] Suprema advertising error:', error.message);
      Alert.alert('Error', error.message);
    }
  };
  
  const startBLEAdvertising = async () => {
    try {
      if (!credentialData.trim()) {
        console.error('❌ [UI] Missing credential data');
        Alert.alert('Error', 'Please enter credential data');
        return;
      }

      console.log('🔐 [UI] Encrypting credential data...');
      const encrypted = await SecurityNative.encryptData(credentialData);
      console.log('✅ [UI] Data encrypted, starting BLE advertising...');
      
      await BLENative.startAdvertising(encrypted.encryptedData);
      
      setIsAdvertising(true);
      console.log('✅ [UI] Legacy BLE advertising started');
      Alert.alert('Success', 'BLE advertising started\nDevice is discoverable');
    } catch (error: any) {
      console.error('❌ [UI] BLE advertising error:', error.message);
      Alert.alert('Error', error.message);
    }
  };

  const stopBLEAdvertising = async () => {
    try {
      await BLENative.stopAdvertising();
      setIsAdvertising(false);
      Alert.alert('Stopped', 'BLE advertising stopped');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BLE Access Control</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>User ID:</Text>
        <TextInput
          style={styles.input}
          value={userId}
          onChangeText={setUserId}
          placeholder="Enter User ID (e.g., 12345)"
          keyboardType="numeric"
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Expiry Date:</Text>
        <TextInput
          style={styles.input}
          value={expiryDate}
          onChangeText={setExpiryDate}
          placeholder="Enter expiry date (YYYYMMDD)"
          keyboardType="numeric"
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Legacy Credential Data:</Text>
        <TextInput
          style={styles.input}
          value={credentialData}
          onChangeText={setCredentialData}
          placeholder="Enter BLE credential data"
          secureTextEntry
        />
      </View>

      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Status:</Text>
        <Text style={[styles.status, isAdvertising ? styles.active : styles.inactive]}>
          {isAdvertising ? 'ADVERTISING' : 'STOPPED'}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsLabel}>Access Count:</Text>
        <Text style={styles.statsValue}>{connectionCount}</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, styles.supremaButton]}
        onPress={startSupremaAdvertising}
        disabled={isAdvertising}
      >
        <Text style={styles.buttonText}>Start Suprema BLE</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.button, isAdvertising ? styles.stopButton : styles.startButton]}
        onPress={isAdvertising ? stopBLEAdvertising : startBLEAdvertising}
      >
        <Text style={styles.buttonText}>
          {isAdvertising ? 'Stop Advertising' : 'Start Legacy BLE'}
        </Text>
      </TouchableOpacity>

      {isAdvertising && (
        <Text style={styles.infoText}>
          Device is broadcasting credentials via BLE. Readers can connect and authenticate.
        </Text>
      )}
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
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 10,
  },
  status: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  active: {
    color: '#4CAF50',
  },
  inactive: {
    color: '#F44336',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  statsLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 10,
  },
  statsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  supremaButton: {
    backgroundColor: '#9C27B0',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  infoText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
});

export default BLEScreen;