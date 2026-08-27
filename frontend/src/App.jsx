import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';

import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import TodoDashboard from './pages/TodoDashboard';
import AdminDashboard from './pages/AdminDashboard';
import './index.css';

function App() {
  const { currentUser } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={currentUser ? <Navigate to="/" /> : <Login />} />
      <Route path="/signup" element={currentUser ? <Navigate to="/" /> : <Signup />} />
      <Route path="/forgot-password" element={currentUser ? <Navigate to="/" /> : <ForgotPassword />} />
      <Route path="/reset-password" element={currentUser ? <Navigate to="/" /> : <ResetPassword />} />
      
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<TodoDashboard />} />
      </Route>

      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>
    </Routes>
  );
}

export default App;
