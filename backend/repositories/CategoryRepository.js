const Category = require("../models/Category");

class CategoryRepository {
  async create(data) {
    return await Category.create(data);
  }

  async findAll(userId) {
    return await Category.find({ userId }).sort({ name: 1 });
  }

  async findById(userId, id) {
    return await Category.findOne({ _id: id, userId });
  }

  async findByName(userId, name) {
    // Case-insensitive lookup
    return await Category.findOne({
      userId,
      name: {
        $regex: new RegExp(
          `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          "i"
        ),
      },
    });
  }

  async update(userId, id, name) {
    return await Category.findOneAndUpdate(
      { _id: id, userId },
      { name },
      { returnDocument: "after", runValidators: true }
    );
  }

  async delete(userId, id) {
    return await Category.deleteOne({ _id: id, userId });
  }
}

module.exports = CategoryRepository;
