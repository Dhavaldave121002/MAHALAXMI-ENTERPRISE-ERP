import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import authStatus from './api/_lib/authRoutes/status.ts'
import adminSetup from './api/_lib/authRoutes/setup.ts'
import login from './api/_lib/authRoutes/login.ts'
import session from './api/_lib/authRoutes/me.ts'
import logout from './api/_lib/authRoutes/logout.ts'
import users from './api/users.ts'
import erp from './api/erp.ts'
import cameraApi from './api/cameras.ts'

const apiRoutes = new Map([
  ['/api/auth/status', authStatus],
  ['/api/auth/setup', adminSetup],
  ['/api/auth/login', login],
  ['/api/auth/me', session],
  ['/api/auth/logout', logout],
  ['/api/users', users],
  ['/api/erp', erp],
])

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of [
    'GOOGLE_APPS_SCRIPT_URL', 'GOOGLE_APPS_SCRIPT_SECRET', 'SESSION_SECRET',
    'LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET',
    'CAMERA_S3_BUCKET', 'CAMERA_S3_REGION', 'CAMERA_S3_ENDPOINT', 'CAMERA_S3_FORCE_PATH_STYLE',
    'CAMERA_S3_ACCESS_KEY', 'CAMERA_S3_SECRET_KEY',
    'LIVEKIT_S3_ACCESS_KEY', 'LIVEKIT_S3_SECRET_KEY', 'CRON_SECRET',
  ]) {
    if (!process.env[key] && env[key]) process.env[key] = env[key]
  }

  return {
    plugins: [
      react(),
      {
        name: 'local-vercel-api',
        configureServer(server) {
          server.middlewares.use((request, response, next) => {
            const pathname = new URL(request.url || '/', 'http://localhost').pathname
            const handler = apiRoutes.get(pathname) || (pathname.startsWith('/api/cameras/') ? cameraApi : undefined)
            if (!handler) {
              next()
              return
            }
            void handler(request, response).catch(next)
          })
        },
      },
    ],
  }
})
