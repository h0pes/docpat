/*!
 * Request Context Middleware
 *
 * Extracts HTTP request metadata (IP address, user agent, request ID) and
 * makes it available to handlers via request extensions.
 */

use axum::{
    body::Body,
    extract::ConnectInfo,
    http::Request,
    middleware::Next,
    response::Response,
};
use std::net::SocketAddr;

use crate::models::RequestContext;

/// Middleware that extracts request context (IP, user agent, request ID)
/// and inserts it into request extensions.
///
/// This should be applied after authentication middleware so that the
/// authenticated user context is available, but before handlers execute.
///
/// # IP Address Extraction Priority
/// 1. X-Forwarded-For header (first IP if comma-separated)
/// 2. X-Real-IP header
/// 3. Direct connection IP (ConnectInfo)
pub async fn request_context_middleware(
    mut request: Request<Body>,
    next: Next,
) -> Response {
    // Try to get ConnectInfo from extensions (added by axum's into_make_service_with_connect_info)
    let connect_info = request.extensions().get::<ConnectInfo<SocketAddr>>().cloned();

    // Extract IP address from headers or connection info
    // Priority: X-Forwarded-For > X-Real-IP > Direct connection
    let ip_address = request
        .headers()
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.split(',').next())
        .map(|s| s.trim().to_string())
        .or_else(|| {
            request
                .headers()
                .get("x-real-ip")
                .and_then(|v| v.to_str().ok())
                .map(|s| s.to_string())
        })
        .or_else(|| {
            // Fallback to direct connection IP (for development without reverse proxy)
            connect_info.map(|ConnectInfo(addr)| addr.ip().to_string())
        });

    // Extract User-Agent header
    let user_agent = request
        .headers()
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    // Create request context and insert into extensions
    let ctx = RequestContext::new(ip_address, user_agent);

    tracing::debug!(
        request_id = %ctx.request_id,
        ip = ?ctx.ip_address,
        "Request context created"
    );

    request.extensions_mut().insert(ctx);

    // Continue processing the request
    next.run(request).await
}
