import Project from '../models/Project.js'
import Task from '../models/Task.js'

function buildProjectFilter(user) {
  if (user.role === 'Admin') {
    return {}
  }

  return { $or: [{ owner: user._id }, { members: user._id }] }
}

export async function getSummary(req, res) {
  const projectFilter = buildProjectFilter(req.user)
  const projects = await Project.find(projectFilter).select('_id')
  const projectIds = projects.map((project) => project._id)
  const projectCount = projects.length

  const taskFilter = req.user.role === 'Admin'
    ? {}
    : { project: { $in: projectIds } }

  const tasks = await Task.find(taskFilter)
    .populate('project', 'name status')
    .populate('assignedTo', 'name email role')
    .sort({ createdAt: -1 })

  const taskStats = tasks.reduce(
    (accumulator, task) => {
      accumulator[task.status] = (accumulator[task.status] || 0) + 1
      return accumulator
    },
    { todo: 0, inprogress: 0, done: 0 },
  )

  const overdueTasks = tasks.filter((task) => task.dueDate && task.status !== 'done' && new Date(task.dueDate).getTime() < Date.now())
  const recentTasks = tasks.slice(0, 5)

  res.json({
    projectCount,
    memberProjectCount: projectCount,
    overdueCount: overdueTasks.length,
    taskStats,
    overdueTasks,
    recentTasks,
  })
}