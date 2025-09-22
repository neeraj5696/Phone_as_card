import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert, TextInput} from 'react-native';
import {BLENative, BLEEventEmitter, SecurityNative} from '../services/NativeModules';

const BLEScreen: React.FC = () => {
  const [isAdvertising, setIsAdvertising] = useState(false);
  const [credentialData, setCredentialData] = useState('');
  const [connectionCount, setConnectionCount] = useState(0);

  useEffect(() => {
    const successListener = BLEEventEmitter.addListener('BLE_ADVERTISE_SUCCESS', () => {
      console.log('BLE advertising started successfully');
    });

    const failedListener = BLEEventEmitter.addListener('BLE_ADVERTISE_FAILED', (errorCode) => {
      Alert.alert('BLE Error', `Advertising failed with code: ${errorCode}`);
      setIsAdvertising(false);
    });

    const readListener = BLEEventEmitter.addListener('BLE_CREDENTIAL_READ', (deviceAddress) => {
      console.log('Credential read by device:', deviceAddress);
      setConnectionCount(prev => prev + 1);
    });

    return () => {
      successListener.remove();
      failedListener.remove();
      readListener.remove();
    };
  }, []);

  const startBLEAdvertising = async () => {
    try {
      if (!credentialData.trim()) {
        Alert.alert('Error', 'Please enter credential data');
        return;
      }

      // Encrypt credential data
      const encrypted = await SecurityNative.encryptData(credentialData);
      
      // Start BLE advertising
      await BLENative.startAdvertising(encrypted.encryptedData);
      
      setIsAdvertising(true);
      Alert.alert('Success', 'BLE advertising started. Device is discoverable.');
    } catch (error: any) {
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
        <Text style={styles.label}>Credential Data:</Text>
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
        style={[styles.button, isAdvertising ? styles.stopButton : styles.startButton]}
        onPress={isAdvertising ? stopBLEAdvertising : startBLEAdvertising}
      >
        <Text style={styles.buttonText}>
          {isAdvertising ? 'Stop Advertising' : 'Start Advertising'}
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