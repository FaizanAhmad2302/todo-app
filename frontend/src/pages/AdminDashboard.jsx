import { useState, useEffect } from 'react';
import { getAdminUsers, toggleAdminUser, getAdminTodos } from '../services/todoApi';
import { Toast } from '../components/Toast';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [todos, setTodos] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, todosData] = await Promise.all([
        getAdminUsers(),
        getAdminTodos()
      ]);
      setUsers(usersData);
      setTodos(todosData);
    } catch (err) {
      setError('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (userId, currentStatus) => {
    try {
      await toggleAdminUser(userId, !currentStatus);
      setUsers(users.map(u => u._id === userId ? { ...u, isActive: !currentStatus } : u));
    } catch (err) {
      setError('Failed to update user status');
    }
  };

  if (loading) return <div className="layout-container"><p style={{margin: '100px auto'}}>Loading dashboard...</p></div>;

  return (
    <div className="layout-container">
      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
      
      <div className="main-content">
        <div className="app-header" style={{ marginBottom: '24px' }}>
          <h1>Admin Dashboard</h1>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button 
            className={`filter-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users ({users.length})
          </button>
          <button 
            className={`filter-btn ${activeTab === 'todos' ? 'active' : ''}`}
            onClick={() => setActiveTab('todos')}
          >
            Global Todos ({todos.length})
          </button>
        </div>

        {activeTab === 'users' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {users.map(user => (
              <div key={user._id} className="todo-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0 }}>{user.name} <span style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>({user.role})</span></h3>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{user.email}</p>
                </div>
                <div>
                  <button 
                    onClick={() => handleToggleActive(user._id, user.isActive)}
                    className="danger-btn"
                    style={{ 
                      backgroundColor: user.isActive ? 'var(--danger)' : 'var(--accent)',
                      border: 'none',
                      color: 'white',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {user.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'todos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {todos.map(todo => {
              const owner = users.find(u => u._id === todo.userId)?.name || 'Unknown User';
              return (
                <div key={todo._id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
                  <div className="todo-content">
                    <span className="todo-title">{todo.title}</span>
                    <span className="todo-timestamp">Owner: {owner} | ID: {todo.todoNumber}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
