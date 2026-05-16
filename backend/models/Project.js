import mongoose from 'mongoose'

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 3 },
    description: { type: String, required: true, trim: true, minlength: 10 },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
)

export default mongoose.model('Project', projectSchema)