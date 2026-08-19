const Todo = require("../models/Todo");

class TodoRepository {
    async create(data) {
        return await Todo.create(data);
    }
    async findAll() {
        return await Todo.find().sort({ todoNumber: 1 });
    }
    async findByNumber(todoNumber) {
        return await Todo.findOne({ todoNumber });
    }
    async update(todoNumber, data) {
        return await Todo.findOneAndUpdate(
            { todoNumber },
            data,
            { new: true }
        );
    }

    async delete(todoNumber) {
        return await Todo.deleteOne({ todoNumber });
    }

    async deleteAll() {
        return await Todo.deleteMany({});
    }

    async findCompleted() {
        return await Todo.find({ completed: true }).sort({ todoNumber: 1 });
    }

    async findIncomplete() {
        return await Todo.find({ completed: false }).sort({ todoNumber: 1 });
    }

    async deleteCompleted() {
        return await Todo.deleteMany({ completed: true });
    }

    async deleteIncomplete() {
        return await Todo.deleteMany({ completed: false });
    }

    async findLastNumber() {
    return await Todo.findOne()
        .sort({ todoNumber: -1 })
        .select("todoNumber");
    }
}

module.exports = TodoRepository;