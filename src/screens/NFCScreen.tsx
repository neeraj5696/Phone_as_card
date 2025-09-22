import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert, TextInput} from 'react-native';
import {NFCNative, SecurityNative} from '../services/NativeModules';

const NFCScreen: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [cardData, setCardData] = useState('');
  const [aid, setAid] = useState('F0394148148100');

  const startNFCEmulation = async () => {
    try {
      if (!cardData.trim()) {
        Alert.alert('Error', 'Please enter card data');
        return;
      }

      // Encrypt card data
      const encrypted = await SecurityNative.encryptData(cardData);
      
      // Enable HCE with AID
      await NFCNative.enableHCE(aid);
      
      // Set credentials
      await NFCNative.setCredentials(encrypted.encryptedData, 'READ_WRITE');
      
      setIsActive(true);
      Alert.alert('Success', 'NFC card emulation started. Tap your phone to a reader.');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const stopNFCEmulation = () => {
    setIsActive(false);
    Alert.alert('Stopped', 'NFC card emulation stopped');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>NFC Card Emulation</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Application ID (AID):</Text>
        <TextInput
          style={styles.input}
          value={aid}
          onChangeText={setAid}
          placeholder="Enter AID (hex)"
          maxLength={14}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Card Data:</Text>
        <TextInput
          style={styles.input}
          value={cardData}
          onChangeText={setCardData}
          placeholder="Enter card credential data"
          secureTextEntry
        />
      </View>

      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Status:</Text>
        <Text style={[styles.status, isActive ? styles.active : styles.inactive]}>
          {isActive ? 'ACTIVE - Ready to tap' : 'INACTIVE'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, isActive ? styles.stopButton : styles.startButton]}
        onPress={isActive ? stopNFCEmulation : startNFCEmulation}
      >
        <Text style={styles.buttonText}>
          {isActive ? 'Stop Emulation' : 'Start Emulation'}
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
    marginBottom: 30,
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
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
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
});

export default NFCScreen;