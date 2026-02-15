/*!
 * Multi-Factor Authentication (MFA) HTTP Handlers
 *
 * Handles MFA enrollment, setup, and backup code generation.
 */

use axum::{extract::State, Extension, Json};
use serde::{Deserialize, Serialize};
use totp_rs::{Algorithm, Secret, TOTP};
use uuid::Uuid;

use crate::{
    handlers::auth::AppState,
    models::User,
    utils::{AppError, Result},
};

/// MFA setup request (requires authentication)
///
/// The user_id is optional in the request body. If provided, it must match
/// the authenticated user's ID from the JWT token. If omitted, the JWT user_id
/// is used automatically. This prevents unauthenticated MFA setup (AUTH-VULN-03).
#[derive(Debug, Deserialize)]
pub struct MfaSetupRequest {
    /// User ID requesting MFA setup (must match authenticated user)
    pub user_id: Option<Uuid>,
}

/// MFA setup response with QR code and secret
#[derive(Debug, Serialize)]
pub struct MfaSetupResponse {
    /// TOTP secret (base32 encoded) - user should store securely
    pub secret: String,
    /// QR code as base64-encoded PNG image
    pub qr_code: String,
    /// TOTP URI for manual entry
    pub totp_uri: String,
    /// Backup codes for account recovery
    pub backup_codes: Vec<String>,
}

/// MFA enrollment request to confirm setup
///
/// The user_id is optional. If provided, it must match the authenticated user's
/// JWT token. If omitted, the JWT user_id is used automatically (AUTH-VULN-14).
#[derive(Debug, Deserialize)]
pub struct MfaEnrollRequest {
    /// User ID enrolling in MFA (must match authenticated user)
    pub user_id: Option<Uuid>,
    /// TOTP secret from setup step
    pub secret: String,
    /// Verification code from authenticator app
    pub code: String,
    /// Backup codes from setup step (to be stored hashed)
    pub backup_codes: Vec<String>,
}

/// MFA enrollment response
#[derive(Debug, Serialize)]
pub struct MfaEnrollResponse {
    /// Success message
    pub message: String,
    /// Whether MFA is now enabled
    pub mfa_enabled: bool,
}

/// Generate MFA secret and QR code for user enrollment
///
/// POST /api/v1/auth/mfa/setup
///
/// # Request Body
///
/// ```json
/// {
///   "user_id": "uuid"
/// }
/// ```
///
/// # Response
///
/// ```json
/// {
///   "secret": "base32_encoded_secret",
///   "qr_code": "base64_encoded_png",
///   "totp_uri": "otpauth://totp/...",
///   "backup_codes": ["code1", "code2", ...]
/// }
/// ```
pub async fn mfa_setup_handler(
    State(state): State<AppState>,
    Extension(auth_user_id): Extension<Uuid>,
    Json(req): Json<MfaSetupRequest>,
) -> Result<Json<MfaSetupResponse>> {
    // Use authenticated user's ID from JWT; if request body provides user_id, it must match
    let target_user_id = match req.user_id {
        Some(id) if id != auth_user_id => {
            return Err(AppError::Forbidden(
                "Cannot set up MFA for a different user".to_string(),
            ));
        }
        _ => auth_user_id,
    };

    tracing::info!("MFA setup request for user: {}", target_user_id);

    // Verify user exists and is active
    let user = User::find_by_id(&state.pool, &target_user_id).await?;

    if !user.is_active {
        return Err(AppError::Forbidden("Account is inactive".to_string()));
    }

    // Generate TOTP secret
    let secret = Secret::generate_secret();
    let secret_base32 = secret.to_encoded().to_string();

    // Create TOTP instance with issuer and account name
    let account_name = format!("{}@docpat", user.username);
    let issuer = "DocPat Medical";

    let totp = TOTP::new(
        Algorithm::SHA1,
        6,                          // 6-digit codes
        1,                          // 1 time step (30 seconds)
        30,                         // 30 second time step
        secret.to_bytes().map_err(|_| {
            tracing::error!("Failed to generate TOTP secret");
            AppError::Internal("Failed to generate MFA secret".to_string())
        })?,
        Some(issuer.to_string()),
        account_name.clone(),
    )
    .map_err(|_| {
        tracing::error!("Failed to create TOTP configuration");
        AppError::Internal("Failed to create MFA configuration".to_string())
    })?;

    // Generate TOTP URI for QR code
    let totp_uri = totp.get_url();

    // Generate QR code
    let qr_code = generate_qr_code(&totp_uri)?;

    // Generate backup codes
    let backup_codes = generate_backup_codes();

    // Log MFA setup attempt (but not the secret)
    tracing::info!("MFA setup generated for user: {}", user.id);

    Ok(Json(MfaSetupResponse {
        secret: secret_base32,
        qr_code,
        totp_uri,
        backup_codes,
    }))
}

