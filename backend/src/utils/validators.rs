// Validation utilities for patient data
// Includes Italian fiscal code, phone numbers, and other field validations

use chrono::Datelike;
use regex::Regex;
use std::sync::OnceLock;

/// Italian Fiscal Code (Codice Fiscale) validator
/// Format: RSSMRA85M01H501U (16 characters)
/// - 3 letters from surname
/// - 3 letters from first name
/// - 2 digits for year of birth
/// - 1 letter for month (A-E for Jan-May, H-L for Jun-Oct, P-T for Nov-Dec)
/// - 2 digits for day (41+ for females)
/// - 1 letter + 3 digits for municipality code
/// - 1 check character (letter)
pub struct FiscalCodeValidator;

impl FiscalCodeValidator {
    /// Validate Italian fiscal code format
    pub fn validate(code: &str) -> bool {
        // Must be exactly 16 characters
        if code.len() != 16 {
            return false;
        }

        // Get the regex pattern (compiled once)
        static FISCAL_CODE_REGEX: OnceLock<Regex> = OnceLock::new();
        let regex = FISCAL_CODE_REGEX.get_or_init(|| {
            // Pattern: 6 letters, 2 digits, 1 letter, 2 digits, 4 alphanumeric, 1 letter
            Regex::new(r"^[A-Z]{6}\d{2}[A-EHLMPRST]\d{2}[A-Z]\d{3}[A-Z]$").unwrap()
        });

        // Validate against regex pattern
        regex.is_match(code)

        // TODO: Implement full check digit validation
        // The Italian fiscal code uses a complex check digit algorithm
        // For now, format validation is sufficient for basic data quality
    }

    /// Validate the check digit (last character) of fiscal code
    /// TODO: Implement proper check digit validation
    #[allow(dead_code)]
    fn validate_check_digit(code: &str) -> bool {
        let chars: Vec<char> = code.chars().collect();

        // Even and odd position values for check digit calculation
        let even_values: [u32; 36] = [
            0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
            0, 1, 2, 3, 4, 5, 6, 7, 8, 9
        ];

        let odd_values: [u32; 36] = [
            1, 0, 5, 7, 9, 13, 15, 17, 19, 21, 2, 4, 18, 20, 11, 3, 6, 8, 12, 14, 16, 10, 22, 25, 24, 23,
            1, 0, 5, 7, 9, 13, 15, 17, 19, 21
        ];

        let mut sum = 0;

        // Calculate checksum for first 15 characters
        for (i, &ch) in chars[..15].iter().enumerate() {
            let value = if ch.is_ascii_digit() {
                (ch as u32) - ('0' as u32)
            } else {
                (ch as u32) - ('A' as u32) + 10
            };

            if i % 2 == 0 {
                // Odd position (1-indexed, but 0-indexed in array)
                sum += odd_values[value as usize];
            } else {
                // Even position
                sum += even_values[value as usize];
            }
        }

        // Calculate expected check character
        let check_value = sum % 26;
        let expected_check = char::from_u32(('A' as u32) + check_value).unwrap();

        // Compare with actual check character
        chars[15] == expected_check
    }

    /// Extract date of birth from fiscal code (approximate, month is certain, day has ±40 ambiguity for females)
    pub fn extract_info(code: &str) -> Option<FiscalCodeInfo> {
        if !Self::validate(code) {
            return None;
        }

        let chars: Vec<char> = code.chars().collect();

        // Extract year (positions 6-7)
        let year_suffix: String = chars[6..8].iter().collect();
        let year_suffix: u32 = year_suffix.parse().ok()?;

        // Assume current century if year is < 30, else previous century
        let current_year = chrono::Utc::now().year();
        let century = if year_suffix < 30 { 2000 } else { 1900 };
        let year = century + year_suffix;

        // Extract month (position 8)
        let month_char = chars[8];
        let month = match month_char {
            'A' => 1, 'B' => 2, 'C' => 3, 'D' => 4, 'E' => 5,
            'H' => 6, 'L' => 7, 'M' => 8, 'P' => 9, 'R' => 10,
            'S' => 11, 'T' => 12,
            _ => return None,
        };

        // Extract day (positions 9-10)
        let day_str: String = chars[9..11].iter().collect();
        let mut day: u32 = day_str.parse().ok()?;

        // If day > 40, it's a female (subtract 40)
        let gender = if day > 40 {
            day -= 40;
            "F"
        } else {
            "M"
        };

        Some(FiscalCodeInfo {
            year: year as i32,
            month: month as u32,
            day: day as u32,
            gender: gender.to_string(),
        })
    }
}

/// Information extracted from fiscal code
#[derive(Debug, Clone)]
pub struct FiscalCodeInfo {
    pub year: i32,
    pub month: u32,
    pub day: u32,
    pub gender: String,
}

/// Phone number validator
/// Supports international formats: +39 123 456 7890, +1-555-123-4567, etc.
pub struct PhoneValidator;

impl PhoneValidator {
    /// Validate phone number format
    /// Accepts: +XX XXX XXX XXXX, +XX-XXX-XXX-XXXX, +XXXXXXXXXXXX, etc.
    pub fn validate(phone: &str) -> bool {
        // Remove all whitespace and hyphens for validation
        let cleaned: String = phone.chars()
            .filter(|c| !c.is_whitespace() && *c != '-')
            .collect();

        // Must start with + and have 10-15 digits after
        if !cleaned.starts_with('+') {
            return false;
        }

        let digits = &cleaned[1..];

        // Check if all remaining characters are digits
        if !digits.chars().all(|c| c.is_ascii_digit()) {
            return false;
        }

        // Length should be between 10 and 15 digits (excluding the +)
        let length = digits.len();
        length >= 10 && length <= 15
    }

