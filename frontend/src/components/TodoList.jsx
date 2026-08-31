import React from "react";
import { TodoItem } from "./TodoItem";

export function TodoList({
  todos,
  categories = [],
  tags = [],
  onToggle,
  onUpdate,
  onDelete,
  onHistory,
  emptyMessage,
}) {
  if (todos.length === 0) {
    return (
      <div className="empty-state">
        <p>{emptyMessage || "No tasks found."}</p>
      </div>
    );
  }

  return (
    <ul className="todo-list">
      {todos.map((todo) => (
        <TodoItem
          key={todo.todoNumber}
          todo={todo}
          categories={categories}
          tags={tags}
          onToggle={onToggle}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onHistory={onHistory}
        />
      ))}
    </ul>
  );
}
