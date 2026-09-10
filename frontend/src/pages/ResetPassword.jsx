import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resetUserPassword } from '../api/auth.api';

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const token = searchParams.get('token');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      setError('Reset token is missing. Please use the link from your email.');
      return;
    }

    try {
      const response = await resetUserPassword({ token, password });
      setMessage(response.data.message || 'Password reset successfully.');
      setError('');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to reset your password.');
      setMessage('');
    }
  };

  return (
    <div className="auth-page">
      <header className="auth-header">
        <a href="/" className="brand">
          <span className="brand-mark"><i /> <b /></span>
          <span>CarPooling</span>
        </a>
      </header>
      <main className="auth-main">
        <div className="auth-form-wrap" style={{ maxWidth: 440 }}>
          <p className="auth-kicker">NEW PASSWORD</p>
          <h1>Set a new password</h1>
          <p className="auth-intro">Choose a secure password for your account.</p>
          <form onSubmit={handleSubmit} className="auth-form">
            <input
              autoFocus
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="New password"
              required
            />
            <button className="auth-submit" type="submit">Update password</button>
            {message && <p className="auth-success" role="status">{message}</p>}
            {error && <p className="auth-error" role="alert">{error}</p>}
          </form>
        </div>
      </main>
    </div>
  );
}

export default ResetPassword;
