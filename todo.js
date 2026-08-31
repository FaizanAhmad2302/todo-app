const mongoose = require("mongoose");
const TodoRepository = require("./repositories/TodoRepository");
const Category = require("./models/Category");
const Tag = require("./models/Tag");
const { MAX_TITLE_LENGTH, MAX_TAGS_PER_TODO } = require("./constants");
const { ValidationError } = require("./errors");

const repository = new TodoRepository();

function validateTitle(title) {
  if (typeof title !== "string") {
    throw new ValidationError("Title must be a string");
  }

  const trimmedTitle = title.trim();

  if (trimmedTitle.length === 0) {
    throw new ValidationError("Title cannot be empty");
  }

  if (trimmedTitle.length > MAX_TITLE_LENGTH) {
    throw new ValidationError(
      `Title cannot be more than ${MAX_TITLE_LENGTH} characters`
    );
  }

  return trimmedTitle;
}

function validateTodoNumber(todoNumber) {
  if (!Number.isInteger(todoNumber) || todoNumber < 1) {
    throw new ValidationError("Todo number must be a positive integer");
  }
}

function validateDueDate(dateString, isNew = false) {
  if (dateString === undefined) return undefined;
  if (dateString === null) return null;

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new ValidationError("Invalid due date");
  }

  if (isNew && date < new Date()) {
    throw new ValidationError("Due date cannot be in the past");
  }

  return date;
}

function validatePriority(priority) {
  if (priority === undefined) return "Medium";
  if (!["Low", "Medium", "High"].includes(priority)) {
    throw new ValidationError("Priority must be Low, Medium, or High");
  }
  return priority;
}

async function validateCategoryAssignment(userId, categoryId) {
  if (categoryId === undefined) return undefined;
  if (categoryId === null || categoryId === "") return null;

  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new ValidationError("Invalid category ID");
  }

  const category = await Category.findOne({ _id: categoryId, userId });
  if (!category) {
    throw new ValidationError(
      "Category not found or does not belong to the user"
    );
  }

  return category._id;
}

async function validateTagsAssignment(userId, tags) {
  if (tags === undefined) return undefined;
  if (tags === null) return [];

  if (!Array.isArray(tags)) {
    throw new ValidationError("Tags must be an array of tag IDs");
  }

  if (tags.length === 0) return [];

  // Deduplicate tag IDs
  const stringIds = tags.map((t) =>
    typeof t === "object" && t._id ? String(t._id) : String(t)
  );
  const uniqueIds = [...new Set(stringIds)];

  if (uniqueIds.length > MAX_TAGS_PER_TODO) {
    throw new ValidationError(
      `Cannot assign more than ${MAX_TAGS_PER_TODO} tags to a task`
    );
  }

  for (const tagId of uniqueIds) {
    if (!mongoose.Types.ObjectId.isValid(tagId)) {
      throw new ValidationError(`Invalid tag ID: ${tagId}`);
    }
  }

  const foundTags = await Tag.find({ _id: { $in: uniqueIds }, userId });
  if (foundTags.length !== uniqueIds.length) {
    throw new ValidationError(
      "One or more tags not found or do not belong to the user"
    );
  }

  return foundTags.map((t) => t._id);
}

async function addTodo(userId, title, dueDate, priority, categoryId, tags) {
  title = validateTitle(title);
  const validatedDueDate = validateDueDate(dueDate, true);
  const validatedCategory = await validateCategoryAssignment(
    userId,
    categoryId
  );
  const validatedTags = await validateTagsAssignment(userId, tags);

  const todoNumber = await repository.getNextNumber();

  const data = {
    userId,
    todoNumber,
    title,
  };

  if (validatedDueDate) {
    data.dueDate = validatedDueDate;
  }
  data.priority = validatePriority(priority);

  if (validatedCategory !== undefined) {
    data.categoryId = validatedCategory;
  }

  if (validatedTags !== undefined) {
    data.tags = validatedTags;
  }

  const todo = await repository.create(data);

  return todo.todoNumber;
}

async function getTodos(userId, sortBy, priority, categoryId, tagId) {
  return await repository.findAll(userId, sortBy, priority, categoryId, tagId);
}

async function getTodo(userId, todoNumber) {
  validateTodoNumber(todoNumber);

  return await repository.findByNumber(userId, todoNumber);
}

async function toggleTodo(userId, todoNumber) {
  validateTodoNumber(todoNumber);

  const todo = await repository.findByNumber(userId, todoNumber);

  if (!todo) {
    return false;
  }

  const updatedTodo = await repository.update(userId, todoNumber, {
    completed: !todo.completed,
  });

  return updatedTodo !== null;
}

async function renameTodo(userId, todoNumber, title) {
  validateTodoNumber(todoNumber);
  title = validateTitle(title);

  const updatedTodo = await repository.update(userId, todoNumber, {
    title,
  });

  return updatedTodo !== null;
}

async function updateTodo(
  userId,
  todoNumber,
  { title, completed, dueDate, priority, categoryId, tags }
) {
  validateTodoNumber(todoNumber);
  const update = {};
  if (title !== undefined) update.title = validateTitle(title);
  if (completed !== undefined) update.completed = completed;
  if (priority !== undefined) update.priority = validatePriority(priority);
  if (dueDate !== undefined) {
    const validatedDueDate = validateDueDate(dueDate, false);
    if (validatedDueDate === null) {
      update.$unset = { ...update.$unset, dueDate: 1 };
    } else {
      update.dueDate = validatedDueDate;
    }
  }

  if (categoryId !== undefined) {
    const validatedCategory = await validateCategoryAssignment(
      userId,
      categoryId
    );
    update.categoryId = validatedCategory;
  }

  if (tags !== undefined) {
    const validatedTags = await validateTagsAssignment(userId, tags);
    update.tags = validatedTags;
  }

  return await repository.update(userId, todoNumber, update);
}

async function deleteTodo(userId, todoNumber) {
  validateTodoNumber(todoNumber);

  const result = await repository.delete(userId, todoNumber);

  return result.deletedCount > 0;
}

async function deleteAllTodos(userId) {
  const result = await repository.deleteAll(userId);

  return result.deletedCount;
}

async function getCompletedTodos(userId, sortBy, priority, categoryId, tagId) {
  return await repository.findCompleted(
    userId,
    sortBy,
    priority,
    categoryId,
    tagId
  );
}

async function getIncompleteTodos(userId, sortBy, priority, categoryId, tagId) {
  return await repository.findIncomplete(
    userId,
    sortBy,
    priority,
    categoryId,
    tagId
  );
}

async function deleteCompletedTodos(userId) {
  const result = await repository.deleteCompleted(userId);

  return result.deletedCount;
}

async function deleteIncompleteTodos(userId) {
  const result = await repository.deleteIncomplete(userId);

  return result.deletedCount;
}

// Admin Methods
async function getAllTodosAdmin(sortBy, priority, categoryId, tagId) {
  return await repository.findAllAdmin(sortBy, priority, categoryId, tagId);
}

module.exports = {
  addTodo,
  getTodos,
  getTodo,
  toggleTodo,
  updateTodo,
  renameTodo,
  deleteTodo,
  deleteAllTodos,
  getCompletedTodos,
  getIncompleteTodos,
  deleteCompletedTodos,
  deleteIncompleteTodos,
  getAllTodosAdmin,
  validateDueDate,
  validatePriority,
  validateCategoryAssignment,
  validateTagsAssignment,
};
