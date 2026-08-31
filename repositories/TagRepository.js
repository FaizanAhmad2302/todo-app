const Tag = require("../models/Tag");

class TagRepository {
  async create(data) {
    return await Tag.create(data);
  }

  async findAll(userId) {
    return await Tag.find({ userId }).sort({ name: 1 });
  }

  async findById(userId, id) {
    return await Tag.findOne({ _id: id, userId });
  }

  async findByIds(userId, ids) {
    return await Tag.find({ _id: { $in: ids }, userId });
  }

  async findByName(userId, name) {
    // Case-insensitive lookup
    return await Tag.findOne({
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
    return await Tag.findOneAndUpdate(
      { _id: id, userId },
      { name },
      { returnDocument: "after", runValidators: true }
    );
  }

  async delete(userId, id) {
    return await Tag.deleteOne({ _id: id, userId });
  }
}

module.exports = TagRepository;