/// Enroll user in MFA after verifying setup code
///
/// POST /api/v1/auth/mfa/enroll
///
/// # Request Body
///
/// ```json
/// {
///   "user_id": "uuid",
///   "secret": "base32_encoded_secret",
///   "code": "123456"
/// }
/// ```
///
/// # Response
///
/// ```json
/// {
///   "message": "MFA enrolled successfully",
///   "mfa_enabled": true
/// }
/// ```
pub async fn mfa_enroll_handler(
    State(state): State<AppState>,
    Extension(auth_user_id): Extension<Uuid>,
    Json(req): Json<MfaEnrollRequest>,
) -> Result<Json<MfaEnrollResponse>> {
    // Use authenticated user's ID from JWT; if request body provides user_id, it must match
    let target_user_id = match req.user_id {
        Some(id) if id != auth_user_id => {
            return Err(AppError::Forbidden(
                "Cannot enroll MFA for a different user".to_string(),
            ));
        }
        _ => auth_user_id,
    };

    tracing::info!("MFA enrollment request for user: {}", target_user_id);

    // Verify user exists
    let user = User::find_by_id(&state.pool, &target_user_id).await?;

    if !user.is_active {
        return Err(AppError::Forbidden("Account is inactive".to_string()));
    }

    // Verify the provided code with the secret
    let secret = Secret::Encoded(req.secret.clone())
        .to_bytes()
        .map_err(|_| {
            tracing::error!("Invalid MFA secret format for user {}", user.id);
            AppError::BadRequest("Invalid MFA secret".to_string())
        })?;

    let totp = TOTP::new(
        Algorithm::SHA1,
        6,
        1,
        30,
        secret,
        Some("DocPat Medical".to_string()),
        user.username.clone(),
    )
    .map_err(|_| {
        tracing::error!("Failed to create TOTP for user {}", user.id);
        AppError::Internal("Failed to verify MFA code".to_string())
    })?;

    // Verify the code
    let is_valid = totp.check_current(&req.code).map_err(|_| {
        tracing::warn!("MFA verification failed for user {}", user.id);
        AppError::Unauthorized("Invalid MFA code".to_string())
    })?;

    if !is_valid {
        return Err(AppError::Unauthorized(
            "Invalid MFA code. Please try again.".to_string(),
        ));
    }

    // Hash backup codes before storing
    use crate::utils::PasswordHasherUtil;
    let hashed_backup_codes: Vec<String> = req
        .backup_codes
        .iter()
        .map(|code| {
            PasswordHasherUtil::hash_password(code).map_err(|_| {
                tracing::error!("Failed to hash backup code for user {}", user.id);
                AppError::Internal("Failed to process backup codes".to_string())
            })
        })
        .collect::<Result<Vec<String>>>()?;

    // Enable MFA for user by storing the secret and backup codes
    sqlx::query(
        r#"
        UPDATE users
        SET mfa_secret = $1, mfa_enabled = true, backup_codes = $2, updated_at = NOW()
        WHERE id = $3
        "#,
    )
    .bind(&req.secret)
    .bind(&hashed_backup_codes)
    .bind(&user.id)
    .execute(&state.pool)
    .await
    .map_err(|_| {
        tracing::error!("Failed to enable MFA for user {}", user.id);
        AppError::Internal("Failed to enable MFA".to_string())
    })?;

    tracing::info!("MFA successfully enrolled for user: {}", user.id);

    Ok(Json(MfaEnrollResponse {
        message: "MFA enrolled successfully".to_string(),
        mfa_enabled: true,
    }))
}

/// Generate QR code as base64-encoded PNG image
///
/// # Arguments
///
/// * `data` - String data to encode in QR code (TOTP URI)
///
/// # Returns
///
/// Base64-encoded PNG image data
fn generate_qr_code(data: &str) -> Result<String> {
    use qrcode::QrCode;

    // Generate QR code
    let code = QrCode::new(data).map_err(|_| {
        tracing::error!("Failed to generate QR code");
        AppError::Internal("Failed to generate QR code".to_string())
    })?;

    // Render as PNG with increased size for better scanning
    let image = code.render::<image::Luma<u8>>()
        .min_dimensions(300, 300)
        .max_dimensions(300, 300)
        .build();

    // Convert to PNG bytes
    let mut png_bytes: Vec<u8> = Vec::new();
    image::DynamicImage::ImageLuma8(image)
        .write_to(&mut std::io::Cursor::new(&mut png_bytes), image::ImageFormat::Png)
        .map_err(|_| {
            tracing::error!("Failed to encode QR code as PNG");
            AppError::Internal("Failed to encode QR code".to_string())
        })?;

    // Encode as base64
    let base64_image = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &png_bytes);

    Ok(format!("data:image/png;base64,{}", base64_image))
}

/// Generate backup codes for account recovery
///
/// Generates 10 random 8-character alphanumeric codes
///
/// # Returns
///
/// Vector of 10 backup codes
fn generate_backup_codes() -> Vec<String> {
    use rand::Rng;

    let mut rng = rand::thread_rng();
    let charset: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude ambiguous characters

    (0..10)
        .map(|_| {
            (0..8)
                .map(|_| {
                    let idx = rng.gen_range(0..charset.len());
                    charset[idx] as char
                })
                .collect::<String>()
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_backup_codes() {
        let codes = generate_backup_codes();

        // Should generate 10 codes
        assert_eq!(codes.len(), 10);

        // Each code should be 8 characters
        for code in &codes {
            assert_eq!(code.len(), 8);
            // Should only contain allowed characters
            assert!(code.chars().all(|c| c.is_ascii_alphanumeric()));
        }

        // All codes should be unique
        let unique_codes: std::collections::HashSet<_> = codes.iter().collect();
        assert_eq!(unique_codes.len(), 10);
    }

    #[test]
    fn test_generate_qr_code() {
        let totp_uri = "otpauth://totp/DocPat Medical:test@docpat?secret=JBSWY3DPEHPK3PXP&issuer=DocPat Medical";
        let qr_result = generate_qr_code(totp_uri);

        assert!(qr_result.is_ok());

        let qr_code = qr_result.unwrap();
        assert!(qr_code.starts_with("data:image/png;base64,"));

        // Should have substantial base64 data
        assert!(qr_code.len() > 100);
    }
}
