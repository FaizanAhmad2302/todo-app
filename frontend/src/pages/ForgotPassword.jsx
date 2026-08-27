import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../services/todoApi";
import { Toast } from "../components/Toast";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    try {
      setLoading(true);
      const res = await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMessage(res.message);
      if (res.requiresOtp) {
        setTimeout(
          () => navigate("/reset-password", { state: { email } }),
          1500
        );
      }
    } catch (err) {
      setError(err.message || "Failed to request password reset");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {error && (
        <Toast message={error} type="error" onClose={() => setError("")} />
      )}
      {message && (
        <Toast
          message={message}
          type="success"
          onClose={() => setMessage("")}
        />
      )}
      <div className="auth-card">
        <div className="auth-header">
          <h1>Recover Password</h1>
          <p>We'll send you a link to reset your password</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div>
            <input
              type="email"
              placeholder="Email address"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            <Link to="/login" className="auth-link">
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
