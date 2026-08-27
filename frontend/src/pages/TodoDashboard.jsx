import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  getTodos, 
  createTodo, 
  updateTodo, 
  deleteTodo, 
  deleteCompletedTodos,
  deleteIncompleteTodos
} from '../services/todoApi';

import { TodoForm } from '../components/TodoForm';
import { TodoList } from '../components/TodoList';
import { Loading } from '../components/Loading';
import { Toast } from '../components/Toast';
import { Link } from 'react-router-dom';

export default function TodoDashboard() {
  const { currentUser, logout } = useAuth();
  
  const [todos, setTodos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'completed'
  const [searchQuery, setSearchQuery] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
  };

  const loadTodos = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      let completedParam = undefined;
      if (filter === 'active') completedParam = false;
      if (filter === 'completed') completedParam = true;
      
      const data = await getTodos(completedParam);
      setTodos(data);
    } catch (err) {
      setError(err.message || 'Failed to load tasks');
      showToast(err.message || 'Failed to load tasks', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  const handleAddTodo = async (title, onSuccess) => {
    const isDuplicate = todos.some(t => t.title.toLowerCase() === title.toLowerCase());
    
    if (isDuplicate) {
      const confirm = window.confirm('This task already exists. Are you sure you want to duplicate it?');
      if (!confirm) {
        return; // Abort and leave the input as-is for the user to edit
      }
    }

    try {
      setIsAdding(true);
      await createTodo(title);
      showToast('Task added successfully!');
      if (onSuccess) onSuccess();
      // Only reload if we are on 'all' or 'active', otherwise the new task wouldn't show up in 'completed' anyway
      if (filter !== 'completed') {
        await loadTodos();
      }
    } catch (err) {
      showToast(err.message || 'Failed to add task', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleTodo = async (todo) => {
    try {
      const updated = await updateTodo(todo.todoNumber, { completed: !todo.completed });
      if (filter === 'all') {
         setTodos(prev => prev.map(t => t.todoNumber === updated.todoNumber ? updated : t));
      } else {
         setTodos(prev => prev.filter(t => t.todoNumber !== updated.todoNumber));
      }
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  const handleUpdateTodo = async (id, updates) => {
    try {
      const updated = await updateTodo(id, updates);
      setTodos(prev => prev.map(t => t.todoNumber === updated.todoNumber ? updated : t));
      showToast('Task updated');
    } catch (err) {
      showToast(err.message || 'Failed to update task', 'error');
    }
  };

  const handleDeleteTodo = async (id) => {
    try {
      await deleteTodo(id);
      setTodos(prev => prev.filter(t => t.todoNumber !== id));
      showToast('Task deleted');
    } catch (err) {
      showToast(err.message || 'Failed to delete task', 'error');
    }
  };

  const handleClearCompleted = async () => {
    if (!window.confirm('Are you sure you want to clear all completed tasks?')) return;
    try {
      await deleteCompletedTodos();
      showToast('Completed tasks deleted');
      await loadTodos();
    } catch (err) {
      showToast(err.message || 'Failed to clear completed tasks', 'error');
    }
  };

  const handleClearActive = async () => {
    if (!window.confirm('Are you sure you want to clear all active tasks?')) return;
    try {
      await deleteIncompleteTodos();
      showToast('Active tasks deleted');
      await loadTodos();
    } catch (err) {
      showToast(err.message || 'Failed to clear active tasks', 'error');
    }
  };

  let displayedTodos = todos;
  if (searchQuery.trim() !== '') {
    displayedTodos = displayedTodos.filter(t => 
      t.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  const getPageTitle = () => {
    if (filter === 'active') return 'Active Tasks';
    if (filter === 'completed') return 'Completed Tasks';
    return 'All Tasks';
  };

  const getEmptyMessage = () => {
    if (filter === 'active') return "No active tasks right now. You're all caught up!";
    if (filter === 'completed') return "No completed tasks yet. Time to get to work!";
    return "Your list is empty. Add a task to get started.";
  };

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand" style={{ marginBottom: '8px' }}>Task Manager</div>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
          Logged in as <strong>{currentUser?.name}</strong>
        </div>
        
        <div className="nav-section">
          <span className="nav-heading">Views</span>
          <button 
            className={`nav-link ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Tasks
          </button>
          <button 
            className={`nav-link ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Active
          </button>
          <button 
            className={`nav-link ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
        </div>

        <div className="nav-section">
          <span className="nav-heading">Bulk Actions</span>
          <button 
            className="nav-link danger-link"
            onClick={handleClearCompleted}
          >
            Clear Completed
          </button>
          <button 
            className="nav-link danger-link"
            onClick={handleClearActive}
          >
            Clear Active
          </button>
        </div>

        <div className="nav-section" style={{ marginTop: 'auto' }}>
          <span className="nav-heading">Account</span>
          {currentUser?.role === 'admin' && (
            <Link to="/admin" className="nav-link" style={{ marginBottom: '8px' }}>
              Admin Dashboard
            </Link>
          )}
          <button 
            className="nav-link danger-link"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <div className="content-wrapper">
          <div className="header-row">
            <h1 className="main-title">{getPageTitle()}</h1>
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search tasks..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Search tasks"
            />
          </div>

          <TodoForm onSubmit={handleAddTodo} isSubmitting={isAdding} />
          
          {error && !isLoading && (
            <div className="empty-state" style={{ color: 'var(--accent)' }}>
              <p>Error: {error}</p>
              <button className="btn-primary" style={{ marginTop: '16px' }} onClick={() => loadTodos()}>
                Try Again
              </button>
            </div>
          )}

          {isLoading ? (
            <Loading />
          ) : (
            !error && (
              <TodoList 
                todos={displayedTodos}
                onToggle={handleToggleTodo}
                onUpdate={handleUpdateTodo}
                onDelete={handleDeleteTodo}
                emptyMessage={getEmptyMessage()}
              />
            )
          )}
        </div>
      </main>
      
      <Toast 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast({ message: '', type: 'success' })} 
      />
    </div>
  );
}
