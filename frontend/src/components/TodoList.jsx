import React from 'react';
import { TodoItem } from './TodoItem';

export function TodoList({ todos, onToggle, onUpdate, onDelete, emptyMessage }) {
  if (todos.length === 0) {
    return (
      <div className="empty-state">
        <p>{emptyMessage || "No tasks found."}</p>
      </div>
    );
  }

  return (
    <ul className="todo-list">
      {todos.map(todo => (
        <TodoItem 
          key={todo.todoNumber} 
          todo={todo} 
          onToggle={onToggle}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
