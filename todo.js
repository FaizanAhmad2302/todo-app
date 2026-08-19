const Todo = require("./models/Todo");

function validateTitle(title) {
    if (typeof title !== "string") {
        throw new Error("Title must be a string");
    }
    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) {
        throw new Error("Title cannot be empty");
    }

    if (trimmedTitle.length > 50) {
        throw new Error("Title cannot be more than 50 characters");
    }
    return trimmedTitle;
}

function validateTodoNumber(todoNumber) {
    if (!Number.isInteger(todoNumber) || todoNumber < 1) {
        throw new Error("Todo number must be a positive integer");
    }
}

async function getNextTodoNumber() {
    const lastTodo = await Todo.findOne()
        .sort({ todoNumber: -1 })
        .select("todoNumber");
    return lastTodo ? lastTodo.todoNumber + 1 : 1;
}

async function addTodo(title) {
    title = validateTitle(title);
    const todoNumber = await getNextTodoNumber();
    const todo = await Todo.create({
        todoNumber,
        title
    });
    return todo.todoNumber;
}

async function getTodos() {
    return await Todo.find().sort({ todoNumber: 1 });
}

async function getTodo(todoNumber) {
    validateTodoNumber(todoNumber);
    return await Todo.findOne({ todoNumber });
}

async function toggleTodo(todoNumber) {
    validateTodoNumber(todoNumber);
    const todo = await Todo.findOne({ todoNumber });
    if (!todo) {
        return false;
    }

    todo.completed = !todo.completed;
    await todo.save();
    return true;
}

async function renameTodo(todoNumber, title) {
    validateTodoNumber(todoNumber);
    title = validateTitle(title);
    const todo = await Todo.findOne({ todoNumber });
    if (!todo) {
        return false;
    }
    todo.title = title;
    await todo.save();
    return true;
}

async function deleteTodo(todoNumber) {
    validateTodoNumber(todoNumber);
    const result = await Todo.deleteOne({ todoNumber });
    return result.deletedCount > 0;
}

async function deleteAllTodos() {
    const result = await Todo.deleteMany({});
    return result.deletedCount;
}

async function getCompletedTodos() {
    return await Todo.find({ completed: true }).sort({ todoNumber: 1 });
}

async function getIncompleteTodos() {
    return await Todo.find({ completed: false }).sort({ todoNumber: 1 });
}

async function deleteCompletedTodos() {
    const result = await Todo.deleteMany({ completed: true });
    return result.deletedCount;
}

async function deleteIncompleteTodos() {
    const result = await Todo.deleteMany({ completed: false });
    return result.deletedCount;
}

module.exports = {
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
    deleteIncompleteTodos
};