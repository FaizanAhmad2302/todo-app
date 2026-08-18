const db = require("./database");

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

function validateId(id) {
    if (!Number.isInteger(id)) {
        throw new Error("ID must be an integer");
    }
}

function addTodo(title) {
    title = validateTitle(title);

    const statement = db.prepare(`INSERT INTO todos (title) 
    VALUES (?)`);
    statement.run(title);
}

function getTodos() {
    const statement = db.prepare(`SELECT * FROM todos`);
    return statement.all();
}

function getTodo(id) {
    validateId(id);

    const statement = db.prepare(`SELECT * FROM todos WHERE id = ?`);
    return statement.get(id);
}

function updateTodo(id) {
    validateId(id);

    const statement = db.prepare(`UPDATE todos SET completed = 1 WHERE id = ?`);
    statement.run(id);
}

function editTodo(id, title) {
    validateId(id);
    title = validateTitle(title);

    const statement = db.prepare(`UPDATE todos SET title = ? WHERE id = ?`);
    statement.run(title, id);
}

function deleteTodo(id) {
    validateId(id);

    const statement = db.prepare(`DELETE FROM todos WHERE id = ?`);
    statement.run(id);
}

function deleteAllTodos() {
    const statement = db.prepare(`DELETE FROM todos`);
    statement.run();
}

function getCompletedTodos() {
    const statement = db.prepare(`SELECT * FROM todos WHERE completed = 1`);
    return statement.all();
}

function getIncompleteTodos() {
    const statement = db.prepare(`SELECT * FROM todos WHERE completed = 0`);
    return statement.all();
}

function deleteCompletedTodos() {
    const statement = db.prepare(`DELETE FROM todos WHERE completed = 1`);
    statement.run();
}

function deleteIncompleteTodos() {
    const statement = db.prepare(`DELETE FROM todos WHERE completed = 0`);
    statement.run();
}

module.exports = {
    addTodo,
    getTodos,
    getTodo,
    updateTodo,
    editTodo,
    deleteTodo,
    deleteAllTodos,
    getCompletedTodos,
    getIncompleteTodos,
    deleteCompletedTodos,
    deleteIncompleteTodos
};