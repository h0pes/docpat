//! Build script for docpat-backend
//!
//! Sets compile-time environment variables:
//! - GIT_COMMIT: Current git commit hash (short)
//! - BUILD_TIMESTAMP: ISO 8601 build timestamp

use std::process::Command;

fn main() {
    // Get git commit hash
    let git_commit = Command::new("git")
        .args(["rev-parse", "--short", "HEAD"])
        .output()
        .ok()
        .and_then(|output| {
            if output.status.success() {
                String::from_utf8(output.stdout).ok()
            } else {
                None
            }
        })
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    // Get build timestamp
    let build_timestamp = chrono::Utc::now().to_rfc3339();

    // Set environment variables for compilation
    println!("cargo:rustc-env=GIT_COMMIT={}", git_commit);
    println!("cargo:rustc-env=BUILD_TIMESTAMP={}", build_timestamp);

    // Re-run build script if git HEAD changes
    println!("cargo:rerun-if-changed=.git/HEAD");
    println!("cargo:rerun-if-changed=.git/refs/heads/");
}
