import React from "react";
import { TodoItem } from "./TodoItem";

export function TodoList({
  todos,
  categories = [],
  tags = [],
  isTrash = false,
  onToggle,
  onUpdate,
  onDelete,
  onHistory,
  onRestore,
  onPermanentDelete,
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
          isTrash={isTrash}
          onToggle={onToggle}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onHistory={onHistory}
          onRestore={onRestore}
          onPermanentDelete={onPermanentDelete}
        />
      ))}
    </ul>
  );
}
