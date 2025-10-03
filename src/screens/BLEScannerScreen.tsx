import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert, FlatList, PermissionsAndroid, Platform} from 'react-native';
import {BLECentralNative, BLECentralEventEmitter} from '../services/NativeModules';

interface BLEDevice {
  address: string;
  name: string;
  rssi: number;
}

const BLEScannerScreen: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<BLEDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null);
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    // Auto-start scanning when component mounts
    const autoStartScan = async () => {
      try {
        console.log('🔄 [AUTO] Starting automatic BLE scan...');
        
        // Request permissions first
        console.log('🔒 [AUTO] Requesting Bluetooth permissions...');
        const hasPermissions = await requestBluetoothPermissions();
        if (!hasPermissions) {
          console.error('❌ [AUTO] Missing BLE scan permissions');
          Alert.alert('Permissions Required', 'Bluetooth scan permissions needed for auto-scan');
          return;
        }
        console.log('✅ [AUTO] Bluetooth permissions granted');
        
        await BLECentralNative.startScan();
        setIsScanning(true);
        console.log('✅ [AUTO] Automatic scan started');
      } catch (error: any) {
        console.error('❌ [AUTO] Auto-scan failed:', error.message);
      }
    };
    
    autoStartScan();
    
    const deviceFoundListener = BLECentralEventEmitter.addListener('BLE_DEVICE_FOUND', (device: BLEDevice) => {
      console.log(`📱 [FOUND] Device: ${device.name || 'Unknown'} | Address: ${device.address} | RSSI: ${device.rssi}dBm`);
      
      setDevices(prev => {
        const exists = prev.find(d => d.address === device.address);
        if (exists) return prev;
        return [...prev, device];
      });
      
      // Auto-connect to first CSN Mobile device found
      if (!connectedDevice && devices.length === 0) {
        console.log('🎯 [AUTO] Found CSN Mobile device - connecting immediately...');
        connectToDevice(device.address);
      }
    });

    const connectedListener = BLECentralEventEmitter.addListener('BLE_CONNECTED', (address: string) => {
      console.log(`✅ [CONNECTED] Successfully connected to CSN Mobile device: ${address}`);
      console.log('🔍 [AUTO] Starting service discovery for CSN/ToM services...');
      setConnectedDevice(address);
    });

    const disconnectedListener = BLECentralEventEmitter.addListener('BLE_DISCONNECTED', (address: string) => {
      setConnectedDevice(null);
      setServices([]);
    //  Alert.alert('Disconnected', `Disconnected from device: ${address}`);
    });

    const servicesListener = BLECentralEventEmitter.addListener('BLE_SERVICES_DISCOVERED', (discoveredServices: any[]) => {
      console.log(`📋 [SERVICES] Discovered ${discoveredServices.length} services from CSN Mobile device`);
      
      discoveredServices.forEach((service, index) => {
        console.log(`  📝 Service ${index + 1}: ${service.uuid}`);
        if (service.characteristics) {
          service.characteristics.forEach((char: any) => {
            console.log(`    🔑 Characteristic: ${char.uuid}`);
          });
        }
      });
      
      setServices(discoveredServices);
      
      // Immediately read CSN data
      console.log('📥 [AUTO] Reading CSN credential data...');
      setTimeout(() => {
        readCharacteristic();
      }, 500);
    });

    const readListener = BLECentralEventEmitter.addListener('BLE_CHARACTERISTIC_READ', (result: any) => {
      console.log(`📅 [DATA] CSN Credential received from ${result.uuid}`);
      console.log(`🔐 [CREDENTIAL] Data: ${result.data}`);
      console.log('✅ [SUCCESS] CSN Mobile credential access complete!');
      
      // Enable notifications for live updates
      console.log('🔔 [AUTO] Setting up live credential monitoring...');
      setTimeout(() => {
        enableNotifications();
      }, 300);
    });

    const notificationListener = BLECentralEventEmitter.addListener('BLE_NOTIFICATION_RECEIVED', (result: any) => {
      console.log(`🔔 [LIVE] CSN credential update from ${result.uuid}: ${result.data}`);
      console.log('⚡ [MONITOR] Live CSN Mobile monitoring active');
    });

    return () => {
      deviceFoundListener.remove();
      connectedListener.remove();
      disconnectedListener.remove();
      servicesListener.remove();
      readListener.remove();
      notificationListener.remove();
    };
  }, []);

  const startScan = async () => {
    try {
      console.log('🔍 [MANUAL] Manual scan restart...');
      
      // Request permissions first
      console.log('🔒 [PERM] Requesting Bluetooth permissions...');
      const hasPermissions = await requestBluetoothPermissions();
      if (!hasPermissions) {
        console.error('❌ [PERM] Bluetooth permissions denied');
        Alert.alert('Permissions Required', 'Please grant Bluetooth scan permissions');
        return;
      }
      console.log('✅ [PERM] Bluetooth permissions granted');
      
      setDevices([]);
      await BLECentralNative.startScan();
      setIsScanning(true);
      console.log('✅ [MANUAL] Manual scan restarted');
    } catch (error: any) {
      console.error('❌ [MANUAL] Manual scan error:', error.message);
    }
  };

  const stopScan = async () => {
    try {
      await BLECentralNative.stopScan();
      setIsScanning(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const connectToDevice = async (address: string) => {
    try {
      console.log(`🔗 [CONNECT] Connecting to CSN Mobile device: ${address}`);
      await BLECentralNative.connectToDevice(address);
      console.log(`📡 [CONNECT] Connection request sent - waiting for CSN services...`);
    } catch (error: any) {
      console.error('❌ [CONNECT] Connection failed:', error.message);
    }
  };

  const disconnect = async () => {
    try {
      await BLECentralNative.disconnect();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const readCharacteristic = async () => {
    try {
      console.log('📥 [READ] Reading CSN credential data...');
      await BLECentralNative.readCharacteristic();
      console.log('📤 [READ] CSN read request sent');
    } catch (error: any) {
      console.error('❌ [read] CSN read failed:', error.message);
    }
  };

  const enableNotifications = async () => {
    try {
      await BLECentralNative.enableNotifications();
      console.log('🔔 [MONITOR] CSN Mobile live monitoring enabled');
    } catch (error: any) {
      console.error('❌ [MONITOR] Live monitoring setup failed:', error.message);
    }
  };
  
  const requestBluetoothPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        
        return (
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const renderDevice = ({item}: {item: BLEDevice}) => (
    <TouchableOpacity 
      style={styles.deviceItem}
      onPress={() => connectToDevice(item.address)}
    >
      <Text style={styles.deviceName}>{item.name}</Text>
      <Text style={styles.deviceAddress}>{item.address}</Text>
      <Text style={styles.deviceRssi}>RSSI: {item.rssi}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BLE Scanner</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.autoLabel}>🤖 AUTOMATIC MODE ACTIVE</Text>
        <Text style={styles.statusText}>Scanning: {isScanning ? '✅ Active' : '❌ Stopped'}</Text>
        <Text style={styles.statusText}>Devices Found: {devices.length}</Text>
        {connectedDevice && <Text style={styles.statusText}>Connected: ✅ {connectedDevice}</Text>}
        <Text style={styles.statusText}>Services: {services.length}</Text>
      </View>
      
      <View style={styles.controls}>
        <TouchableOpacity style={styles.emergencyButton} onPress={stopScan}>
          <Text style={styles.buttonText}>🛑 Emergency Stop</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.restartButton} onPress={startScan}>
          <Text style={styles.buttonText}>🔄 Restart Scan</Text>
        </TouchableOpacity>

        {connectedDevice && (
          <TouchableOpacity style={styles.disconnectButton} onPress={disconnect}>
            <Text style={styles.buttonText}>🔌 Disconnect</Text>
          </TouchableOpacity>
        )}
      </View>

      {connectedDevice && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>Connected to: {connectedDevice}</Text>
          <Text style={styles.statusText}>Services: {services.length}</Text>
        </View>
      )}

      <FlatList
        data={devices}
        renderItem={renderDevice}
        keyExtractor={(item) => item.address}
        style={styles.deviceList}
      />
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
    marginBottom: 20,
  },
  autoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
    textAlign: 'center',
    marginBottom: 10,
  },
  emergencyButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  restartButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  controls: {
    marginBottom: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  actionButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 5,
  },
  disconnectButton: {
    backgroundColor: '#FF9800',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  connectedControls: {
    marginTop: 10,
  },
  statusContainer: {
    backgroundColor: '#E8F5E8',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  statusText: {
    fontSize: 14,
    color: '#2E7D32',
  },
  deviceList: {
    flex: 1,
  },
  deviceItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  deviceAddress: {
    fontSize: 14,
    color: '#666',
  },
  deviceRssi: {
    fontSize: 12,
    color: '#999',
  },
});

export default BLEScannerScreen;