const db=require("./database")

function addTodo(title){
    const statement=db.prepare(`INSERT INTO todos (title) 
    VALUES (?)`);
    statement.run(title)
}

function getTodos(){
    const statement=db.prepare(`SELECT * FROM todos`);
    return statement.all();
}

function getTodo(id){
    const statement=db.prepare(`SELECT * FROM todos WHERE id = ?`);
    return statement.get(id);
}

function updateTodo(id){
    const statement=db.prepare(`UPDATE todos SET completed = 1 WHERE id = ?`);
    statement.run(id);
}

function editTodo(id,title){
    const statement=db.prepare(`UPDATE todos SET title = ? WHERE id = ?`);
    statement.run(title,id);
}

function deleteTodo(id){
    const statement=db.prepare(`DELETE FROM todos WHERE id = ?`);
    statement.run(id);
}

function deleteAllTodos(){
    const statement=db.prepare(`DELETE FROM todos`);
    statement.run();
}

function getCompletedTodos(){
    const statement=db.prepare(`SELECT * FROM todos WHERE completed = 1`);
    return statement.all();
}

function getIncompleteTodos(){
    const statement=db.prepare(`Select *from todos WHERE completed = 0`);
    return statement.all();
}

function deleteCompletedTodos(){
    const statement=db.prepare(`DELETE FROM todos WHERE completed = 1`);
    statement.run();

}

function deleteIncompleteTodos(){
    const statement=db.prepare(`DELETE FROM todos WHERE completed = 0`);
    statement.run();
}
module.exports={addTodo, getTodos, getTodo, updateTodo, editTodo, deleteTodo, deleteAllTodos, getCompletedTodos, getIncompleteTodos, deleteCompletedTodos, deleteIncompleteTodos};