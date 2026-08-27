# Todo Application - Software Requirements Specification (SRS)

## 1. Overview
The Todo Application is a secure, task-management system designed to help users organize their daily activities efficiently. The main purpose of the system is to provide a reliable and isolated environment where individuals can keep track of their tasks, mark them as completed, and manage their personal profiles. 

The application solves the problem of personal task disorganization by offering a centralized, easy-to-use platform. Users interact with the system by creating an account, verifying their identity via email, and maintaining their own isolated list of tasks. Administrators interact with the system through a dedicated management interface that allows them to oversee all user activity, manage accounts, and ensure the system operates smoothly. 

The system relies on a robust backend REST API that processes user requests, handles complex authentication and authorization rules, and interacts securely with the database.

## 2. User Roles
The system strictly distinguishes between two user roles, each with specific permissions and capabilities.

### A. Normal User
A Normal User is the primary consumer of the application. 
- **Capabilities**: Normal users can create, view, update, and delete their own Todos. They can also update their personal profile information and change their passwords.
- **Information Access**: Normal users can only access their personal profile and their own Todos.
- **Restrictions**: They cannot view, modify, or delete any information belonging to other users. They cannot access administrative features or view the total list of users in the system.
- **Authentication Actions**: They can register, log in, request password resets via OTP, and log out.

### B. Administrator
An Administrator oversees the health and integrity of the application.
- **Capabilities**: Administrators have full access to all standard user capabilities, plus elevated permissions to manage other users and their data.
- **User-Management**: They can view the complete list of normal users, toggle user account status (enable/disable), and permanently delete user accounts.
- **Todo-Management**: They can view all Todos across the entire system, and can edit or delete any Todo regardless of who created it.
- **Restrictions**: Administrators cannot view passwords or sensitive authentication tokens of other users. 

### Permissions Summary

| Feature/Action | Normal User | Administrator |
|----------------|-------------|---------------|
| Register | Yes | Yes (Created natively) |
| Login / Logout | Yes | Yes |
| Manage own Todos | Yes | Yes |
| Manage own Profile | Yes | Yes |
| View other users' Todos | No | Yes |
| Edit/Delete other users' Todos | No | Yes |
| View user list | No | Yes |
| Disable/Enable user accounts | No | Yes |
| Delete user accounts | No | Yes |

## 3. Implemented Features
The following features are fully implemented and available in the current system.

### Authentication
- **User Signup**: Allows individuals to register by providing a name, email, and password.
- **Email Verification / OTP**: Sends a 6-digit One-Time Password to the user's email to verify their identity before activating the account.
- **Login / Logout**: Authenticates users and securely revokes their session upon logging out.
- **Access-Token Authentication**: Uses secure, short-lived tokens to verify identity on every request.
- **Refresh-Token Functionality**: Seamlessly issues new access tokens without requiring the user to re-enter credentials, while actively rotating tokens for security.
- **Session Handling**: Tracks the exact device/session family to allow global revocation.
- **Forgot/Reset Password**: Allows users to securely recover their accounts using an email OTP.
- **Authentication State**: Provides an endpoint for the client to retrieve the current user's profile and roles.

### Todo Management
- **Create Todo**: Users can create new tasks with a specific title.
- **View Todos**: Users can view a list of their tasks.
- **View Individual Todo**: Users can retrieve details for a specific task using its unique identifier.
- **Update Todo**: Users can modify the title or completion status of an existing task.
- **Mark Todo Completed/Incomplete**: Users can quickly toggle the status of a task.
- **Delete Todo**: Users can permanently remove a task.
- **Bulk Deletion**: Users can bulk delete tasks filtered specifically by completion status (e.g., "delete all completed").
- **Todo Ownership/Isolation**: The system strictly isolates tasks; a user can never interact with a task they do not own.
- **Todo Number Generation**: Tasks are assigned a sequential, user-specific ID (e.g., Task 1, Task 2) rather than a complex database ID.

### Profile
- **Request Profile Update**: Users can initiate a profile update, which triggers a security OTP.
- **OTP Verification**: Verifies the OTP before applying any profile changes.
- **Updating Allowed Information**: Users can securely change their display name.
- **Password Update Behavior**: Changing a password requires the current password and automatically revokes all other active sessions across devices.
- **Protected Fields**: The system prevents users from maliciously elevating their privileges (e.g., changing their role to admin) or altering fundamental data like their core user ID.

### Administration
- **View Users**: Administrators can see a complete roster of registered normal users.
- **Enable/Disable Users**: Administrators can temporarily freeze a user's account, instantly terminating their active sessions.
- **Delete Users**: Administrators can permanently remove a user and all of their associated tasks (cascading delete).
- **View/Edit/Delete Any Todo**: Administrators have global oversight and can moderate any task in the system.
- **Admin-only Access Restrictions**: The system actively rejects any non-administrative user attempting to access these features.

