const TodoActivityRepository = require("../repositories/TodoActivityRepository");

const repository = new TodoActivityRepository();

async function recordActivity({
  userId,
  todoNumber,
  action,
  changes = null,
  performedBy,
}) {
  return await repository.create({
    userId,
    todoNumber,
    action,
    changes,
    performedBy,
  });
}

async function getTodoHistory(userId, todoNumber) {
  return await repository.findByTodo(userId, todoNumber);
}

module.exports = {
  recordActivity,
  getTodoHistory,
};
