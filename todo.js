const TodoRepository = require("./repositories/TodoRepository");
const { MAX_TITLE_LENGTH } = require("./constants");
const { ValidationError } = require("./errors");

const repository = new TodoRepository();

function validateTitle(title) {
  if (typeof title !== "string") {
    throw new ValidationError("Title must be a string");
  }

  const trimmedTitle = title.trim();

  if (trimmedTitle.length === 0) {
    throw new ValidationError("Title cannot be empty");
  }

  if (trimmedTitle.length > MAX_TITLE_LENGTH) {
    throw new ValidationError(
      `Title cannot be more than ${MAX_TITLE_LENGTH} characters`
    );
  }

  return trimmedTitle;
}

function validateTodoNumber(todoNumber) {
  if (!Number.isInteger(todoNumber) || todoNumber < 1) {
    throw new ValidationError("Todo number must be a positive integer");
  }
}

function validateDueDate(dateString, isNew = false) {
  if (dateString === undefined) return undefined;
  if (dateString === null) return null;

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new ValidationError("Invalid due date");
  }

  if (isNew && date < new Date()) {
    throw new ValidationError("Due date cannot be in the past");
  }

  return date;
}

function validatePriority(priority) {
  if (priority === undefined) return "Medium";
  if (!["Low", "Medium", "High"].includes(priority)) {
    throw new ValidationError("Priority must be Low, Medium, or High");
  }
  return priority;
}

async function addTodo(userId, title, dueDate, priority) {
  title = validateTitle(title);
  const validatedDueDate = validateDueDate(dueDate, true);

  const todoNumber = await repository.getNextNumber();

  const data = {
    userId,
    todoNumber,
    title,
  };

  if (validatedDueDate) {
    data.dueDate = validatedDueDate;
  }
  data.priority = validatePriority(priority);

  const todo = await repository.create(data);

  return todo.todoNumber;
}

async function getTodos(userId, sortBy, priority) {
  return await repository.findAll(userId, sortBy, priority);
}

async function getTodo(userId, todoNumber) {
  validateTodoNumber(todoNumber);

  return await repository.findByNumber(userId, todoNumber);
}

async function toggleTodo(userId, todoNumber) {
  validateTodoNumber(todoNumber);

  const todo = await repository.findByNumber(userId, todoNumber);

  if (!todo) {
    return false;
  }

  const updatedTodo = await repository.update(userId, todoNumber, {
    completed: !todo.completed,
  });

  return updatedTodo !== null;
}

async function renameTodo(userId, todoNumber, title) {
  validateTodoNumber(todoNumber);
  title = validateTitle(title);

  const updatedTodo = await repository.update(userId, todoNumber, {
    title,
  });

  return updatedTodo !== null;
}

async function updateTodo(
  userId,
  todoNumber,
  { title, completed, dueDate, priority }
) {
  validateTodoNumber(todoNumber);
  const update = {};
  if (title !== undefined) update.title = validateTitle(title);
  if (completed !== undefined) update.completed = completed;
  if (priority !== undefined) update.priority = validatePriority(priority);
  if (dueDate !== undefined) {
    const validatedDueDate = validateDueDate(dueDate, false);
    if (validatedDueDate === null) {
      update.$unset = { dueDate: 1 };
    } else {
      update.dueDate = validatedDueDate;
    }
  }

  return await repository.update(userId, todoNumber, update);
}

async function deleteTodo(userId, todoNumber) {
  validateTodoNumber(todoNumber);

  const result = await repository.delete(userId, todoNumber);

  return result.deletedCount > 0;
}

async function deleteAllTodos(userId) {
  const result = await repository.deleteAll(userId);

  return result.deletedCount;
}

async function getCompletedTodos(userId, sortBy, priority) {
  return await repository.findCompleted(userId, sortBy, priority);
}

async function getIncompleteTodos(userId, sortBy, priority) {
  return await repository.findIncomplete(userId, sortBy, priority);
}

async function deleteCompletedTodos(userId) {
  const result = await repository.deleteCompleted(userId);

  return result.deletedCount;
}

async function deleteIncompleteTodos(userId) {
  const result = await repository.deleteIncomplete(userId);

  return result.deletedCount;
}

// Admin Methods
async function getAllTodosAdmin(sortBy, priority) {
  return await repository.findAllAdmin(sortBy, priority);
}

module.exports = {
  addTodo,
  getTodos,
  getTodo,
  toggleTodo,
  updateTodo,
  renameTodo,
  deleteTodo,
  deleteAllTodos,
  getCompletedTodos,
  getIncompleteTodos,
  deleteCompletedTodos,
  deleteIncompleteTodos,
  getAllTodosAdmin,
  validateDueDate,
  validatePriority,
};
