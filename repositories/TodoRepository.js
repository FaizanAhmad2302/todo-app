const Todo = require("../models/Todo");
const Counter = require("../models/Counter");

class TodoRepository {
  async create(data) {
    return await Todo.create(data);
  }

  async findAll(userId) {
    return await Todo.find({ userId }).sort({ todoNumber: 1 });
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

  async findCompleted(userId) {
    return await Todo.find({ userId, completed: true }).sort({ todoNumber: 1 });
  }

  async findIncomplete(userId) {
    return await Todo.find({ userId, completed: false }).sort({
      todoNumber: 1,
    });
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
  async findAllAdmin() {
    return await Todo.find().sort({ todoNumber: 1 });
  }
}

module.exports = TodoRepository;
