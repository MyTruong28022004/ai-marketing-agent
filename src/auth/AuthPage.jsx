import React, { useState } from 'react'
import {
  ArrowRight, BarChart3, Building2, CheckCircle2, Eye, EyeOff,
  LockKeyhole, Mail, Sparkles, TrendingUp, UserRound,
} from 'lucide-react'
import { useAuth } from './AuthContext'

const initialLogin = { email: '', password: '' }
const initialRegister = { name: '', email: '', password: '', confirmPassword: '', companyName: '' }

function Brand() {
  return <div className="auth-brand">
    <span className="auth-logo">M<i /></span>
    <span><b>Milo</b><small>MARKETING AI</small></span>
  </div>
}

export default function AuthPage() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login')
  const [loginForm, setLoginForm] = useState(initialLogin)
  const [registerForm, setRegisterForm] = useState(initialRegister)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const isLogin = mode === 'login'
  const form = isLogin ? loginForm : registerForm
  const setForm = isLogin ? setLoginForm : setRegisterForm
  const update = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))

  const switchMode = next => {
    setMode(next)
    setError('')
    setShowPassword(false)
  }

  const submit = async event => {
    event.preventDefault()
    setError('')
    if (!isLogin && registerForm.password !== registerForm.confirmPassword) {
      setError('Mật khẩu xác nhận chưa khớp.')
      return
    }
    setSubmitting(true)
    try {
      if (isLogin) {
        await login(loginForm)
      } else {
        const { confirmPassword: _confirmPassword, ...payload } = registerForm
        await register(payload)
      }
    } catch (err) {
      setError(err.message || 'Không thể kết nối máy chủ. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  const useDemo = () => {
    setLoginForm({ email: 'admin@milo.local', password: 'MiloDemo123!' })
    setError('')
  }

  return <div className="auth-page">
    <section className="auth-story">
      <Brand />
      <div className="auth-story-copy">
        <span className="auth-kicker"><Sparkles size={14}/> AI MARKETING WORKSPACE</span>
        <h1>Một nơi để đội ngũ<br/><em>cùng tăng trưởng.</em></h1>
        <p>Kết nối dữ liệu, hiểu thị trường và biến insight thành kế hoạch có thể hành động.</p>
        <div className="auth-benefits">
          <div><span><BarChart3 size={18}/></span><p><b>Radar tăng trưởng</b><small>Theo dõi website, Facebook và đối thủ.</small></p></div>
          <div><span><TrendingUp size={18}/></span><p><b>Kế hoạch rõ ràng</b><small>Mỗi đề xuất đều có dữ liệu và bước phê duyệt.</small></p></div>
          <div><span><CheckCircle2 size={18}/></span><p><b>Kiểm soát theo vai trò</b><small>Sales, Marketer và Admin làm đúng phần việc.</small></p></div>
        </div>
      </div>
      <small className="auth-copyright">© 2026 Milo · Marketing Intelligence & Launch Orchestrator</small>
    </section>

    <main className="auth-main">
      <div className="auth-mobile-brand"><Brand /></div>
      <div className="auth-card">
        <div className="auth-tabs" role="tablist">
          <button className={isLogin ? 'active' : ''} onClick={() => switchMode('login')} type="button">Đăng nhập</button>
          <button className={!isLogin ? 'active' : ''} onClick={() => switchMode('register')} type="button">Tạo tài khoản</button>
        </div>

        <div className="auth-heading">
          <span>{isLogin ? 'CHÀO MỪNG TRỞ LẠI' : 'BẮT ĐẦU VỚI MILO'}</span>
          <h2>{isLogin ? 'Tiếp tục công việc của bạn' : 'Tạo workspace đầu tiên'}</h2>
          <p>{isLogin ? 'Đăng nhập để xem insight và kế hoạch hôm nay.' : 'Thiết lập tài khoản quản trị cho công ty của bạn.'}</p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {!isLogin && <>
            <label>
              <span>Họ và tên</span>
              <div className="auth-input"><UserRound size={17}/><input required name="name" value={form.name} onChange={update} placeholder="Nguyễn Minh Anh" autoComplete="name" /></div>
            </label>
            <label>
              <span>Tên công ty</span>
              <div className="auth-input"><Building2 size={17}/><input required name="companyName" value={form.companyName} onChange={update} placeholder="Công ty của bạn" autoComplete="organization" /></div>
            </label>
          </>}
          <label>
            <span>Email công việc</span>
            <div className="auth-input"><Mail size={17}/><input required type="email" name="email" value={form.email} onChange={update} placeholder="ban@congty.vn" autoComplete="email" /></div>
          </label>
          <label>
            <span>Mật khẩu</span>
            <div className="auth-input"><LockKeyhole size={17}/><input required minLength={isLogin ? 1 : 10} type={showPassword ? 'text' : 'password'} name="password" value={form.password} onChange={update} placeholder={isLogin ? 'Nhập mật khẩu' : 'Tối thiểu 10 ký tự'} autoComplete={isLogin ? 'current-password' : 'new-password'} /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div>
          </label>
          {!isLogin && <label>
            <span>Xác nhận mật khẩu</span>
            <div className="auth-input"><LockKeyhole size={17}/><input required minLength="10" type={showPassword ? 'text' : 'password'} name="confirmPassword" value={form.confirmPassword} onChange={update} placeholder="Nhập lại mật khẩu" autoComplete="new-password" /></div>
          </label>}

          {error && <div className="auth-error" role="alert">{error}</div>}
          <button className="auth-submit" disabled={submitting} type="submit">
            {submitting ? <span className="button-spinner"/> : <>{isLogin ? 'Đăng nhập' : 'Tạo workspace'}<ArrowRight size={17}/></>}
          </button>
        </form>

        {isLogin && <div className="demo-login">
          <span>Tài khoản demo local</span>
          <button type="button" onClick={useDemo}>Dùng admin@milo.local</button>
        </div>}
        {!isLogin && <p className="auth-terms">Bằng việc tiếp tục, bạn đồng ý với điều khoản sử dụng và chính sách dữ liệu của Milo.</p>}
      </div>
    </main>
  </div>
}
