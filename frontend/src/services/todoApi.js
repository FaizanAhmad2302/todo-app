const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data || {};
  }
}

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

export async function apiFetch(endpoint, options = {}, retries = 1) {
  const fetchOptions = {
    ...options,
    credentials: "include", // Important for cookies!
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  const response = await fetch(`${API_URL}${endpoint}`, fetchOptions);

  if (!response.ok) {
    if (
      response.status === 401 &&
      retries > 0 &&
      endpoint !== "/auth/login" &&
      endpoint !== "/auth/refresh"
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return apiFetch(endpoint, options, retries - 1);
        });
      }

      isRefreshing = true;

      try {
        const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });

        if (!refreshRes.ok) {
          throw new Error("Refresh failed");
        }

        isRefreshing = false;
        processQueue(null);

        // Retry original request
        return apiFetch(endpoint, options, retries - 1);
      } catch (err) {
        isRefreshing = false;
        processQueue(err);

        // Dispatch custom event to tell AuthContext to force logout
        window.dispatchEvent(new Event("auth:unauthorized"));
        throw new ApiError("Session expired", 401);
      }
    }

    let errorMessage = "An unexpected error occurred";
    let errorData = {};
    try {
      errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText;
    }
    throw new ApiError(errorMessage, response.status, errorData);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// Todo specific exports
export const getTodos = async (completed, sort, priority, category, tag) => {
  let url = "/todos";
  const params = [];
  if (completed !== undefined) params.push(`completed=${completed}`);
  if (sort) params.push(`sort=${sort}`);
  if (priority && priority !== "all") params.push(`priority=${priority}`);
  if (category && category !== "all") params.push(`category=${category}`);
  if (tag && tag !== "all") params.push(`tag=${tag}`);

  if (params.length > 0) {
    url += `?${params.join("&")}`;
  }
  return apiFetch(url);
};

export const getTodo = async (id) => {
  return apiFetch(`/todos/${id}`);
};

export const createTodo = async (
  title,
  dueDate,
  priority,
  categoryId,
  tags
) => {
  const body = { title };
  if (dueDate) body.dueDate = dueDate;
  if (priority) body.priority = priority;
  if (categoryId) body.categoryId = categoryId;
  if (tags && tags.length > 0) body.tags = tags;
  return apiFetch("/todos", {
    method: "POST",
    body: JSON.stringify(body),
  });
};

export const updateTodo = async (id, updates) => {
  return apiFetch(`/todos/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
};

export const deleteTodo = async (id) => {
  return apiFetch(`/todos/${id}`, {
    method: "DELETE",
  });
};

export const deleteCompletedTodos = async () => {
  return apiFetch("/todos?completed=true&confirm=true", {
    method: "DELETE",
  });
};

export const deleteIncompleteTodos = async () => {
  return apiFetch("/todos?completed=false&confirm=true", {
    method: "DELETE",
  });
};

export const deleteAllTodos = async () => {
  await deleteCompletedTodos();
  await deleteIncompleteTodos();
};

// Categories specific exports
export const getCategories = async () => {
  return apiFetch("/categories");
};

export const createCategory = async (name) => {
  return apiFetch("/categories", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
};

export const updateCategory = async (id, name) => {
  return apiFetch(`/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
};

export const deleteCategory = async (id) => {
  return apiFetch(`/categories/${id}`, {
    method: "DELETE",
  });
};

// Tags specific exports
export const getTags = async () => {
  return apiFetch("/tags");
};

export const createTag = async (name) => {
  return apiFetch("/tags", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
};

export const updateTag = async (id, name) => {
  return apiFetch(`/tags/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
};

export const deleteTag = async (id) => {
  return apiFetch(`/tags/${id}`, {
    method: "DELETE",
  });
};

// Admin specific exports
export const getAdminUsers = async () => {
  return apiFetch("/admin/users");
};

export const toggleAdminUser = async (id, isActive) => {
  return apiFetch(`/admin/users/${id}/disable`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
};

export const getAdminTodos = async (sort, priority, category, tag) => {
  let url = "/admin/todos";
  const params = [];
  if (sort) params.push(`sort=${sort}`);
  if (priority && priority !== "all") params.push(`priority=${priority}`);
  if (category && category !== "all") params.push(`category=${category}`);
  if (tag && tag !== "all") params.push(`tag=${tag}`);

  if (params.length > 0) {
    url += `?${params.join("&")}`;
  }
  return apiFetch(url);
};

export const adminUpdateTodo = async (id, updates) => {
  return apiFetch(`/admin/todos/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
};

export const adminDeleteTodo = async (id) => {
  return apiFetch(`/admin/todos/${id}`, {
    method: "DELETE",
  });
};

export const adminDeleteUser = async (id) => {
  return apiFetch(`/admin/users/${id}`, {
    method: "DELETE",
  });
};

// Activity History exports
export const getTodoHistory = async (todoNumber) => {
  return apiFetch(`/todos/${todoNumber}/history`);
};

export const getAdminTodoHistory = async (todoNumber) => {
  return apiFetch(`/admin/todos/${todoNumber}/history`);
};

// Trash & Soft Delete exports
export const getTrashTodos = async (sort) => {
  let url = "/todos/trash";
  if (sort) url += `?sort=${sort}`;
  return apiFetch(url);
};

export const restoreTodo = async (todoNumber) => {
  return apiFetch(`/todos/${todoNumber}/restore`, {
    method: "PATCH",
  });
};

export const permanentDeleteTodo = async (todoNumber) => {
  return apiFetch(`/todos/${todoNumber}/permanent`, {
    method: "DELETE",
  });
};

export const emptyTrash = async () => {
  return apiFetch("/todos/trash", {
    method: "DELETE",
  });
};
