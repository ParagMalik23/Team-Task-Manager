import Project from '../models/Project.js'
import Task from '../models/Task.js'

async function canAccessProject(user, project) {
  if (!project) return false
  if (user.role === 'Admin') return true
  return project.owner.toString() === user._id.toString() || project.members.some((member) => member.toString() === user._id.toString())
}

export async function listTasks(req, res) {
  const projectFilter = req.user.role === 'Admin'
    ? {}
    : { $or: [{ owner: req.user._id }, { members: req.user._id }] }

  const projects = await Project.find(projectFilter).select('_id')
  const projectIds = projects.map((project) => project._id)

  const tasks = await Task.find(req.user.role === 'Admin' ? {} : { project: { $in: projectIds } })
    .populate('project', 'name status')
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name email role')
    .sort({ createdAt: -1 })

  res.json({ tasks })
}

export async function createTask(req, res) {
  const { projectId, title, description, status = 'todo', priority = 'medium', dueDate, assignedTo } = req.body

  if (!projectId || !title || !description) {
    return res.status(400).json({ message: 'Project, title, and description are required' })
  }

  const project = await Project.findById(projectId)

  if (!project) {
    return res.status(404).json({ message: 'Project not found' })
  }

  if (!(await canAccessProject(req.user, project))) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  if (req.user.role !== 'Admin' && String(assignedTo || '') !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Members can only assign tasks to themselves' })
  }

  if (assignedTo && !project.members.some((member) => member.toString() === String(assignedTo))) {
    return res.status(400).json({ message: 'Assigned user must belong to the project team' })
  }

  const task = await Task.create({
    project: project._id,
    title,
    description,
    status,
    priority,
    dueDate: dueDate || undefined,
    assignedTo: assignedTo || undefined,
    createdBy: req.user._id,
  })

  const createdTask = await Task.findById(task._id)
    .populate('project', 'name status')
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name email role')

  res.status(201).json({ task: createdTask })
}

export async function updateTask(req, res) {
  const task = await Task.findById(req.params.id)

  if (!task) {
    return res.status(404).json({ message: 'Task not found' })
  }

  const canUpdate = req.user.role === 'Admin' || String(task.assignedTo || '') === req.user._id.toString()

  if (!canUpdate) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  const { title, description, status, priority, dueDate, assignedTo } = req.body

  if (req.user.role === 'Admin') {
    if (title !== undefined) task.title = title
    if (description !== undefined) task.description = description
    if (status !== undefined) task.status = status
    if (priority !== undefined) task.priority = priority
    if (dueDate !== undefined) task.dueDate = dueDate || undefined
    if (assignedTo !== undefined) task.assignedTo = assignedTo || undefined
  } else if (status !== undefined) {
    task.status = status
  }

  await task.save()

  const updatedTask = await Task.findById(task._id)
    .populate('project', 'name status')
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name email role')

  res.json({ task: updatedTask })
}

export async function deleteTask(req, res) {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Only admins can delete tasks' })
  }

  const task = await Task.findById(req.params.id)

  if (!task) {
    return res.status(404).json({ message: 'Task not found' })
  }

  await task.deleteOne()
  res.json({ message: 'Task deleted' })
}