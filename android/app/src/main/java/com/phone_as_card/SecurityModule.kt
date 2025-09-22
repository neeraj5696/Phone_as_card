package com.phone_as_card

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import com.facebook.react.bridge.*
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import android.util.Base64

class SecurityModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    companion object {
        private const val KEYSTORE_ALIAS = "PhoneAsCardKey"
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
    }
    
    override fun getName(): String = "SecurityModule"
    
    @ReactMethod
    fun generateSecureKey(promise: Promise) {
        try {
            val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
            val keyGenParameterSpec = KeyGenParameterSpec.Builder(
                KEYSTORE_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setUserAuthenticationRequired(false)
                .build()
            
            keyGenerator.init(keyGenParameterSpec)
            keyGenerator.generateKey()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("KEY_GENERATION_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun encryptData(data: String, promise: Promise) {
        try {
            val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
            keyStore.load(null)
            
            val secretKey = keyStore.getKey(KEYSTORE_ALIAS, null) as SecretKey
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.ENCRYPT_MODE, secretKey)
            
            val encryptedData = cipher.doFinal(data.toByteArray())
            val iv = cipher.iv
            
            val result = WritableNativeMap()
            result.putString("encryptedData", Base64.encodeToString(encryptedData, Base64.DEFAULT))
            result.putString("iv", Base64.encodeToString(iv, Base64.DEFAULT))
            
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ENCRYPTION_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun decryptData(encryptedData: String, iv: String, promise: Promise) {
        try {
            val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
            keyStore.load(null)
            
            val secretKey = keyStore.getKey(KEYSTORE_ALIAS, null) as SecretKey
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            val spec = GCMParameterSpec(128, Base64.decode(iv, Base64.DEFAULT))
            cipher.init(Cipher.DECRYPT_MODE, secretKey, spec)
            
            val decryptedData = cipher.doFinal(Base64.decode(encryptedData, Base64.DEFAULT))
            promise.resolve(String(decryptedData))
        } catch (e: Exception) {
            promise.reject("DECRYPTION_ERROR", e.message)
        }
    }
}