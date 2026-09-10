import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { requestPasswordReset } from '../api/auth.api'

function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [resetLink, setResetLink] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      setError('Please enter your registered email address.')
      setMessage('')
      setResetLink('')
      return
    }

    try {
      setLoading(true)
      setError('')
      const response = await requestPasswordReset({ email: trimmedEmail })
      const nextResetLink = response?.data?.resetLink || ''
      setResetLink(nextResetLink)
      setMessage(response.data.message || 'Check your inbox for the reset link.')
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to send reset email.')
      setMessage('')
      setResetLink('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="forgot-password-page">
      <header className="forgot-header">
        <a href="/" className="brand" aria-label="CarPooling home">
          <span className="brand-mark"><i /><b /></span>
          <span>CarPooling</span>
        </a>

        <div className="forgot-header-actions">
          <button type="button" className="offer-ride-button" onClick={() => navigate('/login')}>
            Offer a ride
          </button>
          <button type="button" className="profile-pill" aria-label="Profile">
            <span className="profile-circle">◉</span>
          </button>
        </div>
      </header>

      <main className="forgot-main">
        <h1>What's your email? Check your inbox for a link to create a new password.</h1>

        <form className="forgot-form" onSubmit={handleSubmit}>
          <div className="forgot-input-wrap">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
              aria-label="Email address"
              autoFocus
            />
            {email && (
              <button type="button" className="clear-input" onClick={() => setEmail('')} aria-label="Clear email">
                ×
              </button>
            )}
          </div>

          <button type="submit" className="send-link-button" disabled={loading}>
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        {message && (
          <div className="auth-success forgot-success" role="status">
            <p>{message}</p>
            {resetLink && (
              <a className="forgot-reset-link" href={resetLink} target="_blank" rel="noreferrer">
                {resetLink}
              </a>
            )}
          </div>
        )}
        {error && <p className="auth-error forgot-error" role="alert">{error}</p>}
      </main>

      <div className="forgot-footer-button-wrap">
        <button type="button" className="start-chip" onClick={() => navigate('/login')}>Start</button>
      </div>
    </div>
  )
}

export default ForgotPassword