### Security
- **HttpOnly Authentication Cookies**: Tokens are stored in cookies inaccessible to JavaScript, completely eliminating XSS token theft.
- **Role-Based Access Control**: Strict middleware checks the user's role before allowing access to administrative actions.
- **Password Protection**: Passwords are mathematically hashed (bcrypt) and never stored in plain text.
- **OTP-Based Verification**: Critical actions (signup, password reset, profile update) require secondary verification via email.
- **Rate Limiting**: The system throttles rapid requests to prevent brute-force attacks and abuse.
- **CORS Restrictions**: The system only accepts requests from explicitly trusted frontend domains.
- **CSRF Protection**: All state-changing requests are verified against trusted origins to prevent Cross-Site Request Forgery.
- **Input Validation**: The system strictly filters and validates incoming data, rejecting unknown or malicious fields.
- **Session Revocation**: Compromised or recycled tokens instantly trigger a full session lockdown for the user.

### API Documentation
The backend provides interactive Swagger/OpenAPI documentation.
- **Purpose**: To allow developers to visually explore, understand, and test the API without writing code.
- **Availability**: The documentation is hosted directly by the backend at `/api-docs`.
- **Authentication Behavior**: Users can log in directly through the Swagger interface. The browser securely handles the cookies, allowing the user to subsequently test protected endpoints within the UI.
- **Security**: The documentation details request structures but is strictly configured not to expose environmental secrets or database credentials.

## 4. New / Proposed Features
Based on the current architecture, the following enhancements are proposed. These features provide significant value and can be implemented completely **FREE** using the existing Node.js/MongoDB stack.

**Proposed / Future Features:**

1. **Due Dates and Times**
   - *Purpose*: Allow users to assign deadlines to tasks.
   - *Who can use it*: All users.
   - *How it works*: Users can select a date and time when creating or editing a task. The system stores the due date/time in the database, and the frontend can display tasks based on their deadlines.
   - *Business Rule*: Due dates cannot be set in the past when creating a new task.

2. **Priority Levels**
   - *Purpose*: Help users identify and focus on the most important tasks.
   - *Who can use it*: All users.
   - *How it works*: Users can assign a priority level to each task, such as Low, Medium, or High.
   - *Business Rule*: If no priority is provided, the system defaults to "Medium".

3. **Categories and Tags**
   - *Purpose*: Organize tasks into logical groups such as Work, Personal, Shopping, or Groceries.
   - *Who can use it*: All users.
   - *How it works*: Users can create custom text-based tags or categories and attach them to their tasks.

4. **Todo Activity History**
   - *Purpose*: Provide users with a history of important changes made to their tasks.
   - *Who can use it*: All users, for their own tasks.
   - *How it works*: The system records timestamped events whenever an important task action occurs, such as creating, updating, completing, or deleting a task.

5. **Productivity Dashboard / Statistics**
   - *Purpose*: Help users understand their productivity and task completion progress.
   - *Who can use it*: All users.
   - *How it works*: The system calculates and displays useful statistics such as total tasks, pending tasks, completed tasks, tasks completed this week, and completion percentage.

6. **Soft Delete and Trash Bin**
   - *Purpose*: Prevent accidental permanent deletion of tasks.
   - *Who can use it*: All users.
   - *How it works*: When a user deletes a task, the task is moved to a "Trash" state instead of being immediately permanently deleted. Users can restore tasks from the Trash. Tasks that remain in the Trash for 30 days can then be permanently deleted by the system.

## 5. FUNCTIONAL REQUIREMENTS
The following section translates the expected behavior into formal functional requirements.

- **FR-001: User Registration**: The system shall allow a new user to create an account by providing a valid name, email, and password. The account shall remain inactive until verified.
- **FR-002: Email Verification**: The system shall send a 6-digit OTP to the user's email upon registration and activate the account when the correct OTP is submitted.
- **FR-003: User Login**: The system shall authenticate users using their email and password, establishing a secure session.
- **FR-004: Todo Creation**: The system shall allow an authenticated user to create a task by providing a title.
- **FR-005: Todo Retrieval**: The system shall allow an authenticated user to view a list of only their own tasks.
- **FR-006: Todo Update**: The system shall allow a user to modify the title and completion status of their own tasks.
- **FR-007: Todo Deletion**: The system shall allow a user to permanently delete their own tasks.
- **FR-008: Profile Update**: The system shall allow a user to update their display name and password, requiring OTP verification and current password validation.
- **FR-009: Admin User Listing**: The system shall allow an administrator to view a list of all registered normal users.
- **FR-010: Admin User Management**: The system shall allow an administrator to disable, enable, or delete normal user accounts.
- **FR-011: Admin Todo Oversight**: The system shall allow an administrator to view, edit, and delete any task in the system regardless of ownership.

## 6. NON-FUNCTIONAL REQUIREMENTS
- **Security**: The system shall prevent cross-site scripting (XSS) by using HttpOnly cookies. It shall prevent cross-site request forgery (CSRF) by strictly validating request origins.
- **Reliability**: The system shall handle missing or invalid data gracefully, returning standardized JSON error messages rather than crashing.
- **Usability**: The API shall provide consistent, predictable responses utilizing standard HTTP status codes (200, 201, 400, 401, 403, 404).
- **Maintainability**: The application shall use standardized formatting (Prettier) and a modular folder structure to ensure code remains legible.
- **Data Integrity**: Passwords shall never be stored in plain text. User accounts and task numbers shall be strongly linked in the database to prevent orphaned records.

