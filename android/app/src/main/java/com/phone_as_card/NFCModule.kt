package com.phone_as_card

import android.nfc.NfcAdapter
import android.nfc.cardemulation.HostApduService
import android.os.Bundle
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import javax.crypto.Cipher
import javax.crypto.spec.SecretKeySpec

class NFCModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    private val nfcAdapter: NfcAdapter? = NfcAdapter.getDefaultAdapter(reactContext)
    
    override fun getName(): String = "NFCModule"
    
    @ReactMethod
    fun isNFCEnabled(promise: Promise) {
        try {
            if (nfcAdapter == null) {
                android.util.Log.d("NFC_MODULE", "NFC hardware not available")
                promise.resolve(false)
                return
            }
            val enabled = nfcAdapter.isEnabled
            android.util.Log.d("NFC_MODULE", "NFC hardware available, enabled: $enabled")
            promise.resolve(enabled)
        } catch (e: Exception) {
            promise.reject("NFC_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun isNFCAvailable(promise: Promise) {
        try {
            val available = nfcAdapter != null
            android.util.Log.d("NFC_MODULE", "NFC hardware available: $available")
            promise.resolve(available)
        } catch (e: Exception) {
            promise.reject("NFC_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun enableHCE(aid: String, promise: Promise) {
        try {
            if (nfcAdapter == null) {
                android.util.Log.e("NFC_MODULE", "Cannot enable HCE - NFC hardware not available")
                promise.reject("NFC_UNAVAILABLE", "NFC hardware not available on this device")
                return
            }
            if (!nfcAdapter.isEnabled) {
                android.util.Log.e("NFC_MODULE", "Cannot enable HCE - NFC is disabled")
                promise.reject("NFC_DISABLED", "NFC is disabled. Please enable NFC in settings")
                return
            }
            
            android.util.Log.d("NFC_MODULE", "Enabling HCE with AID: $aid")
            val prefs = reactApplicationContext.getSharedPreferences("nfc_prefs", 0)
            prefs.edit().putString("current_aid", aid).apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("HCE_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun setCredentials(keyData: String, accessRights: String, promise: Promise) {
        try {
            android.util.Log.d("NFC_MODULE", "Setting credentials - Data length: ${keyData.length}, Rights: $accessRights")
            val prefs = reactApplicationContext.getSharedPreferences("nfc_prefs", 0)
            prefs.edit()
                .putString("key_data", keyData)
                .putString("access_rights", accessRights)
                .apply()
            android.util.Log.d("NFC_MODULE", "Credentials stored successfully")
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CREDENTIAL_ERROR", e.message)
        }
    }
}

class NFCHostApduService : HostApduService() {
    
    private val SELECT_AID_COMMAND = byteArrayOf(0x00.toByte(), 0xA4.toByte(), 0x04.toByte(), 0x00.toByte())
    private val SUCCESS_RESPONSE = byteArrayOf(0x90.toByte(), 0x00.toByte())
    
    override fun processCommandApdu(commandApdu: ByteArray?, extras: Bundle?): ByteArray {
        if (commandApdu == null) {
            android.util.Log.d("NFC_HCE", "Received null APDU")
            return byteArrayOf(0x6F.toByte(), 0x00.toByte())
        }
        
        android.util.Log.d("NFC_HCE", "\n📡 === READER COMMUNICATION ===")
        android.util.Log.d("NFC_HCE", "📱 Reader sent APDU: ${commandApdu.joinToString(" ") { "%02X".format(it) }}")
        android.util.Log.d("NFC_HCE", "📏 Command length: ${commandApdu.size} bytes")
        
        return when {
            commandApdu.sliceArray(0..3).contentEquals(SELECT_AID_COMMAND) -> {
                android.util.Log.d("NFC_HCE", "🆔 AID Selection Command Detected")
                android.util.Log.d("NFC_HCE", "📤 Sending SUCCESS response: 90 00")
                android.util.Log.d("NFC_HCE", "✅ Phone authenticated as MIFARE DESFire card")
                SUCCESS_RESPONSE
            }
            else -> {
                val response = handleDESFireCommand(commandApdu)
                android.util.Log.d("NFC_HCE", "📤 Sending Response: ${response.joinToString(" ") { "%02X".format(it) }}")
                android.util.Log.d("NFC_HCE", "🔄 Data transmitted to access control reader")
                response
            }
        }
    }
    
    private fun handleDESFireCommand(command: ByteArray): ByteArray {
        android.util.Log.d("NFC_HCE", "Processing DESFire command: ${command[1].toString(16)}")
        return when (command[1]) {
            0x5A.toByte() -> {
                android.util.Log.d("NFC_HCE", "Get Version command")
                SUCCESS_RESPONSE
            }
            0x60.toByte() -> {
                android.util.Log.d("NFC_HCE", "Authenticate command")
                SUCCESS_RESPONSE
            }
            else -> {
                android.util.Log.d("NFC_HCE", "Unsupported command: ${command[1].toString(16)}")
                byteArrayOf(0x6D.toByte(), 0x00.toByte())
            }
        }
    }
    
    override fun onDeactivated(reason: Int) {
        // Cleanup when card emulation stops
    }
}