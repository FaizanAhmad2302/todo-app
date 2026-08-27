import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/todoApi';
import { useNavigate, Link } from 'react-router-dom';
import { Toast } from '../components/Toast';
import './Profile.css';

export default function Profile() {
  const { currentUser, logout, reloadUser, forceLogout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(currentUser?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
  };

  const handleRequestUpdate = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (newPassword && newPassword.length < 8) {
      return setError('New password must be at least 8 characters.');
    }
    if (newPassword !== confirmPassword) {
      return setError('New passwords do not match.');
    }
    if (newPassword && !currentPassword) {
      return setError('Current password is required to change password.');
    }
    if (name.trim() === currentUser.name && !newPassword) {
      return setError('No changes made.');
    }

    try {
      setIsSubmitting(true);
      await apiFetch('/profile/request-update', {
        method: 'POST',
        body: JSON.stringify({ name, currentPassword, newPassword }),
      });
      setOtpStep(true);
      showToast('Verification code sent to your email.');
    } catch (err) {
      setError(err.message || 'Failed to request update.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyUpdate = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!otp || otp.length !== 6) {
      return setError('Please enter a valid 6-digit code.');
    }

    try {
      setIsSubmitting(true);
      const res = await apiFetch('/profile/verify-update', {
        method: 'PUT',
        body: JSON.stringify({ otp, name, newPassword }),
      });

      if (res.passwordChanged) {
        forceLogout();
        navigate('/login', { state: { message: res.message }});
      } else {
        await reloadUser();
        setOtpStep(false);
        setOtp('');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showToast('Profile updated successfully!');
      }
    } catch (err) {
      setError(err.message || 'Invalid verification code.');
    } finally {
      setIsSubmitting(false);
    }
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
          <Link to={currentUser?.role === 'admin' ? '/admin' : '/'} className="nav-link">
            {currentUser?.role === 'admin' ? 'Admin Dashboard' : 'Dashboard'}
          </Link>
        </div>

        <div className="nav-section" style={{ marginTop: 'auto' }}>
          <span className="nav-heading">Account</span>
          <Link to="/profile" className="nav-link active">Profile Settings</Link>
          <button className="nav-link danger-link" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="content-wrapper">
          <div className="header-row">
            <h1 className="main-title">Profile Settings</h1>
          </div>

          <div className="profile-container">
            {!otpStep ? (
              <form className="profile-form" onSubmit={handleRequestUpdate}>
                {error && <div className="error-banner">{error}</div>}
                
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" value={currentUser?.email} disabled className="disabled-input" />
                  <small className="help-text">Email address cannot be changed.</small>
                </div>

                <div className="form-group">
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    required 
                  />
                </div>

                <hr className="divider" />
                <h3>Change Password</h3>
                <p className="help-text">Leave blank if you do not want to change your password.</p>

                <div className="form-group">
                  <label>Current Password</label>
                  <input 
                    type="password" 
                    value={currentPassword} 
                    onChange={e => setCurrentPassword(e.target.value)} 
                    placeholder="Enter current password"
                  />
                </div>

                <div className="form-group">
                  <label>New Password</label>
                  <input 
                    type="password" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    placeholder="Enter new password"
                  />
                </div>

                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    placeholder="Confirm new password"
                  />
                </div>

                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Processing...' : 'Save Changes'}
                </button>
              </form>
            ) : (
              <form className="profile-form otp-form fade-in" onSubmit={handleVerifyUpdate}>
                <h2>Verify Profile Update</h2>
                <p>We've sent a 6-digit verification code to <strong>{currentUser?.email}</strong>. Please enter it below to confirm your changes.</p>
                
                {error && <div className="error-banner">{error}</div>}

                <div className="form-group">
                  <label>Verification Code (OTP)</label>
                  <input 
                    type="text" 
                    maxLength="6"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    required
                    style={{ fontSize: '1.5rem', letterSpacing: '8px', textAlign: 'center' }}
                  />
                </div>

                <div className="button-group">
                  <button type="button" className="btn-secondary" onClick={() => setOtpStep(false)} disabled={isSubmitting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={isSubmitting || otp.length !== 6}>
                    {isSubmitting ? 'Verifying...' : 'Confirm Update'}
                  </button>
                </div>
              </form>
            )}
          </div>
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
