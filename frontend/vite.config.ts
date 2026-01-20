import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '')

  // Check if HTTPS should be enabled
  const useHttps = env.VITE_USE_HTTPS === 'true'

  // Default certificate paths (relative to project root, not frontend)
  const certPath = env.VITE_TLS_CERT_PATH || '../certs/frontend/server.crt'
  const keyPath = env.VITE_TLS_KEY_PATH || '../certs/frontend/server.key'

  // Backend URL configuration
  const backendProtocol = env.VITE_BACKEND_HTTPS === 'true' ? 'https' : 'http'
  const backendPort = env.VITE_BACKEND_PORT || '8000'
  const backendUrl = `${backendProtocol}://localhost:${backendPort}`

  // Build HTTPS configuration if enabled and certificates exist
  let httpsConfig: boolean | { key: Buffer; cert: Buffer } = false
  if (useHttps) {
    const resolvedCertPath = path.resolve(__dirname, certPath)
    const resolvedKeyPath = path.resolve(__dirname, keyPath)

    if (fs.existsSync(resolvedCertPath) && fs.existsSync(resolvedKeyPath)) {
      httpsConfig = {
        key: fs.readFileSync(resolvedKeyPath),
        cert: fs.readFileSync(resolvedCertPath),
      }
      console.log('\x1b[32m[HTTPS]\x1b[0m Dev server will use HTTPS')
      console.log(`  Certificate: ${resolvedCertPath}`)
      console.log(`  Private key: ${resolvedKeyPath}`)
    } else {
      console.warn(
        '\x1b[33m[HTTPS WARNING]\x1b[0m VITE_USE_HTTPS=true but certificates not found.'
      )
      console.warn(`  Expected cert: ${resolvedCertPath}`)
      console.warn(`  Expected key:  ${resolvedKeyPath}`)
      console.warn('  Run: ./scripts/generate-certs.sh to generate certificates')
      console.warn('  Falling back to HTTP...')
    }
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@/components': path.resolve(__dirname, './src/components'),
        '@/pages': path.resolve(__dirname, './src/pages'),
        '@/hooks': path.resolve(__dirname, './src/hooks'),
        '@/services': path.resolve(__dirname, './src/services'),
        '@/store': path.resolve(__dirname, './src/store'),
        '@/types': path.resolve(__dirname, './src/types'),
        '@/utils': path.resolve(__dirname, './src/utils'),
        '@/i18n': path.resolve(__dirname, './src/i18n'),
      },
    },
    server: {
      port: 5173,
      https: httpsConfig,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          // For HTTPS backend with self-signed certs, we need to allow invalid certs
          secure: false,
        },
      },
    },
  }
})
