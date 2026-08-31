const mongoose = require("mongoose");
const CategoryRepository = require("./repositories/CategoryRepository");
const TodoRepository = require("./repositories/TodoRepository");
const { MAX_CATEGORY_NAME_LENGTH } = require("./constants");
const { ValidationError } = require("./errors");

const categoryRepository = new CategoryRepository();
const todoRepository = new TodoRepository();

function validateCategoryName(name) {
  if (typeof name !== "string") {
    throw new ValidationError("Category name must be a string");
  }

  const trimmed = name.trim();

  if (trimmed.length === 0) {
    throw new ValidationError("Category name cannot be empty");
  }

  if (trimmed.length > MAX_CATEGORY_NAME_LENGTH) {
    throw new ValidationError(
      `Category name cannot exceed ${MAX_CATEGORY_NAME_LENGTH} characters`
    );
  }

  return trimmed;
}

function validateObjectId(id, fieldName = "ID") {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError(`Invalid ${fieldName}`);
  }
}

async function addCategory(userId, name) {
  name = validateCategoryName(name);

  const existing = await categoryRepository.findByName(userId, name);
  if (existing) {
    throw new ValidationError("Category already exists");
  }

  return await categoryRepository.create({ userId, name });
}

async function getCategories(userId) {
  return await categoryRepository.findAll(userId);
}

async function getCategory(userId, id) {
  validateObjectId(id, "Category ID");
  return await categoryRepository.findById(userId, id);
}

async function updateCategory(userId, id, name) {
  validateObjectId(id, "Category ID");
  name = validateCategoryName(name);

  const category = await categoryRepository.findById(userId, id);
  if (!category) {
    return null;
  }

  const existing = await categoryRepository.findByName(userId, name);
  if (existing && existing._id.toString() !== id.toString()) {
    throw new ValidationError("Category already exists");
  }

  return await categoryRepository.update(userId, id, name);
}

async function deleteCategory(userId, id) {
  validateObjectId(id, "Category ID");

  const category = await categoryRepository.findById(userId, id);
  if (!category) {
    return false;
  }

  const result = await categoryRepository.delete(userId, id);
  if (result.deletedCount > 0) {
    await todoRepository.removeCategoryFromTodos(userId, id);
    return true;
  }

  return false;
}

module.exports = {
  validateCategoryName,
  validateObjectId,
  addCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
};
