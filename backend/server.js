import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import morgan from 'morgan'
import authRoutes from './routes/authRoutes.js'
import dashboardRoutes from './routes/dashboardRoutes.js'
import projectRoutes from './routes/projectRoutes.js'
import taskRoutes from './routes/taskRoutes.js'
import userRoutes from './routes/userRoutes.js'
import { connectDB } from './config/db.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'

dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') })

const app = express()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientDist = path.resolve(__dirname, '../dist')
const port = process.env.PORT || 5002

app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/dashboard', dashboardRoutes)

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientDist))
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

app.use(notFound)
app.use(errorHandler)

async function start() {
  try {
    await connectDB()
    console.log('Connected to MongoDB')
  } catch (err) {
    console.error('MongoDB connection error:', err.message)
    console.error('Continuing without DB connection. Retry will be attempted.');
  }

  if (typeof app.listen === 'function') {
    const server = app.listen(port, () => {
      console.log(`Server running on port ${port}`)
    })
  } else {
    console.error('Express app.listen is not available. Server not started.')
    return
  }

  // Attempt to reconnect to MongoDB periodically if disconnected
  (function monitorDbConnection() {
    setTimeout(async () => {
      try {
        if (!process.env.MONGODB_URI) return
        await connectDB()
      } catch (e) {
        // log and continue; will retry
        console.error('Retry MongoDB connection failed:', e.message)
      }
      monitorDbConnection()
    }, 15000)
  })()
}

start()