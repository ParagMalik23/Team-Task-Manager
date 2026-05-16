import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest } from './lib/api.js'
import './App.css'

const emptyAuth = {
  name: '',
  email: '',
  password: '',
  role: 'Member',
}

const emptyProject = {
  name: '',
  description: '',
  status: 'active',
  memberIds: [],
}

const emptyTask = {
  projectId: '',
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  dueDate: '',
  assignedTo: '',
}

const authLabels = {
  Admin: 'Admin',
  Member: 'Member',
}

const statusLabels = {
  todo: 'To do',
  inprogress: 'In progress',
  done: 'Done',
}

const statusClass = {
  todo: 'badge badge-warm',
  inprogress: 'badge badge-blue',
  done: 'badge badge-green',
}

const priorityClass = {
  low: 'badge badge-green',
  medium: 'badge badge-blue',
  high: 'badge badge-warm',
}

const formatDate = (value) => {
  if (!value) return 'No deadline'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'No deadline'
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const isOverdue = (task) => {
  if (!task?.dueDate || task.status === 'done') return false
  return new Date(task.dueDate).getTime() < Date.now()
}

function App() {
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState(emptyAuth)
  const [token, setToken] = useState(() => localStorage.getItem('task-manager-token') || '')
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('task-manager-user')
    return stored ? JSON.parse(stored) : null
  })
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [summary, setSummary] = useState({})
  const [projectForm, setProjectForm] = useState(emptyProject)
  const [taskForm, setTaskForm] = useState(emptyTask)
  const [authNotice, setAuthNotice] = useState({ type: '', text: '' })
  const [workspaceNotice, setWorkspaceNotice] = useState({ type: '', text: '' })
  const [busy, setBusy] = useState(false)
  const isAdmin = user?.role === 'Admin'

  const memberUsers = useMemo(
    () => users.filter((entry) => entry.role === 'Member' || entry.role === 'Admin'),
    [users],
  )

  const selectedProjectMembers = useMemo(() => {
    const project = projects.find((entry) => entry._id === taskForm.projectId)
    return project?.members || []
  }, [projects, taskForm.projectId])

  const clearSession = () => {
    localStorage.removeItem('task-manager-token')
    localStorage.removeItem('task-manager-user')
    setToken('')
    setUser(null)
    setAuthMode('login')
    setAuthForm(emptyAuth)
    setAuthNotice({ type: '', text: '' })
    setWorkspaceNotice({ type: '', text: '' })
    setProjects([])
    setTasks([])
    setUsers([])
    setSummary({})
  }

  const loadWorkspace = useCallback(
    async (activeToken = token) => {
      if (!activeToken) return
      setBusy(true)
      setWorkspaceNotice({ type: '', text: '' })
      try {
        const summaryData = await apiRequest('/dashboard/summary', { token: activeToken })
        const projectData = await apiRequest('/projects', { token: activeToken })
        const taskData = await apiRequest('/tasks', { token: activeToken })

        const userData = isAdmin
          ? await apiRequest('/users', { token: activeToken })
          : { users: [] }

        setSummary(summaryData)
        setProjects(projectData.projects || [])
        setTasks(taskData.tasks || [])
        setUsers(userData.users || [])
        setTaskForm((current) => ({
          ...current,
          projectId: current.projectId || projectData.projects?.[0]?._id || '',
        }))
      } catch (fetchError) {
        setWorkspaceNotice({ type: 'error', text: fetchError.message })
        if (fetchError.message.toLowerCase().includes('unauthorized')) {
          clearSession()
        }
      } finally {
        setBusy(false)
      }
    },
    [isAdmin, token],
  )

  useEffect(() => {
    if (token && user) {
      loadWorkspace(token)
    }
  }, [token, user, loadWorkspace])

  useEffect(() => {
    if (!projectForm.memberIds.length && users.length) {
      const defaultMember = users.find((entry) => entry.role === 'Member')
      if (defaultMember) {
        setProjectForm((current) => ({
          ...current,
          memberIds: [defaultMember._id],
        }))
      }
    }
  }, [users, projectForm.memberIds.length])

  useEffect(() => {
    if (!taskForm.projectId && projects.length) {
      setTaskForm((current) => ({
        ...current,
        projectId: projects[0]._id,
      }))
    }
  }, [projects, taskForm.projectId])

  const handleAuthSubmit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setAuthNotice({ type: '', text: '' })

    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/signup'
      const payload = authMode === 'login'
        ? { email: authForm.email, password: authForm.password }
        : authForm

      const response = await apiRequest(endpoint, { method: 'POST', body: payload })

      setToken(response.token)
      setUser(response.user)
      localStorage.setItem('task-manager-token', response.token)
      localStorage.setItem('task-manager-user', JSON.stringify(response.user))
      setAuthNotice({ type: 'success', text: `Welcome back, ${response.user.name}.` })
      setAuthForm(emptyAuth)
    } catch (authError) {
      setAuthNotice({ type: 'error', text: authError.message })
    } finally {
      setBusy(false)
    }
  }

  const handleProjectSubmit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setWorkspaceNotice({ type: '', text: '' })

    try {
      await apiRequest('/projects', {
        token,
        method: 'POST',
        body: {
          ...projectForm,
          memberIds: projectForm.memberIds.filter(Boolean),
        },
      })
      setWorkspaceNotice({ type: 'success', text: 'Project created successfully.' })
      setProjectForm(emptyProject)
      await loadWorkspace()
    } catch (projectError) {
      setWorkspaceNotice({ type: 'error', text: projectError.message })
    } finally {
      setBusy(false)
    }
  }

  const handleTaskSubmit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setWorkspaceNotice({ type: '', text: '' })

    try {
      await apiRequest('/tasks', {
        token,
        method: 'POST',
        body: taskForm,
      })
      setWorkspaceNotice({ type: 'success', text: 'Task created successfully.' })
      setTaskForm((current) => ({
        ...emptyTask,
        projectId: current.projectId,
      }))
      await loadWorkspace()
    } catch (taskError) {
      setWorkspaceNotice({ type: 'error', text: taskError.message })
    } finally {
      setBusy(false)
    }
  }

  const updateTask = async (taskId, status) => {
    try {
      setWorkspaceNotice({ type: '', text: '' })
      await apiRequest(`/tasks/${taskId}`, {
        token,
        method: 'PATCH',
        body: { status },
      })
      setWorkspaceNotice({ type: 'success', text: 'Task status updated.' })
      await loadWorkspace()
    } catch (updateError) {
      setWorkspaceNotice({ type: 'error', text: updateError.message })
    }
  }

  const removeTask = async (taskId) => {
    try {
      setWorkspaceNotice({ type: '', text: '' })
      await apiRequest(`/tasks/${taskId}`, { token, method: 'DELETE' })
      setWorkspaceNotice({ type: 'success', text: 'Task deleted.' })
      await loadWorkspace()
    } catch (removeError) {
      setWorkspaceNotice({ type: 'error', text: removeError.message })
    }
  }

  const removeProject = async (projectId) => {
    try {
      setWorkspaceNotice({ type: '', text: '' })
      await apiRequest(`/projects/${projectId}`, { token, method: 'DELETE' })
      setWorkspaceNotice({ type: 'success', text: 'Project deleted.' })
      await loadWorkspace()
    } catch (removeError) {
      setWorkspaceNotice({ type: 'error', text: removeError.message })
    }
  }

  const authCopy = authMode === 'login'
    ? 'Use your team account to manage projects, tasks, and progress.'
    : 'Create a member account or sign up as an admin for the workspace owner.'

  const taskStats = summary?.taskStats || {}
  const overdueTasks = summary?.overdueTasks || []
  const recentTasks = summary?.recentTasks || []

  if (!token || !user) {
    return (
      <main className="shell auth-shell">
        <section className="hero-panel">
          <p className="eyebrow">Team Task Manager</p>
          <h1>Track projects, assign work, and keep delivery visible.</h1>
          <p className="hero-copy">
            A workspace with authentication, role-based access, dashboard metrics,
            overdue tracking, and project-level task management.
          </p>

          
        </section>

        <section className="auth-card">
          <div className="auth-toggle">
            <button
              type="button"
              className={authMode === 'login' ? 'toggle-active' : ''}
              onClick={() => {
                setAuthMode('login')
                setMessage('')
                setError('')
              }}
            >
              Login
            </button>
            <button
              type="button"
              className={authMode === 'signup' ? 'toggle-active' : ''}
              onClick={() => {
                setAuthMode('signup')
                setMessage('')
                setError('')
              }}
            >
              Signup
            </button>
          </div>

          <form className="stack" onSubmit={handleAuthSubmit}>
            {authMode === 'signup' && (
              <label>
                Full name
                <input
                  value={authForm.name}
                  onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })}
                  placeholder="Amina Patel"
                  required
                />
              </label>
            )}

            <label>
              Email
              <input
                type="email"
                value={authForm.email}
                onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
                placeholder="team@company.com"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={authForm.password}
                onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                placeholder="Minimum 6 characters"
                required
              />
            </label>

            {authMode === 'signup' && (
              <label>
                Role
                <select
                  value={authForm.role}
                  onChange={(event) => setAuthForm({ ...authForm, role: event.target.value })}
                >
                  <option value="Member">Member</option>
                  <option value="Admin">Admin</option>
                </select>
              </label>
            )}

            {authNotice.text && (
              <p className={authNotice.type === 'error' ? 'notice error' : 'notice success'}>
                {authNotice.text}
              </p>
            )}

            <button type="submit" disabled={busy}>
              {busy ? 'Working...' : authMode === 'login' ? 'Login to workspace' : 'Create account'}
            </button>
          </form>

          <p className="auth-help">{authCopy}</p>
        </section>
      </main>
    )
  }

  return (
    <main className="shell app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Team Task Manager</h1>
          <p className="subtle">Signed in as {user.name} · {authLabels[user.role] || user.role}</p>
        </div>

        <div className="topbar-actions">
          <button type="button" className="ghost" onClick={() => loadWorkspace()}>
            Refresh
          </button>
          <button type="button" onClick={clearSession}>
            Logout
          </button>
        </div>
      </header>

      <section className="stats-grid">
        <article className="stat-card accent-card">
          <span>Projects</span>
          <strong>{summary.projectCount ?? projects.length}</strong>
          <small>{summary.memberProjectCount ?? 0} assigned to your team</small>
        </article>
        <article className="stat-card">
          <span>Open tasks</span>
          <strong>{taskStats.todo ?? 0}</strong>
          <small>Waiting to be started</small>
        </article>
        <article className="stat-card">
          <span>In progress</span>
          <strong>{taskStats.inprogress ?? 0}</strong>
          <small>Currently active</small>
        </article>
        <article className="stat-card">
          <span>Completed</span>
          <strong>{taskStats.done ?? 0}</strong>
          <small>Finished tasks</small>
        </article>
        <article className="stat-card danger-card">
          <span>Overdue</span>
          <strong>{summary.overdueCount ?? overdueTasks.length}</strong>
          <small>Need attention now</small>
        </article>
      </section>

      {workspaceNotice.text && (
        <p className={workspaceNotice.type === 'error' ? 'notice error' : 'notice success'}>
          {workspaceNotice.text}
        </p>
      )}

      <section className="grid-layout">
        <div className="panel stack">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Projects</p>
              <h2>Create a project</h2>
            </div>
            <span className="role-chip">{user.role === 'Admin' ? 'Admin access' : 'Member view'}</span>
          </div>

          {user.role === 'Admin' ? (
            <form className="stack" onSubmit={handleProjectSubmit}>
              <label>
                Project name
                <input
                  value={projectForm.name}
                  onChange={(event) => setProjectForm({ ...projectForm, name: event.target.value })}
                  placeholder="Website redesign"
                  required
                />
              </label>

              <label>
                Description
                <textarea
                  rows="4"
                  value={projectForm.description}
                  onChange={(event) => setProjectForm({ ...projectForm, description: event.target.value })}
                  placeholder="Launch requirements, milestones, and team notes"
                  required
                />
              </label>

              <label>
                Team members
                <select
                  multiple
                  value={projectForm.memberIds}
                  onChange={(event) => setProjectForm({
                    ...projectForm,
                    memberIds: Array.from(event.target.selectedOptions, (option) => option.value),
                  })}
                >
                  {memberUsers.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.name} · {member.email}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Status
                <select
                  value={projectForm.status}
                  onChange={(event) => setProjectForm({ ...projectForm, status: event.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </label>

              <button type="submit" disabled={busy}>Create project</button>
            </form>
          ) : (
            <p className="subtle">Only admins can create and delete projects.</p>
          )}

          <div className="list stack">
            {projects.length === 0 ? (
              <p className="subtle">No projects yet.</p>
            ) : (
              projects.map((project) => (
                <article className="list-item" key={project._id}>
                  <div className="item-header">
                    <div>
                      <h3>{project.name}</h3>
                      <p>{project.description}</p>
                    </div>
                    <span className={project.status === 'completed' ? 'badge badge-green' : 'badge badge-blue'}>
                      {project.status}
                    </span>
                  </div>

                  <div className="item-meta">
                    <span>Owner: {project.owner?.name || 'Unknown'}</span>
                    <span>{project.members?.length || 0} members</span>
                    <span>{project.taskCount || 0} tasks</span>
                  </div>

                  {user.role === 'Admin' && (
                    <button type="button" className="ghost danger" onClick={() => removeProject(project._id)}>
                      Delete project
                    </button>
                  )}
                </article>
              ))
            )}
          </div>
        </div>

        <div className="panel stack">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Tasks</p>
              <h2>Track progress</h2>
            </div>
          </div>

          {user.role === 'Admin' ? (
            <form className="stack" onSubmit={handleTaskSubmit}>
              <label>
                Project
                <select
                  value={taskForm.projectId}
                  onChange={(event) => setTaskForm({ ...taskForm, projectId: event.target.value })}
                  required
                >
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Title
                <input
                  value={taskForm.title}
                  onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })}
                  placeholder="Build authentication flow"
                  required
                />
              </label>

              <label>
                Description
                <textarea
                  rows="4"
                  value={taskForm.description}
                  onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })}
                  placeholder="Implementation notes and expected outcome"
                  required
                />
              </label>

              <div className="inline-grid">
                <label>
                  Status
                  <select
                    value={taskForm.status}
                    onChange={(event) => setTaskForm({ ...taskForm, status: event.target.value })}
                  >
                    <option value="todo">To do</option>
                    <option value="inprogress">In progress</option>
                    <option value="done">Done</option>
                  </select>
                </label>

                <label>
                  Priority
                  <select
                    value={taskForm.priority}
                    onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
              </div>

              <div className="inline-grid">
                <label>
                  Due date
                  <input
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(event) => setTaskForm({ ...taskForm, dueDate: event.target.value })}
                  />
                </label>

                <label>
                  Assigned to
                  <select
                    value={taskForm.assignedTo}
                    onChange={(event) => setTaskForm({ ...taskForm, assignedTo: event.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {(selectedProjectMembers.length > 0 ? selectedProjectMembers : memberUsers).map((member) => (
                      <option key={member._id} value={member._id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <button type="submit" disabled={busy}>Create task</button>
            </form>
          ) : (
            <p className="subtle">Members can update task status and view project progress.</p>
          )}

          <div className="list stack">
            {tasks.length === 0 ? (
              <p className="subtle">No tasks yet.</p>
            ) : (
              tasks.map((task) => (
                <article className={isOverdue(task) ? 'list-item overdue' : 'list-item'} key={task._id}>
                  <div className="item-header">
                    <div>
                      <h3>{task.title}</h3>
                      <p>{task.description}</p>
                    </div>
                    <div className="badge-row">
                      <span className={statusClass[task.status] || 'badge'}>{statusLabels[task.status] || task.status}</span>
                      <span className={priorityClass[task.priority] || 'badge'}>{task.priority}</span>
                    </div>
                  </div>

                  <div className="item-meta">
                    <span>Project: {task.project?.name || 'Unknown'}</span>
                    <span>Assigned to: {task.assignedTo?.name || 'Unassigned'}</span>
                    <span>Due: {formatDate(task.dueDate)}</span>
                  </div>

                  <div className="action-row">
                    <select value={task.status} onChange={(event) => updateTask(task._id, event.target.value)}>
                      <option value="todo">To do</option>
                      <option value="inprogress">In progress</option>
                      <option value="done">Done</option>
                    </select>

                    {user.role === 'Admin' && (
                      <button type="button" className="ghost danger" onClick={() => removeTask(task._id)}>
                        Delete task
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid-layout bottom-grid">
        <article className="panel stack">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Dashboard</p>
              <h2>Overdue tasks</h2>
            </div>
          </div>

          <div className="mini-list stack">
            {overdueTasks.length === 0 ? (
              <p className="subtle">No overdue tasks.</p>
            ) : (
              overdueTasks.map((task) => (
                <div className="mini-item" key={task._id}>
                  <strong>{task.title}</strong>
                  <span>{task.project?.name || 'Project'}</span>
                  <span>{formatDate(task.dueDate)}</span>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="panel stack">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Activity</p>
              <h2>Recent tasks</h2>
            </div>
          </div>

          <div className="mini-list stack">
            {recentTasks.length === 0 ? (
              <p className="subtle">Nothing recent yet.</p>
            ) : (
              recentTasks.map((task) => (
                <div className="mini-item" key={task._id}>
                  <strong>{task.title}</strong>
                  <span>{task.project?.name || 'Project'}</span>
                  <span>{statusLabels[task.status] || task.status}</span>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </main>
  )
}

export default App