/*!
 * Email Service
 *
 * Provides secure email sending functionality for document delivery.
 * Uses SMTP (specifically configured for Gmail) with TLS encryption.
 *
 * SECURITY CONSIDERATIONS:
 * - SMTP credentials are ONLY loaded from environment variables
 * - Credentials are NEVER stored in the database
 * - Credentials are NEVER logged (custom Debug impl prevents this)
 * - All connections use TLS/STARTTLS encryption
 * - Email content may contain sensitive medical information - handle accordingly
 */

use anyhow::{Context, Result};
use lettre::{
    message::{header::ContentType, Attachment, MultiPart, SinglePart},
    transport::smtp::authentication::Credentials,
    AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
};
use std::path::Path;
use tracing::{error, info, warn};

use crate::config::EmailConfig;

/// Email service for sending documents and notifications
#[derive(Clone)]
pub struct EmailService {
    /// SMTP transport (None if email is disabled)
    transport: Option<AsyncSmtpTransport<Tokio1Executor>>,
    /// Sender email address
    from_email: String,
    /// Sender display name
    from_name: String,
    /// Whether email is enabled
    enabled: bool,
}

/// Result of an email send operation
#[derive(Debug)]
pub struct EmailResult {
    /// Whether the email was sent successfully
    pub success: bool,
    /// Optional message (error message if failed, confirmation if success)
    pub message: String,
}

impl EmailService {
    /// Create a new email service from configuration
    ///
    /// # Arguments
    /// * `config` - Optional email configuration (None if email is disabled)
    ///
    /// # Returns
    /// An EmailService instance (may be disabled if config is None)
    pub fn new(config: Option<&EmailConfig>) -> Result<Self> {
        match config {
            Some(cfg) if cfg.enabled => {
                info!("Initializing email service with SMTP host: {}", cfg.smtp_host);

                // Build SMTP credentials
                // SECURITY: Password is accessed through the secure getter method
                let credentials = Credentials::new(
                    cfg.smtp_username.clone(),
                    cfg.smtp_password().to_string(),
                );

                // Build async SMTP transport with STARTTLS
                let transport = AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&cfg.smtp_host)
                    .context("Failed to create SMTP transport")?
                    .port(cfg.smtp_port)
                    .credentials(credentials)
                    .build();

                Ok(Self {
                    transport: Some(transport),
                    from_email: cfg.from_email.clone(),
                    from_name: cfg.from_name.clone(),
                    enabled: true,
                })
            }
            _ => {
                warn!("Email service is disabled - no SMTP configuration provided");
                Ok(Self {
                    transport: None,
                    from_email: String::new(),
                    from_name: String::new(),
                    enabled: false,
                })
            }
        }
    }

    /// Check if email service is enabled
    pub fn is_enabled(&self) -> bool {
        self.enabled
    }

    /// Send a document via email
    ///
    /// # Arguments
    /// * `to_email` - Recipient email address
    /// * `to_name` - Recipient name
    /// * `subject` - Email subject line
    /// * `body_text` - Plain text body
    /// * `body_html` - Optional HTML body
    /// * `attachment_path` - Path to the PDF document to attach
    /// * `attachment_name` - Filename for the attachment
    ///
    /// # Returns
    /// EmailResult indicating success or failure
    pub async fn send_document(
        &self,
        to_email: &str,
        to_name: &str,
        subject: &str,
        body_text: &str,
        body_html: Option<&str>,
        attachment_path: &Path,
        attachment_name: &str,
    ) -> Result<EmailResult> {
        // Check if email is enabled
        if !self.enabled {
            return Ok(EmailResult {
                success: false,
                message: "Email service is not configured".to_string(),
            });
        }

        let transport = self.transport.as_ref().ok_or_else(|| {
            anyhow::anyhow!("Email transport not initialized")
        })?;

        // Read the attachment file
        let attachment_data = tokio::fs::read(attachment_path)
            .await
            .context("Failed to read attachment file")?;

        // Build the from address
        let from = format!("{} <{}>", self.from_name, self.from_email)
            .parse()
            .context("Invalid from address")?;

        // Build the to address
        let to = format!("{} <{}>", to_name, to_email)
            .parse()
            .context("Invalid recipient address")?;

        // Create the attachment
        let attachment = Attachment::new(attachment_name.to_string())
            .body(attachment_data, ContentType::parse("application/pdf").unwrap());

        // Build the message body
        let body = if let Some(html) = body_html {
            // Multipart with text and HTML alternatives
            MultiPart::alternative()
                .singlepart(SinglePart::plain(body_text.to_string()))
                .singlepart(SinglePart::html(html.to_string()))
        } else {
            // Text only
            MultiPart::alternative()
                .singlepart(SinglePart::plain(body_text.to_string()))
        };

        // Build the complete message with attachment
        let message = Message::builder()
            .from(from)
            .to(to)
            .subject(subject)
            .multipart(
                MultiPart::mixed()
                    .multipart(body)
                    .singlepart(attachment),
            )
            .context("Failed to build email message")?;

        // Send the email
        match transport.send(message).await {
            Ok(response) => {
                info!(
                    "Email sent successfully to {} - Response: {:?}",
                    to_email, response
                );
                Ok(EmailResult {
                    success: true,
                    message: format!("Email sent successfully to {}", to_email),
                })
            }
            Err(e) => {
                // Log error but don't expose internal details in the message
                error!("Failed to send email to {}: {:?}", to_email, e);
                Ok(EmailResult {
                    success: false,
                    message: format!("Failed to send email: {}", e),
                })
            }
        }
    }

    /// Send a simple notification email (no attachment)
    ///
    /// # Arguments
    /// * `to_email` - Recipient email address
    /// * `to_name` - Recipient name
    /// * `subject` - Email subject line
    /// * `body_text` - Plain text body
    /// * `body_html` - Optional HTML body
    ///
    /// # Returns
    /// EmailResult indicating success or failure
    #[allow(dead_code)]
    pub async fn send_notification(
        &self,
        to_email: &str,
        to_name: &str,
        subject: &str,
        body_text: &str,
        body_html: Option<&str>,
    ) -> Result<EmailResult> {
        // Check if email is enabled
        if !self.enabled {
            return Ok(EmailResult {
                success: false,
                message: "Email service is not configured".to_string(),
            });
        }

        let transport = self.transport.as_ref().ok_or_else(|| {
            anyhow::anyhow!("Email transport not initialized")
        })?;

        // Build the from address
        let from = format!("{} <{}>", self.from_name, self.from_email)
            .parse()
            .context("Invalid from address")?;

        // Build the to address
        let to = format!("{} <{}>", to_name, to_email)
            .parse()
            .context("Invalid recipient address")?;

        // Build the message
        let message_builder = Message::builder()
            .from(from)
            .to(to)
            .subject(subject);

        let message = if let Some(html) = body_html {
            message_builder
                .multipart(
                    MultiPart::alternative()
                        .singlepart(SinglePart::plain(body_text.to_string()))
                        .singlepart(SinglePart::html(html.to_string())),
                )
                .context("Failed to build email message")?
        } else {
            message_builder
                .body(body_text.to_string())
                .context("Failed to build email message")?
        };

        // Send the email
        match transport.send(message).await {
            Ok(response) => {
                info!(
                    "Notification email sent to {} - Response: {:?}",
                    to_email, response
                );
                Ok(EmailResult {
                    success: true,
                    message: format!("Email sent successfully to {}", to_email),
                })
            }
            Err(e) => {
                error!("Failed to send notification email to {}: {:?}", to_email, e);
                Ok(EmailResult {
                    success: false,
                    message: format!("Failed to send email: {}", e),
                })
            }
        }
    }
}

