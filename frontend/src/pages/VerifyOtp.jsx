import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Toast } from '../components/Toast';
import { apiFetch } from '../services/todoApi';

export default function VerifyOtp() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  const { verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Email passed from Signup or Login redirect
  const email = location.state?.email || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    try {
      setLoading(true);
      await verifyOtp(email, otp);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setError('');
      setLoading(true);
      // We can resend OTP by hitting signup with the same credentials
      // Or simply let them know it was sent initially.
      // Since our new Signup flow sends OTP if user is unverified:
      // A proper implementation would have a dedicated /resend-otp endpoint
      // For now, let's just hint them
      setMessage("Please check your email/console for the OTP.");
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <p>No email provided. Please sign up again.</p>
          <button onClick={() => navigate('/signup')} className="auth-btn" style={{ marginTop: '1rem' }}>
            Go to Signup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
      {message && <Toast message={message} type="success" onClose={() => setMessage('')} />}
      <div className="auth-card">
        <div className="auth-header">
          <h1>Verify Email</h1>
          <p>Enter the 6-digit code sent to {email}</p>
        </div>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <div>
            <input
              type="text"
              placeholder="6-digit OTP"
              className="auth-input"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              disabled={loading}
              required
            />
          </div>
          <button type="submit" className="auth-btn" disabled={loading || otp.length !== 6}>
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>

        <div className="auth-footer">
          <p><button type="button" onClick={handleResend} className="auth-link" style={{background:'none', border:'none', padding:0, cursor:'pointer'}}>Resend Code</button></p>
        </div>
      </div>
    </div>
  );
}
