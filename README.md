# Team Task Manager

Full-stack MERN project for managing projects, tasks, team members, and progress with Admin/Member roles.

## Features

- Signup and login with JWT authentication
- Role-based access control for Admin and Member users
- Project creation and team assignment
- Task creation, assignment, status, priority, and overdue tracking
- Dashboard with summary counts and recent activity
- MongoDB relationships between users, projects, and tasks

## Tech Stack

- React + Vite
- Node.js + Express
- MongoDB + Mongoose
- JWT authentication
## Live Demo
https://team-task-manager-ivory-theta.vercel.app/

## Setup

1. Install dependencies at the project root:

	 ```bash
	 npm install
	 ```

2. Create a `.env` file inside `backend/` from `backend/.env.example`.

3. Add your MongoDB connection string and JWT secret.

4. Run the frontend and backend in separate terminals:

	 ```bash
	 npm run dev
	 npm run dev:server
	 ```

## Production

1. Run the frontend build:

	 ```bash
	 npm run build
	 ```

2. Start the backend server:

	 ```bash
	 npm start
	 ```

The backend serves the built React app from `dist/` in production.

## Manual MongoDB Seed Data

Use these documents in MongoDB Compass or `mongosh` to create a starter admin and sample records. Replace the placeholder IDs with the real `_id` values from your database.

### users

```js
db.users.insertOne({
	name: 'Admin User',
	email: 'admin@taskmanager.com',
	password: '$2b$10$Z2yTQq5sKAq2VxzIhWEocOSNX42/G.cJdN283DFh.yp5hzqhxud8G',
	role: 'Admin',
	createdAt: new Date(),
	updatedAt: new Date(),
})

db.users.insertMany([
	{
		name: 'Member One',
		email: 'member1@taskmanager.com',
		password: '$2b$10$wRBz6h1xbFKSF96nWxjN8O944QLvP5YXWfrYSOwnKdWFeEmE6ZpWy',
		role: 'Member',
		createdAt: new Date(),
		updatedAt: new Date(),
	},
	{
		name: 'Member Two',
		email: 'member2@taskmanager.com',
		password: '$2b$10$wRBz6h1xbFKSF96nWxjN8O944QLvP5YXWfrYSOwnKdWFeEmE6ZpWy',
		role: 'Member',
		createdAt: new Date(),
		updatedAt: new Date(),
	},
])
```

### projects

```js
db.projects.insertOne({
	name: 'Website Redesign',
	description: 'Refresh the marketing site and improve mobile usability.',
	status: 'active',
	owner: ObjectId('REPLACE_ADMIN_OBJECT_ID'),
	members: [
		ObjectId('REPLACE_ADMIN_OBJECT_ID'),
		ObjectId('REPLACE_MEMBER_ONE_OBJECT_ID'),
	],
	createdAt: new Date(),
	updatedAt: new Date(),
})
```

### tasks

```js
db.tasks.insertOne({
	project: ObjectId('REPLACE_PROJECT_OBJECT_ID'),
	title: 'Build login screen',
	description: 'Create authentication form and connect it to the API.',
	status: 'inprogress',
	priority: 'high',
	dueDate: new Date('2026-05-30'),
	assignedTo: ObjectId('REPLACE_MEMBER_ONE_OBJECT_ID'),
	createdBy: ObjectId('REPLACE_ADMIN_OBJECT_ID'),
	createdAt: new Date(),
	updatedAt: new Date(),
})
```

## Deployment on Railway

1. Push this repo to GitHub.
2. Create the MongoDB Atlas connection string using the steps above.
3. Create a new Railway service from the repo.
4. Set the environment variables from `backend/.env.example`.
5. Set `MONGODB_URI` to your Atlas connection string.
6. Set `JWT_SECRET` to a long random value.
7. Use `npm run build` for the build command and `npm start` for the start command.
8. Deploy and test the live URL.

## Notes

- Admin users can create and delete projects and tasks.
- Members can update the status of tasks assigned to them.
- The app shows project counts, task counts, and overdue items on the dashboard.
