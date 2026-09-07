import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { clearAuthError, login } from '../features/auth/authSlice'

function Login() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { loading, error } = useSelector((state) => state.auth)
  const [mode, setMode] = useState('choice')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    const result = await dispatch(login({ identifier, password }))
    if (login.fulfilled.match(result)) navigate('/')
  }

  return <AuthLayout>
    {mode === 'choice' ? <AuthChoice title="How do you want to log in?" primary="Continue with email or phone" secondary="Continue with Facebook" footer={<>Not a member yet? <button className="text-link" onClick={() => navigate('/register')}>Sign up</button></>} onPrimary={() => setMode('form')} /> : <div className="auth-form-wrap">
      <button className="back-link" onClick={() => { dispatch(clearAuthError()); setMode('choice') }}>← Back</button>
      <p className="auth-kicker">WELCOME BACK</p><h1>What's your email or phone?</h1><p className="auth-intro">Use the details you signed up with to continue.</p>
      <form onSubmit={submit} className="auth-form"><input autoFocus type="text" value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="Email or phone number" required /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" required /><label className="check-row"><input type="checkbox" defaultChecked /> <span>Remember me</span></label><button className="auth-submit" disabled={loading}>{loading ? 'Logging in...' : 'Log in'}</button>{error && <p className="auth-error" role="alert">{error}</p>}</form><button className="text-link forgot" onClick={() => window.alert('Password reset will be available after email service setup.')}>Forgot password?</button>
    </div>}
  </AuthLayout>
}

function AuthChoice({ title, primary, secondary, footer, onPrimary }) { return <div className="auth-choice"><p className="auth-kicker">YOUR ACCOUNT, YOUR JOURNEY</p><h1>{title}</h1><div className="choice-list"><button onClick={onPrimary}>{primary}<span>›</span></button><button onClick={() => window.alert('Social sign-in will be connected after provider credentials are added.')}>{secondary}<span className="facebook">f</span><span>›</span></button></div><p className="auth-footer">{footer}</p><p className="legal-copy">By continuing, you agree to our <a href="#terms">Terms and Conditions</a> and <a href="#privacy">Privacy Policy</a>.</p></div> }
function AuthLayout({ children }) { return <div className="auth-page"><header className="auth-header"><a href="/" className="brand"><span className="brand-mark"><i /> <b /></span><span>CarPooling</span></a><a className="auth-home-link" href="/">Back to home</a></header><main className="auth-main">{children}</main></div> }

export default Login