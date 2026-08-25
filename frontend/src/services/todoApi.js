const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function fetchApi(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorMessage = 'An unexpected error occurred';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText;
    }
    throw new ApiError(errorMessage, response.status);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const getTodos = async (completed) => {
  let url = '/todos';
  if (completed !== undefined) {
    url += `?completed=${completed}`;
  }
  return fetchApi(url);
};

export const getTodo = async (id) => {
  return fetchApi(`/todos/${id}`);
};

export const createTodo = async (title) => {
  return fetchApi('/todos', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
};

export const updateTodo = async (id, updates) => {
  return fetchApi(`/todos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
};

export const deleteTodo = async (id) => {
  return fetchApi(`/todos/${id}`, {
    method: 'DELETE',
  });
};

export const deleteCompletedTodos = async () => {
  return fetchApi('/todos?completed=true&confirm=true', {
    method: 'DELETE',
  });
};

export const deleteIncompleteTodos = async () => {
  return fetchApi('/todos?completed=false&confirm=true', {
    method: 'DELETE',
  });
};
