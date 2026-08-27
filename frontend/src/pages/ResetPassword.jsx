import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { apiFetch } from "../services/todoApi";
import { Toast } from "../components/Toast";

export default function ResetPassword() {
  const location = useLocation();
  const email = location.state?.email || "";

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError(
        "Missing email address. Please start from the Forgot Password page."
      );
      return;
    }

    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit reset code");
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    try {
      setLoading(true);
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, otp, newPassword }),
      });
      setSuccess("Password reset successfully! Redirecting to login...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <p>No email provided. Please start over.</p>
          <button
            onClick={() => navigate("/forgot-password")}
            className="auth-btn"
            style={{ marginTop: "1rem" }}
          >
            Go to Forgot Password
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      {error && (
        <Toast message={error} type="error" onClose={() => setError("")} />
      )}
      {success && (
        <Toast
          message={success}
          type="success"
          onClose={() => setSuccess("")}
        />
      )}
      <div className="auth-card">
        <div className="auth-header">
          <h1>Reset Password</h1>
          <p>Enter the 6-digit code sent to {email}</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div>
            <input
              type="text"
              placeholder="6-digit Code"
              className="auth-input"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              disabled={loading || success}
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="New Password (min 8 characters)"
              className="auth-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading || success}
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Confirm New Password"
              className="auth-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading || success}
              required
            />
          </div>
          <button
            type="submit"
            className="auth-btn"
            disabled={loading || success || otp.length !== 6}
          >
            {loading ? "Resetting..." : "Reset Password"}
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
