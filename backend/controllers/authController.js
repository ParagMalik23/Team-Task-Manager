import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

function createToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

function sanitizeUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  }
}

export async function signup(req, res) {
  const { name, email, password, role } = req.body

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' })
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' })
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() })

  if (existingUser) {
    return res.status(409).json({ message: 'Email already exists' })
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: role === 'Admin' ? 'Admin' : 'Member',
  })

  res.status(201).json({ token: createToken(user._id), user: sanitizeUser(user) })
}

export async function login(req, res) {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' })
  }

  const user = await User.findOne({ email: email.toLowerCase() })

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  const isValid = await bcrypt.compare(password, user.password)

  if (!isValid) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  res.json({ token: createToken(user._id), user: sanitizeUser(user) })
}

export async function getMe(req, res) {
  res.json({ user: sanitizeUser(req.user) })
}