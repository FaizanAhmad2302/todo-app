require("dotenv").config();
const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");

const setupDb = require("./setupDb");
const Todo = require("../models/Todo");
const Counter = require("../models/Counter");

const {
  addTodo,
  getTodos,
  getTodo,
  toggleTodo,
  renameTodo,
  deleteTodo,
  deleteAllTodos,
  getCompletedTodos,
  getIncompleteTodos,
  deleteCompletedTodos,
  deleteIncompleteTodos,
} = require("../todo");

let mockUserId;

before(async () => {
  await setupDb.connect();
});

beforeEach(async () => {
  await Todo.deleteMany({});
  await Counter.deleteMany({});
  mockUserId = new mongoose.Types.ObjectId();
});

after(async () => {
  await Todo.deleteMany({});
  await Counter.deleteMany({});
  await setupDb.disconnect();
});

test("getTodos returns an empty list on a fresh database", async () => {
  const todos = await getTodos(mockUserId);

  assert.deepStrictEqual(todos, []);
});

test("addTodo creates a todo", async () => {
  const todoNumber = await addTodo(mockUserId, "Buy milk");

  const todo = await getTodo(mockUserId, todoNumber);

  assert.ok(todo);
  assert.strictEqual(todo.title, "Buy milk");
  assert.strictEqual(todo.completed, false);
});

test("getTodo returns the correct todo", async () => {
  const todoNumber = await addTodo(mockUserId, "Buy eggs");

  const todo = await getTodo(mockUserId, todoNumber);

  assert.ok(todo);
  assert.strictEqual(todo.todoNumber, todoNumber);
  assert.strictEqual(todo.title, "Buy eggs");
});

test("getTodo returns null for a todo that does not exist", async () => {
  const todo = await getTodo(mockUserId, 9999);

  assert.strictEqual(todo, null);
});

test("toggleTodo changes an incomplete todo to completed", async () => {
  const todoNumber = await addTodo(mockUserId, "Finish work");

  const changed = await toggleTodo(mockUserId, todoNumber);
  const todo = await getTodo(mockUserId, todoNumber);

  assert.strictEqual(changed, true);
  assert.strictEqual(todo.completed, true);
});

test("toggleTodo changes a completed todo back to incomplete", async () => {
  const todoNumber = await addTodo(mockUserId, "Finish work");

  await toggleTodo(mockUserId, todoNumber);
  await toggleTodo(mockUserId, todoNumber);

  const todo = await getTodo(mockUserId, todoNumber);

  assert.strictEqual(todo.completed, false);
});

test("renameTodo changes the title", async () => {
  const todoNumber = await addTodo(mockUserId, "Buy milk");

  const changed = await renameTodo(mockUserId, todoNumber, "Buy oat milk");
  const todo = await getTodo(mockUserId, todoNumber);

  assert.strictEqual(changed, true);
  assert.strictEqual(todo.title, "Buy oat milk");
});

test("renameTodo returns false for a todo that does not exist", async () => {
  const changed = await renameTodo(mockUserId, 9999, "New title");

  assert.strictEqual(changed, false);
});

test("deleteTodo deletes the requested todo", async () => {
  const todoNumber = await addTodo(mockUserId, "Delete me");

  const deleted = await deleteTodo(mockUserId, todoNumber);
  const todo = await getTodo(mockUserId, todoNumber);

  assert.strictEqual(deleted, true);
  assert.strictEqual(todo, null);
});

test("deleteTodo returns false for a todo that does not exist", async () => {
  const deleted = await deleteTodo(mockUserId, 9999);

  assert.strictEqual(deleted, false);
});

test("deleteAllTodos deletes all todos", async () => {
  await addTodo(mockUserId, "Todo 1");
  await addTodo(mockUserId, "Todo 2");
  await addTodo(mockUserId, "Todo 3");

  const deletedCount = await deleteAllTodos(mockUserId);
  const todos = await getTodos(mockUserId);

  assert.strictEqual(deletedCount, 3);
  assert.deepStrictEqual(todos, []);
});

test("getCompletedTodos returns only completed todos", async () => {
  const todo1 = await addTodo(mockUserId, "Completed todo");
  await addTodo(mockUserId, "Incomplete todo");

  await toggleTodo(mockUserId, todo1);

  const todos = await getCompletedTodos(mockUserId);

  assert.strictEqual(todos.length, 1);
  assert.strictEqual(todos[0].title, "Completed todo");
  assert.strictEqual(todos[0].completed, true);
});

test("getIncompleteTodos returns only incomplete todos", async () => {
  const todo1 = await addTodo(mockUserId, "Completed todo");
  await addTodo(mockUserId, "Incomplete todo");

  await toggleTodo(mockUserId, todo1);

  const todos = await getIncompleteTodos(mockUserId);

  assert.strictEqual(todos.length, 1);
  assert.strictEqual(todos[0].title, "Incomplete todo");
  assert.strictEqual(todos[0].completed, false);
});

test("deleteCompletedTodos deletes only completed todos", async () => {
  const completedTodo = await addTodo(mockUserId, "Completed todo");
  await addTodo(mockUserId, "Incomplete todo");

  await toggleTodo(mockUserId, completedTodo);

  const deletedCount = await deleteCompletedTodos(mockUserId);
  const remainingTodos = await getTodos(mockUserId);

  assert.strictEqual(deletedCount, 1);
  assert.strictEqual(remainingTodos.length, 1);
  assert.strictEqual(remainingTodos[0].title, "Incomplete todo");
});

test("deleteIncompleteTodos deletes only incomplete todos", async () => {
  const completedTodo = await addTodo(mockUserId, "Completed todo");
  await addTodo(mockUserId, "Incomplete todo");

  await toggleTodo(mockUserId, completedTodo);

  const deletedCount = await deleteIncompleteTodos(mockUserId);
  const remainingTodos = await getTodos(mockUserId);

  assert.strictEqual(deletedCount, 1);
  assert.strictEqual(remainingTodos.length, 1);
  assert.strictEqual(remainingTodos[0].title, "Completed todo");
});
