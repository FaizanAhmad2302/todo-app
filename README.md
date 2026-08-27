# ✅ Todo App (Secure Full-Stack Application)

> A modern, highly secure full-stack Todo application featuring a **React + Vite** frontend and a robust **HTTP API**, built with **Node.js**, **Express 5**, and **MongoDB**.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?logo=mongodb&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-API_Docs-85EA2D?logo=swagger&logoColor=black)
![License](https://img.shields.io/badge/License-ISC-blue)

---

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Security Architecture](#security-architecture)
- [API Documentation](#api-documentation)
- [Running Tests](#running-tests)
- [Project Structure](#project-structure)
- [License](#license)

---

## Features

This application implements a complete feature set for managing users, sessions, and tasks securely.

### 🔐 Authentication & Security

- **Email Verification**: Mandatory 6-digit OTP email verification for new accounts.
- **JWT & Cookies**: Secure HttpOnly, SameSite cookies for authentication; localStorage is completely avoided.
- **Refresh Token Rotation**: Automatic token refresh with reuse detection that instantly revokes compromised sessions.
- **Session Revocation**: Passwords resets, logouts, or administrator interventions instantly invalidate active sessions.
- **CSRF & CORS**: Strict origin-checking middleware to prevent Cross-Site Request Forgery.
- **Rate Limiting**: Protection against brute-force attacks on sensitive endpoints.

### 📝 Todo Management

- **User Isolation**: Users can securely create, view, update, and delete their own tasks with strict privacy boundaries.
- **Bulk Deletion**: Easily clear all completed or incomplete tasks with built-in safety confirmations.
- **Atomic IDs**: Todos are numbered sequentially per user (e.g., Task 1, Task 2) rather than using complex database IDs.

### 👤 Profile Management

- **Secure Updates**: Display name changes and password resets require OTP verification and/or current password validation.
- **Protected Fields**: The system prevents unauthorized tampering with roles, emails, or account status flags.

### 🛡️ Administrative Interface

- **Global Oversight**: Administrators can view, edit, or delete any task in the entire system.
- **User Moderation**: Administrators can view all standard users, toggle their active status (instantly terminating sessions), or delete accounts entirely (cascading deletes to associated tasks).

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

Copy the example file and configure your credentials:

```bash
cp .env.example .env
```

Ensure the following variables are properly set in your `.env` file:

- `MONGODB_URI`
- `JWT_SECRET` & `JWT_REFRESH_SECRET`
- `RESEND_API_KEY` (for OTP emails)
- `FRONTEND_URL` & `BACKEND_URL`

> [!IMPORTANT]
> The `.env` file contains sensitive credentials and **must not** be committed to version control.

### 3. Start the Backend API

```bash
# Install backend dependencies
npm install

# Start the Express server in development mode
npm run dev
```

_The backend server will start on port 3000._

### 4. Start the Frontend UI

Open a new terminal window and navigate to the frontend directory:

```bash
cd frontend

# Install React/Vite dependencies
npm install

# Start the development server
npm run dev
```

_The UI will be available at `http://localhost:5173`. Open this URL in your browser._

---

## Security Architecture

The backend strictly enforces the following security measures:

- **Passwords**: Hashed with `bcrypt` (Salt rounds: 10).
- **Authentication**: JWTs are transmitted _only_ via `HttpOnly` cookies. The payload never contains sensitive user information.
- **Authorization**: Role-based middleware intercepts requests to `/admin/*` routes, rejecting any non-administrators with a `403 Forbidden` status.
- **Data Integrity**: Input validation ensures that only allowed fields are processed. Unknown fields are rejected with a `400 Bad Request`.

---

## API Documentation

The backend provides interactive **Swagger/OpenAPI 3.0.3** documentation, allowing developers to visually explore and test the API.

- **URL**: `http://localhost:3000/api-docs`
- **Configuration**: Ensure `SWAGGER_ENABLED=true` is set in your `.env` file.
- **Authentication**: You can authenticate directly inside the Swagger UI by calling the `/auth/login` endpoint. The browser will store the secure cookies and allow you to test protected endpoints seamlessly.

---

## Running Tests

The project utilizes the **Node.js built-in test runner** to execute a comprehensive suite of 100+ tests spanning authentication, security, authorization, and standard functionality.

```bash
# Run the complete test suite
npm test
```

> Tests run against the database specified by `MONGODB_TEST_URI`, ensuring that your development data remains completely isolated and untouched.

---

## Project Structure

```text
todo_app/
├── server.js                # Application entry point
├── app.js                   # Express configuration, CORS, rate limiting
├── swagger.js               # OpenAPI/Swagger configuration
├── routes/                  # API Endpoints
│   ├── auth.js              # Authentication, Registration, OTP
│   ├── profile.js           # Secure profile updates
│   ├── todos.js             # Task management
│   └── admin.js             # Administrative oversight
├── middleware/              # Security and Authorization logic
├── models/                  # Mongoose Schemas (User, Todo, OTP, Session, Counter)
├── repositories/            # Database access and abstraction layer
├── frontend/                # React Single Page Application
│   └── src/                 # UI components and state
└── test/                    # Comprehensive integration tests
```

---

## License

This project is licensed under the **ISC** License.