/// Generate a professional email body for document delivery
///
/// # Arguments
/// * `patient_name` - Name of the patient
/// * `document_title` - Title of the document
/// * `doctor_name` - Name of the sending doctor
/// * `practice_name` - Name of the medical practice
///
/// # Returns
/// Tuple of (plain_text, html) email body
pub fn generate_document_email_body(
    patient_name: &str,
    document_title: &str,
    doctor_name: &str,
    practice_name: &str,
) -> (String, String) {
    let plain_text = format!(
        r#"Dear {},

Please find attached the following document: {}

This document was generated by {} at {}.

CONFIDENTIALITY NOTICE: This email and any attachments contain confidential medical information intended only for the named recipient. If you have received this email in error, please notify the sender immediately and delete this message and any attachments. Unauthorized disclosure, copying, or distribution of this information is strictly prohibited.

Best regards,
{}
{}"#,
        patient_name, document_title, doctor_name, practice_name, doctor_name, practice_name
    );

    let html = format!(
        r#"<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px; }}
        .content {{ margin-bottom: 30px; }}
        .footer {{ font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }}
        .confidentiality {{ background-color: #fef2f2; border: 1px solid #fecaca; padding: 15px; margin-top: 20px; border-radius: 4px; font-size: 11px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 style="margin: 0; color: #2563eb;">{}</h2>
        </div>
        <div class="content">
            <p>Dear {},</p>
            <p>Please find attached the following document:</p>
            <p style="font-weight: bold; font-size: 16px; color: #1e40af;">{}</p>
            <p>This document was generated by <strong>{}</strong>.</p>
        </div>
        <div class="footer">
            <p>Best regards,<br><strong>{}</strong><br>{}</p>
            <div class="confidentiality">
                <strong>CONFIDENTIALITY NOTICE:</strong> This email and any attachments contain confidential medical information intended only for the named recipient. If you have received this email in error, please notify the sender immediately and delete this message and any attachments. Unauthorized disclosure, copying, or distribution of this information is strictly prohibited.
            </div>
        </div>
    </div>
</body>
</html>"#,
        practice_name, patient_name, document_title, doctor_name, doctor_name, practice_name
    );

    (plain_text, html)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_email_body_generation() {
        let (plain, html) = generate_document_email_body(
            "John Doe",
            "Medical Certificate",
            "Dr. Smith",
            "DocPat Medical Practice",
        );

        assert!(plain.contains("John Doe"));
        assert!(plain.contains("Medical Certificate"));
        assert!(plain.contains("Dr. Smith"));
        assert!(plain.contains("CONFIDENTIALITY NOTICE"));

        assert!(html.contains("John Doe"));
        assert!(html.contains("Medical Certificate"));
        assert!(html.contains("Dr. Smith"));
        assert!(html.contains("CONFIDENTIALITY NOTICE"));
    }

    #[test]
    fn test_disabled_email_service() {
        let service = EmailService::new(None).unwrap();
        assert!(!service.is_enabled());
    }
}
