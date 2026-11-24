import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import authStatus from './api/auth/status.ts'
import adminSetup from './api/auth/setup.ts'
import login from './api/auth/login.ts'
import session from './api/auth/me.ts'
import logout from './api/auth/logout.ts'
import users from './api/users.ts'
import erp from './api/erp.ts'
import cameraToken from './api/cameras/token.ts'
import cameraRecording from './api/cameras/recording.ts'
import cameraOverview from './api/cameras/overview.ts'
import cameraRecordings from './api/cameras/recordings.ts'
import cameraCleanup from './api/cameras/cleanup.ts'

const apiRoutes = new Map([
  ['/api/auth/status', authStatus],
  ['/api/auth/setup', adminSetup],
  ['/api/auth/login', login],
  ['/api/auth/me', session],
  ['/api/auth/logout', logout],
  ['/api/users', users],
  ['/api/erp', erp],
  ['/api/cameras/token', cameraToken],
  ['/api/cameras/recording', cameraRecording],
  ['/api/cameras/overview', cameraOverview],
  ['/api/cameras/recordings', cameraRecordings],
  ['/api/cameras/cleanup', cameraCleanup],
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
            const handler = apiRoutes.get(pathname)
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
