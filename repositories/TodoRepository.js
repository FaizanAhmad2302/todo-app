const Todo = require("../models/Todo");
const Counter = require("../models/Counter");

class TodoRepository {
  async create(data) {
    return await Todo.create(data);
  }

  async _findWithSort(query, sortBy) {
    if (sortBy === "dueDate") {
      const [withDates, withoutDates] = await Promise.all([
        Todo.find({ ...query, dueDate: { $ne: null } }).sort({
          dueDate: 1,
          todoNumber: 1,
        }),
        Todo.find({ ...query, dueDate: null }).sort({ todoNumber: 1 }),
      ]);
      return [...withDates, ...withoutDates];
    } else if (sortBy === "priority") {
      const [high, medium, low] = await Promise.all([
        Todo.find({ ...query, priority: "High" }).sort({ todoNumber: 1 }),
        Todo.find({ ...query, priority: "Medium" }).sort({ todoNumber: 1 }),
        Todo.find({ ...query, priority: "Low" }).sort({ todoNumber: 1 }),
      ]);
      return [...high, ...medium, ...low];
    }
    return await Todo.find(query).sort({ todoNumber: 1 });
  }

  async findAll(userId, sortBy, priority) {
    const query = { userId };
    if (priority) query.priority = priority;
    return await this._findWithSort(query, sortBy);
  }

  async findByNumber(userId, todoNumber) {
    return await Todo.findOne({ userId, todoNumber });
  }

  async update(userId, todoNumber, data) {
    return await Todo.findOneAndUpdate({ userId, todoNumber }, data, {
      returnDocument: "after",
      runValidators: true,
    });
  }

  async delete(userId, todoNumber) {
    return await Todo.deleteOne({ userId, todoNumber });
  }

  async deleteAll(userId) {
    return await Todo.deleteMany({ userId });
  }

  async findCompleted(userId, sortBy, priority) {
    const query = { userId, completed: true };
    if (priority) query.priority = priority;
    return await this._findWithSort(query, sortBy);
  }

  async findIncomplete(userId, sortBy, priority) {
    const query = { userId, completed: false };
    if (priority) query.priority = priority;
    return await this._findWithSort(query, sortBy);
  }

  async deleteCompleted(userId) {
    return await Todo.deleteMany({ userId, completed: true });
  }

  async deleteIncomplete(userId) {
    return await Todo.deleteMany({ userId, completed: false });
  }

  async getNextNumber() {
    const counter = await Counter.findOneAndUpdate(
      { _id: "todoNumber" },
      { $inc: { seq: 1 } },
      { returnDocument: "after", upsert: true }
    );

    return counter.seq;
  }

  // Admin Methods
  async findAllAdmin(sortBy, priority) {
    const query = {};
    if (priority) query.priority = priority;
    return await this._findWithSort(query, sortBy);
  }
}

module.exports = TodoRepository;
