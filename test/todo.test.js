require("dotenv").config();
const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");

const connectDatabase = require("../database");
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

before(async () => {
  await connectDatabase(process.env.MONGODB_TEST_URI);
});

beforeEach(async () => {
  await Todo.deleteMany({});
  await Counter.deleteMany({});
});

after(async () => {
  await Todo.deleteMany({});
  await Counter.deleteMany({});
  await mongoose.disconnect();
});

test("getTodos returns an empty list on a fresh database", async () => {
  const todos = await getTodos();

  assert.deepStrictEqual(todos, []);
});

test("addTodo creates a todo", async () => {
  const todoNumber = await addTodo("Buy milk");

  const todo = await getTodo(todoNumber);

  assert.ok(todo);
  assert.strictEqual(todo.title, "Buy milk");
  assert.strictEqual(todo.completed, false);
});

test("getTodo returns the correct todo", async () => {
  const todoNumber = await addTodo("Buy eggs");

  const todo = await getTodo(todoNumber);

  assert.ok(todo);
  assert.strictEqual(todo.todoNumber, todoNumber);
  assert.strictEqual(todo.title, "Buy eggs");
});

test("getTodo returns null for a todo that does not exist", async () => {
  const todo = await getTodo(9999);

  assert.strictEqual(todo, null);
});

test("toggleTodo changes an incomplete todo to completed", async () => {
  const todoNumber = await addTodo("Finish work");

  const changed = await toggleTodo(todoNumber);
  const todo = await getTodo(todoNumber);

  assert.strictEqual(changed, true);
  assert.strictEqual(todo.completed, true);
});

test("toggleTodo changes a completed todo back to incomplete", async () => {
  const todoNumber = await addTodo("Finish work");

  await toggleTodo(todoNumber);
  await toggleTodo(todoNumber);

  const todo = await getTodo(todoNumber);

  assert.strictEqual(todo.completed, false);
});

test("renameTodo changes the title", async () => {
  const todoNumber = await addTodo("Buy milk");

  const changed = await renameTodo(todoNumber, "Buy oat milk");
  const todo = await getTodo(todoNumber);

  assert.strictEqual(changed, true);
  assert.strictEqual(todo.title, "Buy oat milk");
});

test("renameTodo returns false for a todo that does not exist", async () => {
  const changed = await renameTodo(9999, "New title");

  assert.strictEqual(changed, false);
});

test("deleteTodo deletes the requested todo", async () => {
  const todoNumber = await addTodo("Delete me");

  const deleted = await deleteTodo(todoNumber);
  const todo = await getTodo(todoNumber);

  assert.strictEqual(deleted, true);
  assert.strictEqual(todo, null);
});

test("deleteTodo returns false for a todo that does not exist", async () => {
  const deleted = await deleteTodo(9999);

  assert.strictEqual(deleted, false);
});

test("deleteAllTodos deletes all todos", async () => {
  await addTodo("Todo 1");
  await addTodo("Todo 2");
  await addTodo("Todo 3");

  const deletedCount = await deleteAllTodos();
  const todos = await getTodos();

  assert.strictEqual(deletedCount, 3);
  assert.deepStrictEqual(todos, []);
});

test("getCompletedTodos returns only completed todos", async () => {
  const todo1 = await addTodo("Completed todo");
  await addTodo("Incomplete todo");

  await toggleTodo(todo1);

  const todos = await getCompletedTodos();

  assert.strictEqual(todos.length, 1);
  assert.strictEqual(todos[0].title, "Completed todo");
  assert.strictEqual(todos[0].completed, true);
});

test("getIncompleteTodos returns only incomplete todos", async () => {
  const todo1 = await addTodo("Completed todo");
  await addTodo("Incomplete todo");

  await toggleTodo(todo1);

  const todos = await getIncompleteTodos();

  assert.strictEqual(todos.length, 1);
  assert.strictEqual(todos[0].title, "Incomplete todo");
  assert.strictEqual(todos[0].completed, false);
});

test("deleteCompletedTodos deletes only completed todos", async () => {
  const completedTodo = await addTodo("Completed todo");
  await addTodo("Incomplete todo");

  await toggleTodo(completedTodo);

  const deletedCount = await deleteCompletedTodos();
  const remainingTodos = await getTodos();

  assert.strictEqual(deletedCount, 1);
  assert.strictEqual(remainingTodos.length, 1);
  assert.strictEqual(remainingTodos[0].title, "Incomplete todo");
});

test("deleteIncompleteTodos deletes only incomplete todos", async () => {
  const completedTodo = await addTodo("Completed todo");
  await addTodo("Incomplete todo");

  await toggleTodo(completedTodo);

  const deletedCount = await deleteIncompleteTodos();
  const remainingTodos = await getTodos();

  assert.strictEqual(deletedCount, 1);
  assert.strictEqual(remainingTodos.length, 1);
  assert.strictEqual(remainingTodos[0].title, "Completed todo");
});
