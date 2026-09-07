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
    }

    if (sortBy === "priority") {
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
    const query = {
      userId,
      isDeleted: false,
    };

    if (priority) query.priority = priority;
    if (categoryId) query.categoryId = categoryId;
    if (tagId) query.tags = tagId;

    return await this._findWithSort(query, sortBy);
  }

  async findByNumber(userId, todoNumber) {
    return await Todo.findOne({
      userId,
      todoNumber,
      isDeleted: false,
    })
      .populate("categoryId", "name")
      .populate("tags", "name");
  }

  async update(userId, todoNumber, data) {
    return await Todo.findOneAndUpdate(
      {
        userId,
        todoNumber,
        isDeleted: false,
      },
      data,
      {
        returnDocument: "after",
        runValidators: true,
      }
    )
      .populate("categoryId", "name")
      .populate("tags", "name");
  }

  // Soft delete a single todo
  async delete(userId, todoNumber) {
    const result = await Todo.updateOne(
      {
        userId,
        todoNumber,
        isDeleted: false,
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      }
    );

    return {
      acknowledged: result.acknowledged,
      deletedCount: result.modifiedCount,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
    };
  }

  // Soft delete all todos belonging to a user
  async deleteAll(userId) {
    const result = await Todo.updateMany(
      {
        userId,
        isDeleted: false,
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      }
    );

    return {
      acknowledged: result.acknowledged,
      deletedCount: result.modifiedCount,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
    };
  }

  async findCompleted(userId, sortBy, priority, categoryId, tagId) {
    const query = {
      userId,
      completed: true,
      isDeleted: false,
    };

    if (priority) query.priority = priority;
    if (categoryId) query.categoryId = categoryId;
    if (tagId) query.tags = tagId;

    return await this._findWithSort(query, sortBy);
  }

  async findIncomplete(userId, sortBy, priority, categoryId, tagId) {
    const query = {
      userId,
      completed: false,
      isDeleted: false,
    };

    if (priority) query.priority = priority;
    if (categoryId) query.categoryId = categoryId;
    if (tagId) query.tags = tagId;

    return await this._findWithSort(query, sortBy);
  }

  // Soft delete all completed todos
  async deleteCompleted(userId) {
    const result = await Todo.updateMany(
      {
        userId,
        completed: true,
        isDeleted: false,
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      }
    );

    return {
      acknowledged: result.acknowledged,
      deletedCount: result.modifiedCount,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
    };
  }

  // Soft delete all incomplete todos
  async deleteIncomplete(userId) {
    const result = await Todo.updateMany(
      {
        userId,
        completed: false,
        isDeleted: false,
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      }
    );

    return {
      acknowledged: result.acknowledged,
      deletedCount: result.modifiedCount,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
    };
  }

  async removeCategoryFromTodos(userId, categoryId) {
    return await Todo.updateMany(
      {
        userId,
        categoryId,
      },
      {
        $set: {
          categoryId: null,
        },
      }
    );
  }

  async removeTagFromTodos(userId, tagId) {
    return await Todo.updateMany(
      {
        userId,
        tags: tagId,
      },
      {
        $pull: {
          tags: tagId,
        },
      }
    );
  }

  // Get deleted todos belonging to a specific user
  async findDeleted(userId, sortBy) {
    const query = {
      userId,
      isDeleted: true,
    };

    return await this._findWithSort(query, sortBy);
  }

  // Restore a soft-deleted todo
  async restore(userId, todoNumber) {
    return await Todo.findOneAndUpdate(
      {
        userId,
        todoNumber,
        isDeleted: true,
      },
      {
        $set: {
          isDeleted: false,
          deletedAt: null,
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      }
    )
      .populate("categoryId", "name")
      .populate("tags", "name");
  }

  // Permanently delete a single todo from the database
  async permanentDelete(userId, todoNumber) {
    return await Todo.findOneAndDelete({
      userId,
      todoNumber,
      isDeleted: true,
    });
  }

  // Permanently delete all deleted todos belonging to a user
  async permanentDeleteAll(userId) {
    return await Todo.deleteMany({
      userId,
      isDeleted: true,
    });
  }

  async getNextNumber() {
    const counter = await Counter.findOneAndUpdate(
      { _id: "todoNumber" },
      { $inc: { seq: 1 } },
      {
        returnDocument: "after",
        upsert: true,
      }
    );

    return counter.seq;
  }

  // Admin Methods
  async findAllAdmin(sortBy, priority, categoryId, tagId) {
    const query = {
      isDeleted: false,
    };

    if (priority) query.priority = priority;
    if (categoryId) query.categoryId = categoryId;
    if (tagId) query.tags = tagId;

    return await this._findWithSort(query, sortBy);
  }
}

module.exports = TodoRepository;
