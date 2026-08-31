const mongoose = require("mongoose");
const TodoRepository = require("./repositories/TodoRepository");
const Category = require("./models/Category");
const Tag = require("./models/Tag");
const { recordActivity } = require("./services/TodoActivityService");
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

  await recordActivity({
    userId,
    todoNumber: todo.todoNumber,
    action: "CREATED",
    changes: {
      title: todo.title,
      priority: todo.priority,
      dueDate: todo.dueDate || null,
      categoryId: todo.categoryId || null,
      tags: todo.tags || [],
    },
    performedBy: userId,
  });

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

  const newCompletedStatus = !todo.completed;

  const updatedTodo = await repository.update(userId, todoNumber, {
    completed: newCompletedStatus,
  });

  if (!updatedTodo) {
    return false;
  }

  await recordActivity({
    userId,
    todoNumber,
    action: newCompletedStatus ? "COMPLETED" : "UNCOMPLETED",
    changes: {
      completed: {
        from: todo.completed,
        to: newCompletedStatus,
      },
    },
    performedBy: userId,
  });

  return true;
}

async function renameTodo(userId, todoNumber, title) {
  validateTodoNumber(todoNumber);
  title = validateTitle(title);

  const todo = await repository.findByNumber(userId, todoNumber);

  if (!todo) {
    return false;
  }

  const oldTitle = todo.title;

  const updatedTodo = await repository.update(userId, todoNumber, {
    title,
  });

  if (!updatedTodo) {
    return false;
  }

  await recordActivity({
    userId,
    todoNumber,
    action: "UPDATED",
    changes: {
      title: {
        from: oldTitle,
        to: updatedTodo.title,
      },
    },
    performedBy: userId,
  });

  return true;
}

async function updateTodo(
  userId,
  todoNumber,
  { title, completed, dueDate, priority, categoryId, tags }
) {
  validateTodoNumber(todoNumber);

  const todo = await repository.findByNumber(userId, todoNumber);

  if (!todo) {
    return null;
  }

  const update = {};
  const changes = {};

  if (title !== undefined) {
    const newTitle = validateTitle(title);
    update.title = newTitle;

    if (todo.title !== newTitle) {
      changes.title = {
        from: todo.title,
        to: newTitle,
      };
    }
  }

  if (completed !== undefined) {
    update.completed = completed;

    if (todo.completed !== completed) {
      changes.completed = {
        from: todo.completed,
        to: completed,
      };
    }
  }

  if (priority !== undefined) {
    const newPriority = validatePriority(priority);
    update.priority = newPriority;

    if (todo.priority !== newPriority) {
      changes.priority = {
        from: todo.priority,
        to: newPriority,
      };
    }
  }

  if (dueDate !== undefined) {
    const validatedDueDate = validateDueDate(dueDate, false);

    if (validatedDueDate === null) {
      update.$unset = { ...update.$unset, dueDate: 1 };

      if (todo.dueDate) {
        changes.dueDate = {
          from: todo.dueDate,
          to: null,
        };
      }
    } else {
      update.dueDate = validatedDueDate;

      const oldDueDate = todo.dueDate ? new Date(todo.dueDate).getTime() : null;
      const newDueDate = validatedDueDate.getTime();

      if (oldDueDate !== newDueDate) {
        changes.dueDate = {
          from: todo.dueDate || null,
          to: validatedDueDate,
        };
      }
    }
  }

  if (categoryId !== undefined) {
    const validatedCategory = await validateCategoryAssignment(
      userId,
      categoryId
    );

    update.categoryId = validatedCategory;

    const oldCategoryId = todo.categoryId
      ? String(todo.categoryId._id || todo.categoryId)
      : null;

    const newCategoryId = validatedCategory ? String(validatedCategory) : null;

    if (oldCategoryId !== newCategoryId) {
      changes.categoryId = {
        from: oldCategoryId,
        to: newCategoryId,
      };
    }
  }

  if (tags !== undefined) {
    const validatedTags = await validateTagsAssignment(userId, tags);

    update.tags = validatedTags;

    const oldTags = (todo.tags || []).map((tag) => String(tag._id || tag));

    const newTags = validatedTags.map((tag) => String(tag));

    const oldTagsSorted = [...oldTags].sort();
    const newTagsSorted = [...newTags].sort();

    if (JSON.stringify(oldTagsSorted) !== JSON.stringify(newTagsSorted)) {
      changes.tags = {
        from: oldTags,
        to: newTags,
      };
    }
  }

  if (Object.keys(changes).length === 0) {
    return todo;
  }

  const updatedTodo = await repository.update(userId, todoNumber, update);

  if (!updatedTodo) {
    return null;
  }

  await recordActivity({
    userId,
    todoNumber,
    action: "UPDATED",
    changes,
    performedBy: userId,
  });

  return updatedTodo;
}

async function deleteTodo(userId, todoNumber) {
  validateTodoNumber(todoNumber);

  const todo = await repository.findByNumber(userId, todoNumber);

  if (!todo) {
    return false;
  }

  const result = await repository.delete(userId, todoNumber);

  if (result.deletedCount === 0) {
    return false;
  }

  await recordActivity({
    userId,
    todoNumber,
    action: "DELETED",
    changes: {
      title: todo.title,
      completed: todo.completed,
      priority: todo.priority,
      dueDate: todo.dueDate || null,
      categoryId: todo.categoryId || null,
      tags: todo.tags || [],
    },
    performedBy: userId,
  });

  return true;
}

async function deleteAllTodos(userId) {
  const todos = await repository.findAll(userId);

  if (todos.length === 0) {
    return 0;
  }

  const result = await repository.deleteAll(userId);

  if (result.deletedCount === 0) {
    return 0;
  }

  for (const todo of todos) {
    await recordActivity({
      userId,
      todoNumber: todo.todoNumber,
      action: "DELETED",
      changes: {
        title: todo.title,
        completed: todo.completed,
        priority: todo.priority,
        dueDate: todo.dueDate || null,
        categoryId: todo.categoryId || null,
        tags: todo.tags || [],
      },
      performedBy: userId,
    });
  }

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
  const todos = await repository.findCompleted(userId);

  if (todos.length === 0) {
    return 0;
  }

  const result = await repository.deleteCompleted(userId);

  if (result.deletedCount === 0) {
    return 0;
  }

  for (const todo of todos) {
    await recordActivity({
      userId,
      todoNumber: todo.todoNumber,
      action: "DELETED",
      changes: {
        title: todo.title,
        completed: todo.completed,
        priority: todo.priority,
        dueDate: todo.dueDate || null,
        categoryId: todo.categoryId || null,
        tags: todo.tags || [],
      },
      performedBy: userId,
    });
  }

  return result.deletedCount;
}

async function deleteIncompleteTodos(userId) {
  const todos = await repository.findIncomplete(userId);

  if (todos.length === 0) {
    return 0;
  }

  const result = await repository.deleteIncomplete(userId);

  if (result.deletedCount === 0) {
    return 0;
  }

  for (const todo of todos) {
    await recordActivity({
      userId,
      todoNumber: todo.todoNumber,
      action: "DELETED",
      changes: {
        title: todo.title,
        completed: todo.completed,
        priority: todo.priority,
        dueDate: todo.dueDate || null,
        categoryId: todo.categoryId || null,
        tags: todo.tags || [],
      },
      performedBy: userId,
    });
  }

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
