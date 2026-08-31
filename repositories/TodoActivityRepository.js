const TodoActivity = require("../models/TodoActivity");

class TodoActivityRepository {
  async create(data) {
    return await TodoActivity.create(data);
  }

  async findByTodo(userId, todoNumber) {
    const query = { todoNumber };
    if (userId) {
      query.userId = userId;
    }
    return await TodoActivity.find(query)
      .populate("performedBy", "name email role")
      .sort({ createdAt: -1 });
  }
}

module.exports = TodoActivityRepository;
