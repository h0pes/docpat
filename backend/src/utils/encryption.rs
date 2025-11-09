// Encryption utilities for PHI/PII data using AES-256-GCM
// All medical data marked with 🔒 must be encrypted before storage

use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use anyhow::{Context, Result};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use std::env;

/// Size of the nonce for AES-GCM (96 bits / 12 bytes)
const NONCE_SIZE: usize = 12;

/// Encryption key loaded from environment variable
/// Must be 32 bytes (256 bits) for AES-256
#[derive(Clone)]
pub struct EncryptionKey {
    cipher: Aes256Gcm,
}

impl EncryptionKey {
    /// Initialize encryption key from environment variable
    /// Environment variable ENCRYPTION_KEY must contain a base64-encoded 32-byte key
    pub fn from_env() -> Result<Self> {
        let key_base64 = env::var("ENCRYPTION_KEY")
            .context("ENCRYPTION_KEY environment variable not set")?;

        let key_bytes = BASE64
            .decode(key_base64)
            .context("Failed to decode ENCRYPTION_KEY from base64")?;

        if key_bytes.len() != 32 {
            anyhow::bail!("ENCRYPTION_KEY must be exactly 32 bytes (256 bits)");
        }

        let cipher = Aes256Gcm::new_from_slice(&key_bytes)
            .context("Failed to create cipher from encryption key")?;

        Ok(Self { cipher })
    }

    /// Encrypt plaintext data
    /// Returns base64-encoded string in format: nonce||ciphertext
    pub fn encrypt(&self, plaintext: &str) -> Result<String> {
        // Generate random nonce
        let mut nonce_bytes = [0u8; NONCE_SIZE];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        // Encrypt data
        let ciphertext = self
            .cipher
            .encrypt(nonce, plaintext.as_bytes())
            .map_err(|e| anyhow::anyhow!("Encryption failed: {}", e))?;

        // Combine nonce + ciphertext and encode as base64
        let mut combined = nonce_bytes.to_vec();
        combined.extend_from_slice(&ciphertext);

        Ok(BASE64.encode(combined))
    }

    /// Decrypt ciphertext
    /// Expects base64-encoded string in format: nonce||ciphertext
    pub fn decrypt(&self, encrypted_base64: &str) -> Result<String> {
        // Decode from base64
        let combined = BASE64
            .decode(encrypted_base64)
            .context("Failed to decode encrypted data from base64")?;

        // Split into nonce and ciphertext
        if combined.len() < NONCE_SIZE {
            anyhow::bail!("Encrypted data is too short");
        }

        let (nonce_bytes, ciphertext) = combined.split_at(NONCE_SIZE);
        let nonce = Nonce::from_slice(nonce_bytes);

        // Decrypt
        let plaintext_bytes = self
            .cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| anyhow::anyhow!("Decryption failed: {}", e))?;

        String::from_utf8(plaintext_bytes).context("Decrypted data is not valid UTF-8")
    }

    /// Encrypt optional string field
    pub fn encrypt_optional(&self, plaintext: &Option<String>) -> Result<Option<String>> {
        match plaintext {
            Some(text) => Ok(Some(self.encrypt(text)?)),
            None => Ok(None),
        }
    }

    /// Decrypt optional string field
    pub fn decrypt_optional(&self, encrypted: &Option<String>) -> Result<Option<String>> {
        match encrypted {
            Some(text) => Ok(Some(self.decrypt(text)?)),
            None => Ok(None),
        }
    }

    /// Encrypt JSON-serializable data
    pub fn encrypt_json<T: Serialize>(&self, data: &T) -> Result<String> {
        let json = serde_json::to_string(data)
            .context("Failed to serialize data to JSON")?;
        self.encrypt(&json)
    }

    /// Decrypt JSON data into typed struct
    pub fn decrypt_json<T: for<'de> Deserialize<'de>>(&self, encrypted: &str) -> Result<T> {
        let json = self.decrypt(encrypted)?;
        serde_json::from_str(&json)
            .context("Failed to deserialize decrypted JSON")
    }

    /// Encrypt array of strings
    pub fn encrypt_array(&self, items: &[String]) -> Result<Vec<String>> {
        items
            .iter()
            .map(|item| self.encrypt(item))
            .collect()
    }

    /// Decrypt array of strings
    pub fn decrypt_array(&self, encrypted_items: &[String]) -> Result<Vec<String>> {
        encrypted_items
            .iter()
            .map(|item| self.decrypt(item))
            .collect()
    }
}

