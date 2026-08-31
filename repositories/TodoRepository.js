const Todo = require("../models/Todo");
const Counter = require("../models/Counter");
require("../models/Category");
require("../models/Tag");

class TodoRepository {
  async create(data) {
    const todo = await Todo.create(data);
    return await Todo.findById(todo._id)
      .populate("categoryId", "name")
      .populate("tags", "name");
  }

  async _findWithSort(query, sortBy) {
    if (sortBy === "dueDate") {
      const [withDates, withoutDates] = await Promise.all([
        Todo.find({ ...query, dueDate: { $ne: null } })
          .populate("categoryId", "name")
          .populate("tags", "name")
          .sort({
            dueDate: 1,
            todoNumber: 1,
          }),
        Todo.find({ ...query, dueDate: null })
          .populate("categoryId", "name")
          .populate("tags", "name")
          .sort({ todoNumber: 1 }),
      ]);
      return [...withDates, ...withoutDates];
    } else if (sortBy === "priority") {
      const [high, medium, low] = await Promise.all([
        Todo.find({ ...query, priority: "High" })
          .populate("categoryId", "name")
          .populate("tags", "name")
          .sort({ todoNumber: 1 }),
        Todo.find({ ...query, priority: "Medium" })
          .populate("categoryId", "name")
          .populate("tags", "name")
          .sort({ todoNumber: 1 }),
        Todo.find({ ...query, priority: "Low" })
          .populate("categoryId", "name")
          .populate("tags", "name")
          .sort({ todoNumber: 1 }),
      ]);
      return [...high, ...medium, ...low];
    }
    return await Todo.find(query)
      .populate("categoryId", "name")
      .populate("tags", "name")
      .sort({ todoNumber: 1 });
  }

  async findAll(userId, sortBy, priority, categoryId, tagId) {
    const query = { userId };
    if (priority) query.priority = priority;
    if (categoryId) query.categoryId = categoryId;
    if (tagId) query.tags = tagId;
    return await this._findWithSort(query, sortBy);
  }

  async findByNumber(userId, todoNumber) {
    return await Todo.findOne({ userId, todoNumber })
      .populate("categoryId", "name")
      .populate("tags", "name");
  }

  async update(userId, todoNumber, data) {
    return await Todo.findOneAndUpdate({ userId, todoNumber }, data, {
      returnDocument: "after",
      runValidators: true,
    })
      .populate("categoryId", "name")
      .populate("tags", "name");
  }

  async delete(userId, todoNumber) {
    return await Todo.deleteOne({ userId, todoNumber });
  }

  async deleteAll(userId) {
    return await Todo.deleteMany({ userId });
  }

  async findCompleted(userId, sortBy, priority, categoryId, tagId) {
    const query = { userId, completed: true };
    if (priority) query.priority = priority;
    if (categoryId) query.categoryId = categoryId;
    if (tagId) query.tags = tagId;
    return await this._findWithSort(query, sortBy);
  }

  async findIncomplete(userId, sortBy, priority, categoryId, tagId) {
    const query = { userId, completed: false };
    if (priority) query.priority = priority;
    if (categoryId) query.categoryId = categoryId;
    if (tagId) query.tags = tagId;
    return await this._findWithSort(query, sortBy);
  }

  async deleteCompleted(userId) {
    return await Todo.deleteMany({ userId, completed: true });
  }

  async deleteIncomplete(userId) {
    return await Todo.deleteMany({ userId, completed: false });
  }

  async removeCategoryFromTodos(userId, categoryId) {
    return await Todo.updateMany(
      { userId, categoryId },
      { $set: { categoryId: null } }
    );
  }

  async removeTagFromTodos(userId, tagId) {
    return await Todo.updateMany(
      { userId, tags: tagId },
      { $pull: { tags: tagId } }
    );
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
  async findAllAdmin(sortBy, priority, categoryId, tagId) {
    const query = {};
    if (priority) query.priority = priority;
    if (categoryId) query.categoryId = categoryId;
    if (tagId) query.tags = tagId;
    return await this._findWithSort(query, sortBy);
  }
}

module.exports = TodoRepository;