## 7. BUSINESS RULES AND VALIDATION
- **Todo Title Restrictions**: A task title is mandatory, cannot be empty, and must not exceed 50 characters.
- **Authentication Requirements**: All task and profile endpoints strictly require a valid, non-expired access token.
- **User Ownership**: A user may only interact with a task if their internal User ID explicitly matches the task's Owner ID.
- **Admin Permissions**: Administrative endpoints can only be executed if the authenticated user's role is explicitly set to 'admin'.
- **OTP Requirements**: One-Time Passwords are exactly 6 digits long, expire after 15 minutes, and can only be used once.
- **Password Rules**: Passwords must be a minimum of 6 characters long.
- **Protected Profile Fields**: Users cannot modify their `role`, `isActive` status, `email`, or internal `_id`.
- **Account Status Restrictions**: If an administrator sets a user's `isActive` flag to false, the user's current session is immediately invalidated, and they cannot log in.

## 8. SYSTEM WORKFLOWS

**1. User Registration & Verification**
1. User submits name, email, and password.
2. System creates an inactive account and generates an OTP.
3. System emails the OTP to the user.
4. User submits the OTP.
5. System validates the OTP and marks the account as active.

**2. Authenticated Session (Login)**
1. User submits email and password.
2. System validates credentials.
3. System creates a session family and generates Access & Refresh tokens.
4. System returns tokens to the browser as secure HttpOnly cookies.
5. User is now authenticated for subsequent requests.

**3. Create & Manage Todo**
1. Authenticated user submits a new task title.
2. System generates a sequential Todo Number for that user.
3. System saves the task and returns the data.
4. User later clicks to complete the task.
5. System updates the completion status to `true`.
6. User clicks delete.
7. System permanently removes the task from the database.

**4. Admin User Management**
1. Administrator logs into the system.
2. Administrator requests the user list.
3. System verifies admin role and returns the list.
4. Administrator clicks "Disable" on a specific user.
5. System updates the user's `isActive` flag to false and revokes their active sessions.

## 9. API / SYSTEM INTERACTION OVERVIEW
The application follows a standard modern web architecture:

**Frontend Client (React / Swagger UI)**
   ↓ *Sends HTTP Requests with Secure Cookies*
**Backend REST API (Express.js)**
   ↓ *Global Middleware intercepts requests for CORS, CSRF, and Rate Limiting checks*
**Authentication & Route Logic**
   ↓ *Validates user identity, verifies roles, and enforces business rules*
**Database Layer (MongoDB)**
   ↓ *Executes queries and returns data*

The Swagger/OpenAPI interface sits alongside the Frontend Client, acting as an interactive map for developers to understand the available endpoints, required data formats, and expected responses directly from the Backend REST API.

## 10. REQUIREMENTS TRACEABILITY

| Requirement | Description | Status |
|-------------|-------------|--------|
| FR-001 | User Registration | Implemented |
| FR-002 | Email Verification | Implemented |
| FR-003 | User Login | Implemented |
| FR-004 | Todo Creation | Implemented |
| FR-005 | Todo Retrieval | Implemented |
| FR-006 | Todo Update | Implemented |
| FR-007 | Todo Deletion | Implemented |
| FR-008 | Profile Update | Implemented |
| FR-009 | Admin User Listing | Implemented |
| FR-010 | Admin User Management | Implemented |
| FR-011 | Admin Todo Oversight | Implemented |
| PR-001 | Due Dates and Times | Proposed / Future |
| PR-002 | Priority Levels | Proposed / Future |
| PR-003 | Categories and Tags | Proposed / Future |
| PR-004 | Todo Activity History | Proposed / Future |
| PR-005 | Productivity Dashboard | Proposed / Future |
| PR-006 | Soft Delete / Trash | Proposed / Future |

## 11. ASSUMPTIONS AND CONSTRAINTS
- **Email Access**: It is assumed that users have access to a valid email address to receive OTPs for registration and recovery.
- **Client Compatibility**: The frontend client must support and allow HttpOnly cookies; token storage in localStorage is strictly prohibited by design.
- **Admin Provisioning**: The system assumes the first administrator account is created manually via the database or a secure onboarding script, as normal users cannot elevate their own privileges.
- **Future Features**: All proposed enhancements are constrained by the requirement that they must be implementable natively within the existing open-source stack without incurring costs for third-party services.

## 12. FUTURE DEVELOPMENT PRIORITIES
The proposed features have been ranked to guide future development sprints:

**High Priority**
- *Categories and Tags*: Essential for users to organize tasks as their usage grows.
- *Due Dates and Times*: Fundamental to time-management systems.

**Medium Priority**
- *Priority Levels*: Useful but secondary to categorization and dates.
- *Soft Delete and Trash Bin*: A great usability enhancement that prevents frustration from accidental deletions.

**Low Priority**
- *Todo Activity History*: Interesting for audit purposes, but not strictly necessary for core task management.
- *Productivity Dashboard / Statistics*: A 'nice-to-have' feature that improves engagement but does not add direct task-management functionality.
