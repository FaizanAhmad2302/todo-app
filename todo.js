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

async function addTodo(userId, title) {
  title = validateTitle(title);

  const todoNumber = await repository.getNextNumber();

  const todo = await repository.create({
    userId,
    todoNumber,
    title,
  });

  return todo.todoNumber;
}

async function getTodos(userId) {
  return await repository.findAll(userId);
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

async function updateTodo(userId, todoNumber, { title, completed }) {
  validateTodoNumber(todoNumber);
  const update = {};
  if (title !== undefined) update.title = validateTitle(title);
  if (completed !== undefined) update.completed = completed;

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

async function getCompletedTodos(userId) {
  return await repository.findCompleted(userId);
}

async function getIncompleteTodos(userId) {
  return await repository.findIncomplete(userId);
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
async function getAllTodosAdmin() {
  return await repository.findAllAdmin();
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
};
