import React, {useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert} from 'react-native';
import TouchID from 'react-native-touch-id';
import {SecurityNative} from '../services/NativeModules';

interface Props {
  navigation: any;
}

const AuthScreen: React.FC<Props> = ({navigation}) => {
  useEffect(() => {
    initializeSecurity();
  }, []);

  const initializeSecurity = async () => {
    try {
      await SecurityNative.generateSecureKey();
    } catch (error) {
      console.log('Security initialization failed:', error);
    }
  };

  const authenticate = () => {
    TouchID.authenticate('Access Phone as Card', {
      fallbackLabel: 'Use PIN',
      unifiedErrors: false,
    })
      .then(() => {
        navigation.replace('Home');
      })
      .catch((error: any) => {
        Alert.alert('Authentication Failed', error.message);
      });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Phone as Card</Text>
      <Text style={styles.subtitle}>Secure Access Control</Text>
      
      <TouchableOpacity style={styles.authButton} onPress={authenticate}>
        <Text style={styles.authButtonText}>Authenticate</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 50,
  },
  authButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 8,
  },
  authButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default AuthScreen;