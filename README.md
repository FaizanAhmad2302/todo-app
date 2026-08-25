# ✅ Todo App (Full-Stack)

> A modern, full-stack Todo application featuring a **React + Vite** frontend, alongside a **CLI** and an **HTTP API**, built with **Node.js**, **Express 5**, and **MongoDB**.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?logo=mongodb&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-blue)

---

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Frontend UI](#frontend-ui)
- [CLI Usage](#cli-usage)
- [HTTP API](#http-api)
- [Running Tests](#running-tests)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [License](#license)

---

## Features

- **Beautiful React Frontend** built with Vite and pure CSS.
- **Real-time Client-Side Search** and dynamic filtering (Active/Completed).
- **Create** todos with a title (strictly validated up to 50 characters).
- **List** all, completed, or incomplete todos.
- **Toggle** completion status seamlessly.
- **Rename** existing todos inline.
- **Delete** individual todos and execute **Bulk clear** operations with safeguards.
- **HTTP API** with Express 5 featuring rate limiting, CORS protection, and proper status codes.
- **CLI Mode** for managing tasks directly from your terminal.

---

## Prerequisites

| Requirement | Version |
| ----------- | ------- |
| Node.js     | ≥ 18    |
| MongoDB     | Any     |

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/FaizanAhmad2302/todo-app.git
cd todo-app
```

### 2. Configure Backend Environment

Copy the example file and fill in your MongoDB connection strings:

```bash
cp .env.example .env
```

```env
MONGODB_URI=mongodb://localhost:27017/todoapp
PORT=3000
```

> [!IMPORTANT]
> The `.env` file contains credentials and **must not** be committed to version control. 

### 3. Start the Backend API

```bash
# Install backend dependencies
npm install

# Start the Express server
node server.js
```
*The backend server will start on port 3000.*

### 4. Start the Frontend UI

Open a new terminal window and navigate to the frontend directory:

```bash
cd frontend

# Install React/Vite dependencies
npm install

# Start the development server
npm run dev
```

*The UI will be available at `http://localhost:5173`. Open this URL in your browser.*

---

## Frontend UI

The frontend is a fully responsive Single Page Application (SPA) located in the `/frontend` directory. 
- It uses `todoApi.js` to communicate with the Express backend via the `fetch` API.
- All backend errors (like Rate Limiting or network issues) are gracefully caught and displayed as UI Toasts.
- To configure the frontend API URL, you can create a `.env` file inside the `frontend` folder:
  ```env
  VITE_API_URL=http://localhost:3000/todos
  ```

---

## CLI Usage

You can also manage your tasks completely from the terminal! Run commands with `node index.js <command>`.

| Command                 | Description                              |
| ----------------------- | ---------------------------------------- |
| `node index.js add "title"`| Create a new todo                        |
| `node index.js list`      | List all todos                           |
| `node index.js list --completed`| List completed todos                     |
| `node index.js done <number>`| Toggle todo completion status            |
| `node index.js edit <number> "title"` | Rename a todo                            |
| `node index.js rm <number>`| Delete a single todo (with confirmation) |
| `node index.js clear --completed`| Delete all completed todos               |

---

## HTTP API

The HTTP API is served by Express 5. All endpoints are under `/todos`.

| Method   | Path                     | Body                                                | Description             |
| -------- | ------------------------ | --------------------------------------------------- | ----------------------- |
| `GET`    | `/todos`                 | —                                                   | List all todos          |
| `GET`    | `/todos?completed=true`  | —                                                   | List completed todos    |
| `POST`   | `/todos`                 | `{ "title": "Buy milk" }`                           | Create a todo           |
| `PATCH`  | `/todos/:id`             | `{ "title": "..." }` and/or `{ "completed": true }` | Update a todo           |
| `DELETE` | `/todos/:id`             | —                                                   | Delete one todo         |
| `DELETE` | `/todos?completed=true`  | —                                                   | Delete completed todos  |

*(Note: Unfiltered bulk deletion `DELETE /todos` is intentionally blocked by the API for safety).*

---

## Running Tests

The project uses the **Node.js built-in test runner**:

```bash
npm test
```

Tests connect to the database specified by `MONGODB_TEST_URI`, keeping test data fully isolated from your main database.

---

## Project Structure

```text
todo_app/
├── server.js                # HTTP entry point — starts Express
├── app.js                   # Express app setup, CORS, rate limiting
├── index.js                 # CLI entry point
├── todo.js                  # Core business logic
├── models/
│   ├── Counter.js           # Atomic ID generation schema
│   └── Todo.js              # Mongoose schema
├── repositories/
│   └── TodoRepository.js    # Database access layer
├── routes/
│   └── todos.js             # HTTP API endpoints
├── frontend/                # React SPA
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx          # Main UI state and layout
│       ├── index.css        # Vanilla CSS styling
│       ├── components/      # React components (TodoForm, TodoItem, etc.)
│       └── services/
│           └── todoApi.js   # HTTP fetch wrappers
└── test/
    └── todo.test.js         # Automated test suite
```

### Architecture Flow

```text
React Frontend ──▶ Express API (app.js) ──▶ Business Logic (todo.js) ──▶ Repository ──▶ MongoDB
```

---

## License

This project is licensed under the **ISC** License.