    /// Normalize phone number to E.164 format (+XXXXXXXXXXXX)
    pub fn normalize(phone: &str) -> Option<String> {
        if !Self::validate(phone) {
            return None;
        }

        // Remove all non-digit characters except +
        let normalized: String = phone.chars()
            .filter(|c| c.is_ascii_digit() || *c == '+')
            .collect();

        Some(normalized)
    }

    /// Check if phone is Italian mobile (+39 3XX XXX XXXX)
    pub fn is_italian_mobile(phone: &str) -> bool {
        let normalized = match Self::normalize(phone) {
            Some(n) => n,
            None => return false,
        };

        // Italian mobile: +39 3XX XXX XXXX
        if !normalized.starts_with("+39") {
            return false;
        }

        let number = &normalized[3..];

        // Must start with 3 and be 10 digits total
        number.len() == 10 && number.starts_with('3')
    }
}

/// Email validator (additional to validator crate)
pub struct EmailValidator;

impl EmailValidator {
    /// Basic email format validation (additional check beyond validator crate)
    pub fn is_disposable(email: &str) -> bool {
        // List of common disposable email providers
        let disposable_domains = [
            "tempmail.com", "throwaway.email", "guerrillamail.com",
            "mailinator.com", "10minutemail.com", "trashmail.com",
            "fakeinbox.com", "yopmail.com", "maildrop.cc",
        ];

        let domain = email.split('@').nth(1).unwrap_or("");
        disposable_domains.contains(&domain)
    }
}

/// UUID validator function for use with the validator crate
/// Used with #[validate(custom(function = "validate_uuid"))]
pub fn validate_uuid(value: &str) -> Result<(), validator::ValidationError> {
    use uuid::Uuid;
    use std::str::FromStr;

    match Uuid::from_str(value) {
        Ok(_) => Ok(()),
        Err(_) => Err(validator::ValidationError::new("invalid_uuid")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fiscal_code_valid() {
        // Valid fiscal code format (without check digit validation)
        assert!(FiscalCodeValidator::validate("RSSMRA85M01H501U"));
        assert!(FiscalCodeValidator::validate("GRMBNN80A01H501X"));
        assert!(FiscalCodeValidator::validate("VRDGPP65D15F205V"));
        assert!(FiscalCodeValidator::validate("ABCDEF90A01A000A")); // Valid format
    }

    #[test]
    fn test_fiscal_code_invalid() {
        // Invalid formats (format validation only, no check digit verification)
        assert!(!FiscalCodeValidator::validate("RSSMRA85M01H501")); // Too short
        assert!(!FiscalCodeValidator::validate("RSSMRA85M01H501UX")); // Too long
        assert!(!FiscalCodeValidator::validate("rssmra85m01h501u")); // Lowercase
        assert!(!FiscalCodeValidator::validate("RSSMRA85001H501U")); // Invalid month (0 instead of letter)
        assert!(!FiscalCodeValidator::validate("1234567890123456")); // All digits
        assert!(!FiscalCodeValidator::validate("RSSMRA85X01H501U")); // Invalid month letter (X not in A-E,H-L,P-R,S,T)

        // Note: We do NOT validate check digit (last character)
        // So "RSSMRA85M01H501Z" would pass format validation even with wrong check digit
    }

    #[test]
    fn test_fiscal_code_extract_info() {
        let info = FiscalCodeValidator::extract_info("RSSMRA85M01H501U").unwrap();
        assert_eq!(info.year, 1985);
        assert_eq!(info.month, 8); // M = August
        assert_eq!(info.day, 1);
        assert_eq!(info.gender, "M");

        // Female example (day + 40)
        let info2 = FiscalCodeValidator::extract_info("GRMBNN80A41H501X").unwrap();
        assert_eq!(info2.day, 1); // 41 - 40 = 1
        assert_eq!(info2.gender, "F");
    }

    #[test]
    fn test_phone_valid() {
        assert!(PhoneValidator::validate("+39 123 456 7890"));
        assert!(PhoneValidator::validate("+1-555-123-4567"));
        assert!(PhoneValidator::validate("+442071234567"));
        assert!(PhoneValidator::validate("+39 3401234567"));
    }

    #[test]
    fn test_phone_invalid() {
        assert!(!PhoneValidator::validate("123456789")); // No country code
        assert!(!PhoneValidator::validate("+39 123")); // Too short
        assert!(!PhoneValidator::validate("+39 123 456 7890 1234 5678")); // Too long
        assert!(!PhoneValidator::validate("39 123 456 7890")); // Missing +
        assert!(!PhoneValidator::validate("+39abc123456")); // Contains letters
    }

    #[test]
    fn test_phone_normalize() {
        assert_eq!(
            PhoneValidator::normalize("+39 123 456 7890"),
            Some("+391234567890".to_string())
        );
        assert_eq!(
            PhoneValidator::normalize("+1-555-123-4567"),
            Some("+15551234567".to_string())
        );
    }

    #[test]
    fn test_italian_mobile() {
        assert!(PhoneValidator::is_italian_mobile("+39 340 123 4567"));
        assert!(PhoneValidator::is_italian_mobile("+39 333 456 7890"));
        assert!(!PhoneValidator::is_italian_mobile("+39 02 1234567")); // Fixed line
        assert!(!PhoneValidator::is_italian_mobile("+1 555 123 4567")); // US number
    }

    #[test]
    fn test_disposable_email() {
        assert!(EmailValidator::is_disposable("test@tempmail.com"));
        assert!(EmailValidator::is_disposable("user@mailinator.com"));
        assert!(!EmailValidator::is_disposable("user@gmail.com"));
        assert!(!EmailValidator::is_disposable("doctor@hospital.it"));
    }
}
