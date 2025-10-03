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
        // Suprema BLE service UUIDs
        private val SUPREMA_SERVICE_UUID = UUID.fromString("6E400001-B5A3-F393-E0A9-E50E24DCCA9E")
        private val SUPREMA_TX_CHAR_UUID = UUID.fromString("6E400002-B5A3-F393-E0A9-E50E24DCCA9E")
        private val SUPREMA_RX_CHAR_UUID = UUID.fromString("6E400003-B5A3-F393-E0A9-E50E24DCCA9E")
        
        // CSN Mobile service UUIDs
        private val CSN_SERVICE_UUID = UUID.fromString("0000FFE0-0000-1000-8000-00805F9B34FB")
        private val CSN_CHAR_UUID = UUID.fromString("0000FFE1-0000-1000-8000-00805F9B34FB")
        
        // Template on Mobile (ToM) service UUIDs
        private val TOM_SERVICE_UUID = UUID.fromString("0000FFE2-0000-1000-8000-00805F9B34FB")
        private val TOM_CHAR_UUID = UUID.fromString("0000FFE3-0000-1000-8000-00805F9B34FB")
        
        // Legacy UUIDs
        private val SERVICE_UUID = UUID.fromString("12345678-1234-1234-1234-123456789abc")
        private val CREDENTIAL_CHAR_UUID = UUID.fromString("87654321-4321-4321-4321-cba987654321")
        
        private val IBEACON_UUID = UUID.fromString("B9407F30-F5F8-466E-AFF9-25556B57FE6D")
        private const val MAJOR = 1
        private const val MINOR = 1
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
    fun startSupremaAdvertising(userId: String, expiryDate: String, promise: Promise) {
        try {
            val supremaData = createSupremaCredential(userId, expiryDate)
            startSupremaBLE(supremaData, promise)
        } catch (e: Exception) {
            promise.reject("SUPREMA_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun startCSNAdvertising(csnData: String, promise: Promise) {
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
            
            // CSN Mobile advertising settings
            val settings = AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_BALANCED)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                .setConnectable(true)
                .setTimeout(0)
                .build()
            
            // CSN Mobile advertising data
            val data = AdvertiseData.Builder()
                .setIncludeDeviceName(true)
                .setIncludeTxPowerLevel(true)
                .addServiceUuid(ParcelUuid(CSN_SERVICE_UUID))
                .addServiceUuid(ParcelUuid(TOM_SERVICE_UUID)) // Support both CSN and ToM
                .build()
            
            setupCSNGattServer(csnData)
            
            android.util.Log.d("BLE_MODULE", "🔵 Starting CSN Mobile BLE advertising")
            android.util.Log.d("BLE_MODULE", "📡 CSN Service UUID: ${CSN_SERVICE_UUID}")
            android.util.Log.d("BLE_MODULE", "📡 ToM Service UUID: ${TOM_SERVICE_UUID}")
            android.util.Log.d("BLE_MODULE", "🔢 CSN Data (MSB): ${formatCSNData(csnData)}")
            
            advertiser?.startAdvertising(settings, data, advertiseCallback)
            promise.resolve(true)
            
        } catch (e: Exception) {
            promise.reject("CSN_ADVERTISE_ERROR", e.message)
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
            
            // Enhanced advertising settings for better access control compatibility
            val settings = AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_BALANCED) // More compatible than LOW_LATENCY
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                .setConnectable(true)
                .setTimeout(0) // No timeout for continuous advertising
                .build()
            
            // Enhanced advertising data with multiple service UUIDs and device name
            val data = AdvertiseData.Builder()
                .setIncludeDeviceName(true) // Include device name for better discovery
                .setIncludeTxPowerLevel(true) // Include TX power for distance estimation
                .addServiceUuid(ParcelUuid(SERVICE_UUID))
                .addServiceUuid(ParcelUuid(IBEACON_UUID)) // Add iBeacon UUID
                .addManufacturerData(0x004C, createiBeaconData()) // Apple manufacturer data for iBeacon
                .build()
            
            setupGattServer(credentialData)
            
            android.util.Log.d("BLE_MODULE", "🔵 Starting BLE advertising with enhanced compatibility")
            android.util.Log.d("BLE_MODULE", "📡 Service UUIDs: ${SERVICE_UUID}, ${IBEACON_UUID}")
            android.util.Log.d("BLE_MODULE", "📊 Advertising mode: BALANCED, TX Power: HIGH")
            
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
    
    private fun formatCSNData(csnData: String): String {
        // Convert CSN to MSB byte order (Most Significant Byte first)
        try {
            val csnLong = csnData.toLongOrNull() ?: 1L
            val csnBytes = ByteArray(8) { i ->
                ((csnLong shr (56 - i * 8)) and 0xFF).toByte()
            }
            return csnBytes.joinToString(" ") { "%02X".format(it) }
        } catch (e: Exception) {
            return "Invalid CSN format"
        }
    }
    
    private fun createCSNData(csnData: String): ByteArray {
        // Create CSN data in MSB byte order for access control system
        try {
            val csnLong = csnData.toLongOrNull() ?: 1L
            return ByteArray(8) { i ->
                ((csnLong shr (56 - i * 8)) and 0xFF).toByte()
            }
        } catch (e: Exception) {
            // Fallback to default CSN
            return byteArrayOf(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01)
        }
    }
    
    private fun createiBeaconData(): ByteArray {
        val uuidBytes = IBEACON_UUID.toString().replace("-", "")
            .chunked(2)
            .map { it.toInt(16).toByte() }
            .toByteArray()
        
        val iBeaconPrefix = byteArrayOf(
            0x02, 0x15 // iBeacon identifier
        ) + uuidBytes + byteArrayOf(
            // Major (2 bytes)
            (MAJOR shr 8).toByte(), (MAJOR and 0xFF).toByte(),
            // Minor (2 bytes)
            (MINOR shr 8).toByte(), (MINOR and 0xFF).toByte(),
            // TX Power (1 byte)
            0xC5.toByte()
        )
        return iBeaconPrefix
    }

    private fun createSupremaCredential(userId: String, expiryDate: String): ByteArray {
        // Suprema BLE credential format: [Header][UserID][ExpiryDate][Checksum]
        val userIdBytes = userId.toInt().let { id ->
            byteArrayOf(
                ((id shr 24) and 0xFF).toByte(),
                ((id shr 16) and 0xFF).toByte(), 
                ((id shr 8) and 0xFF).toByte(),
                (id and 0xFF).toByte()
            )
        }
        
        // Convert expiry date (YYYYMMDD) to timestamp
        val expiryBytes = expiryDate.toLongOrNull()?.let { date ->
            byteArrayOf(
                ((date shr 24) and 0xFF).toByte(),
                ((date shr 16) and 0xFF).toByte(),
                ((date shr 8) and 0xFF).toByte(), 
                (date and 0xFF).toByte()
            )
        } ?: byteArrayOf(0xFF.toByte(), 0xFF.toByte(), 0xFF.toByte(), 0xFF.toByte())
        
        return byteArrayOf(0x53.toByte(), 0x55.toByte()) + userIdBytes + expiryBytes
    }
    
    private fun startSupremaBLE(credentialData: ByteArray, promise: Promise) {
        if (!bluetoothAdapter.isEnabled) {
            promise.reject("BLE_DISABLED", "Bluetooth is disabled")
            return
        }
        
        advertiser = bluetoothAdapter.bluetoothLeAdvertiser
        
        val settings = AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
            .setConnectable(true)
            .build()
        
        val data = AdvertiseData.Builder()
            .setIncludeDeviceName(true)
            .addServiceUuid(ParcelUuid(SUPREMA_SERVICE_UUID))
            .build()
        
        setupSupremaGattServer(credentialData)
        advertiser?.startAdvertising(settings, data, advertiseCallback)
        promise.resolve(true)
    }
    
    private fun setupSupremaGattServer(credentialData: ByteArray) {
        val service = BluetoothGattService(SUPREMA_SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)
        
        val txChar = BluetoothGattCharacteristic(
            SUPREMA_TX_CHAR_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ or BluetoothGattCharacteristic.PROPERTY_NOTIFY,
            BluetoothGattCharacteristic.PERMISSION_READ
        )
        txChar.value = credentialData
        
        val rxChar = BluetoothGattCharacteristic(
            SUPREMA_RX_CHAR_UUID,
            BluetoothGattCharacteristic.PROPERTY_WRITE,
            BluetoothGattCharacteristic.PERMISSION_WRITE
        )
        
        service.addCharacteristic(txChar)
        service.addCharacteristic(rxChar)
        
        gattServer = bluetoothManager.openGattServer(reactApplicationContext, gattServerCallback)
        gattServer?.addService(service)
    }
    
    private fun setupCSNGattServer(csnData: String) {
        android.util.Log.d("BLE_MODULE", "Setting up CSN Mobile GATT server with CSN: $csnData")
        
        // CSN Mobile Service
        val csnService = BluetoothGattService(CSN_SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)
        
        val csnCharacteristic = BluetoothGattCharacteristic(
            CSN_CHAR_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ,
            BluetoothGattCharacteristic.PERMISSION_READ
        )
        val csnBytes = createCSNData(csnData)
        csnCharacteristic.value = csnBytes
        
        android.util.Log.d("BLE_MODULE", "CSN Characteristic data (MSB): ${csnBytes.joinToString(" ") { "%02X".format(it) }}")
        
        csnService.addCharacteristic(csnCharacteristic)
        
        // Template on Mobile (ToM) Service (for biometric template)
        val tomService = BluetoothGattService(TOM_SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)
        
        val tomCharacteristic = BluetoothGattCharacteristic(
            TOM_CHAR_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ,
            BluetoothGattCharacteristic.PERMISSION_READ
        )
        // For now, send CSN as template (can be enhanced with actual biometric data)
        tomCharacteristic.value = csnBytes
        
        tomService.addCharacteristic(tomCharacteristic)
        
        gattServer = bluetoothManager.openGattServer(reactApplicationContext, gattServerCallback)
        gattServer?.addService(csnService)
        gattServer?.addService(tomService)
        
        android.util.Log.d("BLE_MODULE", "CSN Mobile GATT server setup complete")
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
            android.util.Log.d("BLE_DEV", "✅ [ADVERTISE] BLE advertising started successfully")
            android.util.Log.d("BLE_DEV", "📡 [ADVERTISE] Advertising started with current settings")
            sendEvent("BLE_ADVERTISE_SUCCESS", null)
        }
        
        override fun onStartFailure(errorCode: Int) {
            android.util.Log.e("BLE_DEV", "❌ [ADVERTISE] BLE advertising failed with code: $errorCode")
            val errorMsg = when(errorCode) {
                1 -> "ADVERTISE_FAILED_DATA_TOO_LARGE"
                2 -> "ADVERTISE_FAILED_TOO_MANY_ADVERTISERS"
                3 -> "ADVERTISE_FAILED_ALREADY_STARTED"
                4 -> "ADVERTISE_FAILED_INTERNAL_ERROR"
                5 -> "ADVERTISE_FAILED_FEATURE_UNSUPPORTED"
                else -> "UNKNOWN_ERROR"
            }
            android.util.Log.e("BLE_DEV", "📝 [ADVERTISE] Error details: $errorMsg")
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
            android.util.Log.d("BLE_DEV", "\n🔵 === ACCESS CONTROL READER CONNECTION ===")
            android.util.Log.d("BLE_DEV", "📱 [GATT] Reader device: ${device?.address} (${device?.name ?: "Unknown"})")
            android.util.Log.d("BLE_DEV", "📝 [GATT] Characteristic: ${characteristic?.uuid}")
            android.util.Log.d("BLE_DEV", "📤 [GATT] Transmitting encrypted credentials")
            android.util.Log.d("BLE_DEV", "📏 [GATT] Data size: ${data?.size ?: 0} bytes, Offset: $offset")
            if (data != null) {
                android.util.Log.d("BLE_DEV", "🔐 [GATT] Encrypted payload: ${data.joinToString(" ") { "%02X".format(it) }}")
                android.util.Log.d("BLE_DEV", "✅ [GATT] Credential data sent to access control system")
            }
            gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, data)
            sendEvent("BLE_CREDENTIAL_READ", device?.address)
        }
        
        override fun onConnectionStateChange(device: BluetoothDevice?, status: Int, newState: Int) {
            when (newState) {
                2 -> {
                    android.util.Log.d("BLE_DEV", "🔗 [GATT] Access control reader CONNECTED: ${device?.address} (${device?.name ?: "Unknown"})")
                    android.util.Log.d("BLE_DEV", "📋 [GATT] Connection status: $status")
                }
                0 -> {
                    android.util.Log.d("BLE_DEV", "🔌 [GATT] Access control reader DISCONNECTED: ${device?.address}")
                    android.util.Log.d("BLE_DEV", "📋 [GATT] Disconnection status: $status")
                }
                else -> android.util.Log.d("BLE_DEV", "🔄 [GATT] Connection state: $newState, status: $status for ${device?.address}")
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
    
    @ReactMethod
    fun getAdvertisingStatus(promise: Promise) {
        try {
            val status = WritableNativeMap()
            status.putBoolean("isAdvertising", advertiser != null)
            status.putBoolean("isGattServerOpen", gattServer != null)
            status.putString("serviceUUID", SERVICE_UUID.toString())
            status.putString("iBeaconUUID", IBEACON_UUID.toString())
            status.putInt("major", MAJOR)
            status.putInt("minor", MINOR)
            promise.resolve(status)
        } catch (e: Exception) {
            promise.reject("STATUS_ERROR", e.message)
        }
    }
    
    private fun sendEvent(eventName: String, params: Any?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}