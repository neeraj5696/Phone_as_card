package com.phone_as_card

import android.bluetooth.*
import android.bluetooth.le.*
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.ParcelUuid
import androidx.core.app.ActivityCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.*

class BLEModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    private val bluetoothManager = reactContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
    private val bluetoothAdapter = bluetoothManager.adapter
    private var advertiser: BluetoothLeAdvertiser? = null
    private var gattServer: BluetoothGattServer? = null
    
    companion object {
        private val SERVICE_UUID = UUID.fromString("12345678-1234-1234-1234-123456789abc")
        private val CREDENTIAL_CHAR_UUID = UUID.fromString("87654321-4321-4321-4321-cba987654321")
    }
    
    override fun getName(): String = "BLEModule"
    
    @ReactMethod
    fun isBLEEnabled(promise: Promise) {
        try {
            promise.resolve(bluetoothAdapter?.isEnabled ?: false)
        } catch (e: Exception) {
            promise.reject("BLE_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun checkPermissions(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val hasAdvertise = ActivityCompat.checkSelfPermission(
                    reactApplicationContext, 
                    android.Manifest.permission.BLUETOOTH_ADVERTISE
                ) == PackageManager.PERMISSION_GRANTED
                
                val hasConnect = ActivityCompat.checkSelfPermission(
                    reactApplicationContext, 
                    android.Manifest.permission.BLUETOOTH_CONNECT
                ) == PackageManager.PERMISSION_GRANTED
                
                promise.resolve(hasAdvertise && hasConnect)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun startAdvertising(credentialData: String, promise: Promise) {
        try {
            if (!bluetoothAdapter.isEnabled) {
                promise.reject("BLE_DISABLED", "Bluetooth is disabled")
                return
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (ActivityCompat.checkSelfPermission(
                    reactApplicationContext, 
                    android.Manifest.permission.BLUETOOTH_ADVERTISE
                ) != PackageManager.PERMISSION_GRANTED) {
                    promise.reject("PERMISSION_ERROR", "BLUETOOTH_ADVERTISE permission required")
                    return
                }
            }
            
            advertiser = bluetoothAdapter.bluetoothLeAdvertiser
            
            val settings = AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                .setConnectable(true)
                .build()
            
            val data = AdvertiseData.Builder()
                .setIncludeDeviceName(false)
                .setIncludeTxPowerLevel(false)
                .addServiceUuid(ParcelUuid(SERVICE_UUID))
                .build()
            
            setupGattServer(credentialData)
            
            advertiser?.startAdvertising(settings, data, advertiseCallback)
            promise.resolve(true)
            
        } catch (e: Exception) {
            promise.reject("ADVERTISE_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun stopAdvertising(promise: Promise) {
        try {
            advertiser?.stopAdvertising(advertiseCallback)
            gattServer?.close()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message)
        }
    }
    
    private fun setupGattServer(credentialData: String) {
        android.util.Log.d("BLE_MODULE", "Setting up GATT server with credential data length: ${credentialData.length}")
        
        val service = BluetoothGattService(SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)
        
        val characteristic = BluetoothGattCharacteristic(
            CREDENTIAL_CHAR_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ,
            BluetoothGattCharacteristic.PERMISSION_READ
        )
        val dataBytes = credentialData.toByteArray()
        characteristic.value = dataBytes
        
        android.util.Log.d("BLE_MODULE", "Characteristic data: ${dataBytes.joinToString(" ") { "%02X".format(it) }}")
        
        service.addCharacteristic(characteristic)
        
        gattServer = bluetoothManager.openGattServer(reactApplicationContext, gattServerCallback)
        gattServer?.addService(service)
        
        android.util.Log.d("BLE_MODULE", "GATT server setup complete")
    }
    
    private val advertiseCallback = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
            android.util.Log.d("BLE_MODULE", "BLE advertising started successfully")
            sendEvent("BLE_ADVERTISE_SUCCESS", null)
        }
        
        override fun onStartFailure(errorCode: Int) {
            android.util.Log.e("BLE_MODULE", "BLE advertising failed with code: $errorCode")
            sendEvent("BLE_ADVERTISE_FAILED", errorCode)
        }
    }
    
    private val gattServerCallback = object : BluetoothGattServerCallback() {
        override fun onCharacteristicReadRequest(
            device: BluetoothDevice?,
            requestId: Int,
            offset: Int,
            characteristic: BluetoothGattCharacteristic?
        ) {
            val data = characteristic?.value
            android.util.Log.d("BLE_GATT", "\n🔵 === ACCESS CONTROL READER CONNECTION ===")
            android.util.Log.d("BLE_GATT", "📱 Reader device: ${device?.address}")
            android.util.Log.d("BLE_GATT", "📤 Transmitting encrypted credentials")
            android.util.Log.d("BLE_GATT", "📏 Data size: ${data?.size ?: 0} bytes")
            if (data != null) {
                android.util.Log.d("BLE_GATT", "🔐 Encrypted payload: ${data.joinToString(" ") { "%02X".format(it) }}")
                android.util.Log.d("BLE_GATT", "✅ Credential data sent to access control system")
            }
            gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, data)
            sendEvent("BLE_CREDENTIAL_READ", device?.address)
        }
        
        override fun onConnectionStateChange(device: BluetoothDevice?, status: Int, newState: Int) {
            when (newState) {
                2 -> android.util.Log.d("BLE_GATT", "🔗 Access control reader CONNECTED: ${device?.address}")
                0 -> android.util.Log.d("BLE_GATT", "🔌 Access control reader DISCONNECTED: ${device?.address}")
                else -> android.util.Log.d("BLE_GATT", "🔄 Connection state: $newState for ${device?.address}")
            }
        }
    }
    
    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RCTEventEmitter
    }
    
    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RCTEventEmitter
    }
    
    private fun sendEvent(eventName: String, params: Any?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}