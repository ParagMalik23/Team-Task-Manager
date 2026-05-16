import mongoose from 'mongoose'

export async function connectDB() {
  const uri = process.env.MONGODB_URI

  if (!uri) {
    throw new Error('MONGODB_URI is not defined')
  }

  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection
  }

  await mongoose.connect(uri)
  return mongoose.connection
}