package com.phone_as_card

import android.bluetooth.*
import android.bluetooth.le.*
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.*

class BLECentralModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    private val bluetoothManager = reactContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
    private val bluetoothAdapter = bluetoothManager.adapter
    private var scanner: BluetoothLeScanner? = null
    private var bluetoothGatt: BluetoothGatt? = null
    private var targetDevice: BluetoothDevice? = null
    
    companion object {
        // CSN Mobile service UUIDs to match advertising device
        private val CSN_SERVICE_UUID = UUID.fromString("0000FFE0-0000-1000-8000-00805F9B34FB")
        private val CSN_CHAR_UUID = UUID.fromString("0000FFE1-0000-1000-8000-00805F9B34FB")
        private val TOM_SERVICE_UUID = UUID.fromString("0000FFE2-0000-1000-8000-00805F9B34FB")
        private val TOM_CHAR_UUID = UUID.fromString("0000FFE3-0000-1000-8000-00805F9B34FB")
        private val CCCD_UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
    }
    
    override fun getName(): String = "BLECentralModule"
    
    @ReactMethod
    fun startScan(promise: Promise) {
        try {
            android.util.Log.d("BLE_DEV", "🔍 [SCAN] Starting BLE scan...")
            if (!bluetoothAdapter.isEnabled) {
                android.util.Log.e("BLE_DEV", "❌ [SCAN] Bluetooth is disabled")
                promise.reject("BLE_DISABLED", "Bluetooth is disabled")
                return
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (ActivityCompat.checkSelfPermission(
                    reactApplicationContext, 
                    android.Manifest.permission.BLUETOOTH_SCAN
                ) != PackageManager.PERMISSION_GRANTED) {
                    android.util.Log.e("BLE_DEV", "❌ [SCAN] Missing BLUETOOTH_SCAN permission")
                    promise.reject("PERMISSION_ERROR", "BLUETOOTH_SCAN permission required")
                    return
                }
            }
            
            scanner = bluetoothAdapter.bluetoothLeScanner
            
            val settings = ScanSettings.Builder()
                .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                .setCallbackType(ScanSettings.CALLBACK_TYPE_ALL_MATCHES)
                .build()
            
            // Scan for ALL devices (no filters) to find advertising device
            android.util.Log.d("BLE_DEV", "📡 [SCAN] Scanning for ALL BLE devices (no filters)")
            
            scanner?.startScan(null, settings, scanCallback)
            android.util.Log.d("BLE_DEV", "✅ [SCAN] BLE scan started successfully")
            promise.resolve(true)
            
        } catch (e: Exception) {
            android.util.Log.e("BLE_DEV", "❌ [SCAN] Error: ${e.message}")
            promise.reject("SCAN_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun stopScan(promise: Promise) {
        try {
            scanner?.stopScan(scanCallback)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_SCAN_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun connectToDevice(deviceAddress: String, promise: Promise) {
        try {
            val device = bluetoothAdapter.getRemoteDevice(deviceAddress)
            targetDevice = device
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (ActivityCompat.checkSelfPermission(
                    reactApplicationContext, 
                    android.Manifest.permission.BLUETOOTH_CONNECT
                ) != PackageManager.PERMISSION_GRANTED) {
                    promise.reject("PERMISSION_ERROR", "BLUETOOTH_CONNECT permission required")
                    return
                }
            }
            
            bluetoothGatt = device.connectGatt(reactApplicationContext, false, gattCallback)
            promise.resolve(true)
            
        } catch (e: Exception) {
            promise.reject("CONNECT_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun disconnect(promise: Promise) {
        try {
            bluetoothGatt?.disconnect()
            bluetoothGatt?.close()
            bluetoothGatt = null
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("DISCONNECT_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun readCharacteristic(promise: Promise) {
        try {
            // Try CSN service first
            var service = bluetoothGatt?.getService(CSN_SERVICE_UUID)
            var characteristic = service?.getCharacteristic(CSN_CHAR_UUID)
            
            // If CSN not found, try ToM service
            if (characteristic == null) {
                service = bluetoothGatt?.getService(TOM_SERVICE_UUID)
                characteristic = service?.getCharacteristic(TOM_CHAR_UUID)
            }
            
            if (characteristic != null) {
                android.util.Log.d("BLE_DEV", "📖 [READ] Reading from service: ${service?.uuid}, char: ${characteristic.uuid}")
                bluetoothGatt?.readCharacteristic(characteristic)
                promise.resolve(true)
            } else {
                promise.reject("CHAR_NOT_FOUND", "CSN/ToM characteristics not found")
            }
        } catch (e: Exception) {
            promise.reject("READ_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun writeCharacteristic(data: String, promise: Promise) {
        try {
            // Try CSN service first
            var service = bluetoothGatt?.getService(CSN_SERVICE_UUID)
            var characteristic = service?.getCharacteristic(CSN_CHAR_UUID)
            
            // If CSN not found, try ToM service
            if (characteristic == null) {
                service = bluetoothGatt?.getService(TOM_SERVICE_UUID)
                characteristic = service?.getCharacteristic(TOM_CHAR_UUID)
            }
            
            if (characteristic != null) {
                characteristic.value = data.toByteArray()
                bluetoothGatt?.writeCharacteristic(characteristic)
                promise.resolve(true)
            } else {
                promise.reject("CHAR_NOT_FOUND", "CSN/ToM characteristics not found")
            }
        } catch (e: Exception) {
            promise.reject("WRITE_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun enableNotifications(promise: Promise) {
        try {
            // Try CSN service first
            var service = bluetoothGatt?.getService(CSN_SERVICE_UUID)
            var characteristic = service?.getCharacteristic(CSN_CHAR_UUID)
            
            // If CSN not found, try ToM service
            if (characteristic == null) {
                service = bluetoothGatt?.getService(TOM_SERVICE_UUID)
                characteristic = service?.getCharacteristic(TOM_CHAR_UUID)
            }
            
            if (characteristic != null) {
                android.util.Log.d("BLE_DEV", "🔔 [NOTIFY] Enabling notifications for ${characteristic.uuid}")
                bluetoothGatt?.setCharacteristicNotification(characteristic, true)
                
                val descriptor = characteristic.getDescriptor(CCCD_UUID)
                if (descriptor != null) {
                    descriptor.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                    bluetoothGatt?.writeDescriptor(descriptor)
                    promise.resolve(true)
                } else {
                    android.util.Log.w("BLE_DEV", "⚠️ [NOTIFY] CCCD descriptor not found, notifications may not work")
                    promise.resolve(false)
                }
            } else {
                promise.reject("CHAR_NOT_FOUND", "CSN/ToM characteristics not found")
            }
        } catch (e: Exception) {
            promise.reject("NOTIFICATION_ERROR", e.message)
        }
    }
    
    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult?) {
            result?.let { scanResult ->
                val device = scanResult.device
                val rssi = scanResult.rssi
                val deviceName = device.name ?: "Unknown"
                
                android.util.Log.d("BLE_DEV", "📱 [DEVICE_FOUND] Device: $deviceName (${device.address}) RSSI: $rssi")
                
                // Log advertisement data for debugging
                val scanRecord = scanResult.scanRecord
                scanRecord?.let { record ->
                    android.util.Log.d("BLE_DEV", "📝 [AD_DATA] Device name: ${record.deviceName ?: "None"}")
                    android.util.Log.d("BLE_DEV", "📝 [AD_DATA] Service UUIDs: ${record.serviceUuids?.joinToString() ?: "None"}")
                }
                
                val deviceInfo = WritableNativeMap().apply {
                    putString("address", device.address)
                    putString("name", deviceName)
                    putInt("rssi", rssi)
                }
                
                sendEvent("BLE_DEVICE_FOUND", deviceInfo)
            }
        }
        
        override fun onScanFailed(errorCode: Int) {
            android.util.Log.e("BLE_DEV", "❌ [SCAN_FAILED] Error code: $errorCode")
            sendEvent("BLE_SCAN_FAILED", errorCode)
        }
    }
    
    private val gattCallback = object : BluetoothGattCallback() {
        override fun onConnectionStateChange(gatt: BluetoothGatt?, status: Int, newState: Int) {
            when (newState) {
                BluetoothProfile.STATE_CONNECTED -> {
                    android.util.Log.d("BLE_DEV", "🔗 [CONNECTED] Successfully connected to ${gatt?.device?.address}")
                    sendEvent("BLE_CONNECTED", gatt?.device?.address)
                    android.util.Log.d("BLE_DEV", "🔍 [SERVICES] Starting service discovery...")
                    gatt?.discoverServices()
                }
                BluetoothProfile.STATE_DISCONNECTED -> {
                    android.util.Log.d("BLE_DEV", "🔌 [DISCONNECTED] Device ${gatt?.device?.address} disconnected")
                    sendEvent("BLE_DISCONNECTED", gatt?.device?.address)
                }
            }
        }
        
        override fun onServicesDiscovered(gatt: BluetoothGatt?, status: Int) {
            if (status == BluetoothGatt.GATT_SUCCESS) {
                val services = gatt?.services?.map { service ->
                    WritableNativeMap().apply {
                        putString("uuid", service.uuid.toString())
                        val characteristics = WritableNativeArray()
                        service.characteristics.forEach { char ->
                            val charMap = WritableNativeMap().apply {
                                putString("uuid", char.uuid.toString())
                                putInt("properties", char.properties)
                            }
                            characteristics.pushMap(charMap)
                        }
                        putArray("characteristics", characteristics)
                    }
                }
                
                val servicesArray = WritableNativeArray()
                services?.forEach { servicesArray.pushMap(it) }
                
                sendEvent("BLE_SERVICES_DISCOVERED", servicesArray)
            }
        }
        
        override fun onCharacteristicRead(gatt: BluetoothGatt?, characteristic: BluetoothGattCharacteristic?, status: Int) {
            if (status == BluetoothGatt.GATT_SUCCESS) {
                val data = characteristic?.value?.let { String(it) } ?: ""
                val result = WritableNativeMap().apply {
                    putString("uuid", characteristic?.uuid.toString())
                    putString("data", data)
                }
                sendEvent("BLE_CHARACTERISTIC_READ", result)
            }
        }
        
        override fun onCharacteristicWrite(gatt: BluetoothGatt?, characteristic: BluetoothGattCharacteristic?, status: Int) {
            val result = WritableNativeMap().apply {
                putString("uuid", characteristic?.uuid.toString())
                putBoolean("success", status == BluetoothGatt.GATT_SUCCESS)
            }
            sendEvent("BLE_CHARACTERISTIC_WRITE", result)
        }
        
        override fun onCharacteristicChanged(gatt: BluetoothGatt?, characteristic: BluetoothGattCharacteristic?) {
            val data = characteristic?.value?.let { String(it) } ?: ""
            val result = WritableNativeMap().apply {
                putString("uuid", characteristic?.uuid.toString())
                putString("data", data)
            }
            sendEvent("BLE_NOTIFICATION_RECEIVED", result)
        }
        
        override fun onDescriptorWrite(gatt: BluetoothGatt?, descriptor: BluetoothGattDescriptor?, status: Int) {
            if (descriptor?.uuid == CCCD_UUID) {
                sendEvent("BLE_NOTIFICATIONS_ENABLED", status == BluetoothGatt.GATT_SUCCESS)
            }
        }
    }
    
    @ReactMethod
    fun addListener(eventName: String) {}
    
    @ReactMethod
    fun removeListeners(count: Int) {}
    
    private fun sendEvent(eventName: String, params: Any?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}