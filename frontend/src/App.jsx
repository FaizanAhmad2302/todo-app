import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import {
  ProtectedRoute,
  AdminRoute,
  AuthenticatedRoute,
} from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import VerifyOtp from "./pages/VerifyOtp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import TodoDashboard from "./pages/TodoDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import "./index.css";

function App() {
  const { currentUser } = useAuth();

  const redirectPath = currentUser?.role === "admin" ? "/admin" : "/";

  return (
    <Routes>
      <Route
        path="/login"
        element={currentUser ? <Navigate to={redirectPath} /> : <Login />}
      />
      <Route
        path="/signup"
        element={currentUser ? <Navigate to={redirectPath} /> : <Signup />}
      />
      <Route
        path="/verify-otp"
        element={currentUser ? <Navigate to={redirectPath} /> : <VerifyOtp />}
      />
      <Route
        path="/forgot-password"
        element={
          currentUser ? <Navigate to={redirectPath} /> : <ForgotPassword />
        }
      />
      <Route
        path="/reset-password"
        element={
          currentUser ? <Navigate to={redirectPath} /> : <ResetPassword />
        }
      />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<TodoDashboard />} />
      </Route>

      <Route element={<AuthenticatedRoute />}>
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>
    </Routes>
  );
}

export default App;
