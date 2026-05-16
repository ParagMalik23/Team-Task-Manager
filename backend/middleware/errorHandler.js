export function notFound(req, res) {
  res.status(404).json({ message: 'Route not found' })
}

export function errorHandler(error, req, res, _next) {
  void _next
  // Mongoose validation errors -> 400 with field errors
  if (error && error.name === 'ValidationError') {
    const errors = {}
    Object.keys(error.errors || {}).forEach((key) => {
      errors[key] = error.errors[key].message
    })
    res.status(400).json({ message: error.message || 'Validation failed', errors })
    return
  }

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500
  res.status(statusCode).json({ message: error.message || 'Server error' })
}