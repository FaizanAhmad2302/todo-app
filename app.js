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
    deleteIncompleteTodos
}=require("./todo")

deleteAllTodos();
const newTodoId = addTodo("Buy groceries");

const result = toggleTodo(1);
const result2 = toggleTodo(2);
const result3 = renameTodo(1, "Buy milk");
console.log(newTodoId);
console.log(result);
console.log(result2);
console.log(result3);
console.log(getTodo(1));
