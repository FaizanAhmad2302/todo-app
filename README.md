# ✅ Todo App

> A lightweight Todo application with a **CLI** and an **HTTP API**, built with **Node.js**, **Express 5**, and **MongoDB**.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?logo=mongodb&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-blue)

---

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [CLI Usage](#cli-usage)
- [HTTP API](#http-api)
- [Running Tests](#running-tests)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [License](#license)

---

## Features

- **Create** todos with a title
- **List** all, completed, or incomplete todos
- **Toggle** completion status
- **Rename** existing todos
- **Delete** individual todos with confirmation prompts
- **Bulk clear** completed, incomplete, or all todos
- **HTTP API** with Express 5 for network access
- **Proper status codes** (201 on create, 204 on delete, 400/404 on errors)

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

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example file and fill in your MongoDB connection strings:

```bash
cp .env.example .env
```

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/todo_app
MONGODB_TEST_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/todo_app_test
```

| Variable           | Description                             |
| ------------------ | --------------------------------------- |
| `MONGODB_URI`      | Connection string for the main database |
| `MONGODB_TEST_URI` | Connection string for the test database |

> [!IMPORTANT]
> The `.env` file contains credentials and **must not** be committed to version control. It is already included in `.gitignore`.

### 4. Start the server

```bash
npm start
```

The server starts on port 3000 (or the port specified by the `PORT` environment variable).

---

## CLI Usage

Run commands with `node index.js <command>`.

Running the application without a command displays the built-in help.

### Add a todo

```bash
node index.js add "Buy milk"
```

### List todos

```bash
# All todos
node index.js list

# Only completed
node index.js list --completed

# Only incomplete
node index.js list --incomplete
```

### Toggle completion

```bash
node index.js done <number>
```

Toggles the specified todo between **completed** and **incomplete**.

### Edit a todo

```bash
node index.js edit <number> "New title"
```

### Delete a todo

```bash
node index.js rm <number>
```

You will be prompted for confirmation before deletion.

### Bulk clear

```bash
# Delete all completed todos
node index.js clear --completed

# Delete all incomplete todos
node index.js clear --incomplete

# Delete all todos
node index.js clear --all
```

> [!WARNING]
> Bulk clear operations are **destructive**. The CLI will ask for confirmation before proceeding.

### Command Reference

| Command                 | Description                              |
| ----------------------- | ---------------------------------------- |
| `add "title"`           | Create a new todo                        |
| `list`                  | List all todos                           |
| `list --completed`      | List completed todos                     |
| `list --incomplete`     | List incomplete todos                    |
| `done <number>`         | Toggle todo completion status            |
| `edit <number> "title"` | Rename a todo                            |
| `rm <number>`           | Delete a single todo (with confirmation) |
| `clear --completed`     | Delete all completed todos               |
| `clear --incomplete`    | Delete all incomplete todos              |
| `clear --all`           | Delete every todo                        |

---

## HTTP API

The HTTP API is served by Express 5 when you run `npm start`. All endpoints are under `/todos`.

### Endpoints

| Method   | Path                     | Body                                                | Description             | Success |
| -------- | ------------------------ | --------------------------------------------------- | ----------------------- | ------- |
| `GET`    | `/todos`                 | —                                                   | List all todos          | 200     |
| `GET`    | `/todos?completed=true`  | —                                                   | List completed todos    | 200     |
| `GET`    | `/todos?completed=false` | —                                                   | List incomplete todos   | 200     |
| `GET`    | `/todos/:id`             | —                                                   | Get one todo            | 200     |
| `POST`   | `/todos`                 | `{ "title": "Buy milk" }`                           | Create a todo           | 201     |
| `PATCH`  | `/todos/:id`             | `{ "title": "..." }` and/or `{ "completed": true }` | Update a todo           | 200     |
| `DELETE` | `/todos/:id`             | —                                                   | Delete one todo         | 204     |
| `DELETE` | `/todos`                 | —                                                   | Delete all todos        | 204     |
| `DELETE` | `/todos?completed=true`  | —                                                   | Delete completed todos  | 204     |
| `DELETE` | `/todos?completed=false` | —                                                   | Delete incomplete todos | 204     |

### Error Responses

| Status | Meaning       | Example                                       |
| ------ | ------------- | --------------------------------------------- |
| 400    | Invalid input | Missing title, empty title, non-integer `:id` |
| 404    | Not found     | Valid `:id` but no such todo exists           |
| 500    | Server error  | Unexpected failure                            |

### Examples

```bash
# Create a todo
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "Buy milk"}'

# List all todos
curl http://localhost:3000/todos

# Get one todo
curl http://localhost:3000/todos/1

# Mark as completed
curl -X PATCH http://localhost:3000/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'

# Delete a todo
curl -X DELETE http://localhost:3000/todos/1
```

---

## Running Tests

The project uses the **Node.js built-in test runner**:

```bash
npm test
```

Tests connect to the database specified by `MONGODB_TEST_URI`, keeping test data fully isolated from your main database.

---

## Project Structure

```
todo_app/
├── server.js                # HTTP entry point — starts Express & connects to DB
├── app.js                   # Express app setup, middleware & route registration
├── index.js                 # CLI entry point & user interaction
├── todo.js                  # Core todo operations & input validation
├── database.js              # MongoDB connection handling
├── models/
│   └── Todo.js              # Mongoose schema & model
├── repositories/
│   └── TodoRepository.js    # Database access layer
├── routes/
│   └── todos.js             # Express router — HTTP API endpoints
├── test/
│   └── todo.test.js         # Automated test suite
├── .env.example             # Environment variable template
├── .gitignore
├── package.json
└── README.md
```

### Architecture

```
CLI (index.js)  ──┐
                   ├──▶  Business Logic (todo.js)  ──▶  Repository (TodoRepository.js)  ──▶  ODM (Mongoose / Todo.js)  ──▶  MongoDB
HTTP (server.js → app.js → routes/todos.js)  ──┘
```

---

## API Reference

Public functions exported by `todo.js`:

| Function                        | Description                               |
| ------------------------------- | ----------------------------------------- |
| `addTodo(title)`                | Creates a new todo and returns its number |
| `getTodos()`                    | Returns all todos                         |
| `getTodo(todoNumber)`           | Returns a single todo by number           |
| `toggleTodo(todoNumber)`        | Toggles completion status                 |
| `renameTodo(todoNumber, title)` | Updates a todo's title                    |
| `deleteTodo(todoNumber)`        | Deletes one todo                          |
| `deleteAllTodos()`              | Deletes all todos                         |
| `getCompletedTodos()`           | Returns only completed todos              |
| `getIncompleteTodos()`          | Returns only incomplete todos             |
| `deleteCompletedTodos()`        | Deletes all completed todos               |
| `deleteIncompleteTodos()`       | Deletes all incomplete todos              |

---

## Environment Variables

See [`.env.example`](.env.example) for a template.

| Variable           | Required | Description                            |
| ------------------ | -------- | -------------------------------------- |
| `MONGODB_URI`      | Yes      | MongoDB connection string (production) |
| `MONGODB_TEST_URI` | Yes      | MongoDB connection string (test suite) |

---

## License

This project is licensed under the **ISC** License.
