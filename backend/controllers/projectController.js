import Project from '../models/Project.js'
import Task from '../models/Task.js'
import User from '../models/User.js'

function canManageProject(user, project) {
  return user.role === 'Admin' || project.owner.toString() === user._id.toString()
}

export async function listProjects(req, res) {
  const filter = req.user.role === 'Admin'
    ? {}
    : { $or: [{ owner: req.user._id }, { members: req.user._id }] }

  const projects = await Project.find(filter)
    .populate('owner', 'name email role')
    .populate('members', 'name email role')
    .sort({ createdAt: -1 })

  const projectIds = projects.map((project) => project._id)
  const taskCounts = await Task.aggregate([
    { $match: { project: { $in: projectIds } } },
    { $group: { _id: '$project', count: { $sum: 1 } } },
  ])

  const countMap = new Map(taskCounts.map((entry) => [entry._id.toString(), entry.count]))

  res.json({
    projects: projects.map((project) => ({
      ...project.toObject(),
      taskCount: countMap.get(project._id.toString()) || 0,
    })),
  })
}

export async function createProject(req, res) {
  const { name, description, status = 'active', memberIds = [] } = req.body

  if (req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Only admins can create projects' })
  }

  if (!name || !description) {
    return res.status(400).json({ message: 'Project name and description are required' })
  }

  const sanitizedMembers = [...new Set(memberIds.filter(Boolean).map((memberId) => String(memberId)))]
  const ownerId = req.user._id.toString()
  if (!sanitizedMembers.includes(ownerId)) {
    sanitizedMembers.push(ownerId)
  }

  const users = await User.find({ _id: { $in: sanitizedMembers } }).select('_id')
  const validMemberIds = users.map((member) => member._id)

  const project = await Project.create({
    name,
    description,
    status,
    owner: req.user._id,
    members: validMemberIds,
  })

  const populatedProject = await Project.findById(project._id)
    .populate('owner', 'name email role')
    .populate('members', 'name email role')

  res.status(201).json({ project: populatedProject })
}

export async function getProject(req, res) {
  const project = await Project.findById(req.params.id)
    .populate('owner', 'name email role')
    .populate('members', 'name email role')

  if (!project) {
    return res.status(404).json({ message: 'Project not found' })
  }

  const allowed = canManageProject(req.user, project) || project.members.some((member) => member._id.toString() === req.user._id.toString())

  if (!allowed) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  res.json({ project })
}

export async function updateProject(req, res) {
  const project = await Project.findById(req.params.id)

  if (!project) {
    return res.status(404).json({ message: 'Project not found' })
  }

  if (!canManageProject(req.user, project)) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  const { name, description, status, memberIds } = req.body

  if (name !== undefined) project.name = name
  if (description !== undefined) project.description = description
  if (status !== undefined) project.status = status

  if (Array.isArray(memberIds)) {
    const members = await User.find({ _id: { $in: memberIds } }).select('_id')
    const memberIdStrings = members.map((member) => member._id.toString())
    if (!memberIdStrings.includes(project.owner.toString())) {
      memberIdStrings.push(project.owner.toString())
    }
    project.members = memberIdStrings
  }

  await project.save()

  const updatedProject = await Project.findById(project._id)
    .populate('owner', 'name email role')
    .populate('members', 'name email role')

  res.json({ project: updatedProject })
}

export async function deleteProject(req, res) {
  const project = await Project.findById(req.params.id)

  if (!project) {
    return res.status(404).json({ message: 'Project not found' })
  }

  if (!canManageProject(req.user, project)) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  await Task.deleteMany({ project: project._id })
  await project.deleteOne()
  res.json({ message: 'Project deleted' })
}