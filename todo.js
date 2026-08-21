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
    throw new ValidationError(`Title cannot be more than ${MAX_TITLE_LENGTH} characters`);
  }

  return trimmedTitle;
}

function validateTodoNumber(todoNumber) {
  if (!Number.isInteger(todoNumber) || todoNumber < 1) {
    throw new ValidationError("Todo number must be a positive integer");
  }
}

async function addTodo(title) {
  title = validateTitle(title);

  const todoNumber = await repository.getNextNumber();

  const todo = await repository.create({
    todoNumber,
    title,
  });

  return todo.todoNumber;
}

async function getTodos() {
  return await repository.findAll();
}

async function getTodo(todoNumber) {
  validateTodoNumber(todoNumber);

  return await repository.findByNumber(todoNumber);
}

async function toggleTodo(todoNumber) {
  validateTodoNumber(todoNumber);

  const todo = await repository.findByNumber(todoNumber);

  if (!todo) {
    return false;
  }

  const updatedTodo = await repository.update(todoNumber, {
    completed: !todo.completed,
  });

  return updatedTodo !== null;
}

async function renameTodo(todoNumber, title) {
  validateTodoNumber(todoNumber);
  title = validateTitle(title);

  const updatedTodo = await repository.update(todoNumber, {
    title,
  });

  return updatedTodo !== null;
}

async function updateTodo(todoNumber, { title, completed }) {
  validateTodoNumber(todoNumber);
  const update = {};
  if (title !== undefined) update.title = validateTitle(title);
  if (completed !== undefined) update.completed = completed;

  return await repository.update(todoNumber, update);
}

async function deleteTodo(todoNumber) {
  validateTodoNumber(todoNumber);

  const result = await repository.delete(todoNumber);

  return result.deletedCount > 0;
}

async function deleteAllTodos() {
  const result = await repository.deleteAll();

  return result.deletedCount;
}

async function getCompletedTodos() {
  return await repository.findCompleted();
}

async function getIncompleteTodos() {
  return await repository.findIncomplete();
}

async function deleteCompletedTodos() {
  const result = await repository.deleteCompleted();

  return result.deletedCount;
}

async function deleteIncompleteTodos() {
  const result = await repository.deleteIncomplete();

  return result.deletedCount;
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
};
