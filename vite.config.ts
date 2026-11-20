import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import authStatus from './api/auth/status.ts'
import adminSetup from './api/auth/setup.ts'
import login from './api/auth/login.ts'
import session from './api/auth/me.ts'
import logout from './api/auth/logout.ts'
import users from './api/users.ts'
import erp from './api/erp.ts'

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
  for (const key of ['GOOGLE_DRIVE_CLIENT_ID', 'GOOGLE_DRIVE_CLIENT_SECRET', 'GOOGLE_DRIVE_REFRESH_TOKEN', 'GOOGLE_DRIVE_WORKBOOK_ID', 'SESSION_SECRET']) {
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