/// Generate a new random encryption key
/// Used for initial setup or key rotation
pub fn generate_encryption_key() -> String {
    let mut key = [0u8; 32];
    OsRng.fill_bytes(&mut key);
    BASE64.encode(key)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Serialize, Deserialize, PartialEq)]
    struct TestData {
        name: String,
        age: u32,
    }

    fn setup_test_key() -> EncryptionKey {
        // Use a test key (in production, this comes from environment)
        let test_key = BASE64.encode([0u8; 32]);
        std::env::set_var("ENCRYPTION_KEY", test_key);
        EncryptionKey::from_env().unwrap()
    }

    #[test]
    fn test_encrypt_decrypt_string() {
        let key = setup_test_key();
        let plaintext = "Sensitive medical data";

        let encrypted = key.encrypt(plaintext).unwrap();
        assert_ne!(encrypted, plaintext);
        assert!(!encrypted.is_empty());

        let decrypted = key.decrypt(&encrypted).unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_encrypt_decrypt_optional() {
        let key = setup_test_key();

        let some_value = Some("Test data".to_string());
        let encrypted = key.encrypt_optional(&some_value).unwrap();
        assert!(encrypted.is_some());

        let decrypted = key.decrypt_optional(&encrypted).unwrap();
        assert_eq!(decrypted, some_value);

        let none_value: Option<String> = None;
        let encrypted_none = key.encrypt_optional(&none_value).unwrap();
        assert!(encrypted_none.is_none());
    }

    #[test]
    fn test_encrypt_decrypt_json() {
        let key = setup_test_key();
        let data = TestData {
            name: "John Doe".to_string(),
            age: 35,
        };

        let encrypted = key.encrypt_json(&data).unwrap();
        let decrypted: TestData = key.decrypt_json(&encrypted).unwrap();

        assert_eq!(decrypted, data);
    }

    #[test]
    fn test_encrypt_decrypt_array() {
        let key = setup_test_key();
        let items = vec![
            "Penicillin allergy".to_string(),
            "Diabetes Type 2".to_string(),
            "Hypertension".to_string(),
        ];

        let encrypted = key.encrypt_array(&items).unwrap();
        assert_eq!(encrypted.len(), items.len());

        let decrypted = key.decrypt_array(&encrypted).unwrap();
        assert_eq!(decrypted, items);
    }

    #[test]
    fn test_generate_encryption_key() {
        let key1 = generate_encryption_key();
        let key2 = generate_encryption_key();

        // Keys should be different
        assert_ne!(key1, key2);

        // Keys should be valid base64
        assert!(BASE64.decode(&key1).is_ok());
        assert!(BASE64.decode(&key2).is_ok());

        // Keys should be 32 bytes
        assert_eq!(BASE64.decode(&key1).unwrap().len(), 32);
        assert_eq!(BASE64.decode(&key2).unwrap().len(), 32);
    }

    #[test]
    fn test_decrypt_wrong_key_fails() {
        let key1 = setup_test_key();
        let plaintext = "Secret data";

        let encrypted = key1.encrypt(plaintext).unwrap();

        // Create a different key
        std::env::set_var("ENCRYPTION_KEY", BASE64.encode([1u8; 32]));
        let key2 = EncryptionKey::from_env().unwrap();

        // Decryption should fail with wrong key
        assert!(key2.decrypt(&encrypted).is_err());
    }

    #[test]
    fn test_decrypt_corrupted_data_fails() {
        let key = setup_test_key();

        // Try to decrypt invalid base64
        assert!(key.decrypt("not-valid-base64!!!").is_err());

        // Try to decrypt too short data
        let short_data = BASE64.encode([0u8; 5]);
        assert!(key.decrypt(&short_data).is_err());
    }
}
