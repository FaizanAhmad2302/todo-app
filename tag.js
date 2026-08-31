const mongoose = require("mongoose");
const TagRepository = require("./repositories/TagRepository");
const TodoRepository = require("./repositories/TodoRepository");
const { MAX_TAG_NAME_LENGTH } = require("./constants");
const { ValidationError } = require("./errors");

const tagRepository = new TagRepository();
const todoRepository = new TodoRepository();

function validateTagName(name) {
  if (typeof name !== "string") {
    throw new ValidationError("Tag name must be a string");
  }

  const trimmed = name.trim();

  if (trimmed.length === 0) {
    throw new ValidationError("Tag name cannot be empty");
  }

  if (trimmed.length > MAX_TAG_NAME_LENGTH) {
    throw new ValidationError(
      `Tag name cannot exceed ${MAX_TAG_NAME_LENGTH} characters`
    );
  }

  return trimmed;
}

function validateObjectId(id, fieldName = "ID") {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError(`Invalid ${fieldName}`);
  }
}

async function addTag(userId, name) {
  name = validateTagName(name);

  const existing = await tagRepository.findByName(userId, name);
  if (existing) {
    throw new ValidationError("Tag already exists");
  }

  return await tagRepository.create({ userId, name });
}

async function getTags(userId) {
  return await tagRepository.findAll(userId);
}

async function getTag(userId, id) {
  validateObjectId(id, "Tag ID");
  return await tagRepository.findById(userId, id);
}

async function updateTag(userId, id, name) {
  validateObjectId(id, "Tag ID");
  name = validateTagName(name);

  const tag = await tagRepository.findById(userId, id);
  if (!tag) {
    return null;
  }

  const existing = await tagRepository.findByName(userId, name);
  if (existing && existing._id.toString() !== id.toString()) {
    throw new ValidationError("Tag already exists");
  }

  return await tagRepository.update(userId, id, name);
}

async function deleteTag(userId, id) {
  validateObjectId(id, "Tag ID");

  const tag = await tagRepository.findById(userId, id);
  if (!tag) {
    return false;
  }

  const result = await tagRepository.delete(userId, id);
  if (result.deletedCount > 0) {
    await todoRepository.removeTagFromTodos(userId, id);
    return true;
  }

  return false;
}

module.exports = {
  validateTagName,
  validateObjectId,
  addTag,
  getTags,
  getTag,
  updateTag,
  deleteTag,
};
