const {
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
}=require("./todo")

addTodo("Task 1");
addTodo("Task 2");
addTodo("Task 3");
addTodo("Task 4");
editTodo(1,"Task 1 updated");
updateTodo(2);
console.log(getTodo(1));
console.log(getTodos());

