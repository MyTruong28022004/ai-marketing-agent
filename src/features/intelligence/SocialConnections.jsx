import React, { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, ExternalLink, Link2, Linkedin, LoaderCircle, RefreshCw, Trash2 } from 'lucide-react'
import { siFacebook, siInstagram, siTiktok, siYoutube } from 'simple-icons'
import BrandIcon from '../../components/BrandIcon'
import { apiRequest } from '../../lib/api'

const platforms = [
  { provider: 'FACEBOOK', name: 'Facebook', icon: siFacebook, color: '#0866ff', placeholder: 'https://facebook.com/ten-trang' },
  { provider: 'INSTAGRAM', name: 'Instagram', icon: siInstagram, color: '#e4405f', placeholder: 'https://instagram.com/ten-tai-khoan' },
  { provider: 'TIKTOK', name: 'TikTok', icon: siTiktok, color: '#111111', placeholder: 'https://tiktok.com/@ten-tai-khoan' },
  { provider: 'YOUTUBE', name: 'YouTube', icon: siYoutube, color: '#ff0000', placeholder: 'https://youtube.com/@ten-kenh' },
  { provider: 'LINKEDIN', name: 'LinkedIn', lucideIcon: Linkedin, color: '#0a66c2', placeholder: 'https://linkedin.com/company/ten-cong-ty' },
]

const publicUrl = connection => connection?.settings?.publicPageUrl || ''

export default function SocialConnections({ workspaceId, role, onChanged }) {
  const [connections, setConnections] = useState([])
  const [forms, setForms] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const canEdit = role === 'ADMIN' || role === 'MARKETER'

  const load = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const data = await apiRequest(`/workspaces/${workspaceId}/integrations/social`)
      setConnections(data)
      onChanged?.(data.length)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [workspaceId, onChanged])

  useEffect(() => { void load() }, [load])

  const connect = async platform => {
    const value = forms[platform.provider]?.trim()
    if (!value) return setError(`Hãy nhập URL trang ${platform.name}.`)
    setBusy(platform.provider)
    setError('')
    try {
      const url = new URL(value)
      const accountName = url.pathname.split('/').filter(Boolean).at(-1)?.replace(/^@/, '') || platform.name
      await apiRequest(`/workspaces/${workspaceId}/integrations/social`, {
        method: 'POST', body: JSON.stringify({ provider: platform.provider, pageUrl: value, accountName }),
      })
      setForms(current => ({ ...current, [platform.provider]: '' }))
      await load()
    } catch (err) {
      setError(err.message || 'URL chưa hợp lệ.')
    } finally {
      setBusy('')
    }
  }

  const disconnect = async connection => {
    setBusy(connection.provider)
    setError('')
    try {
      await apiRequest(`/workspaces/${workspaceId}/integrations/social/${connection.id}`, { method: 'DELETE' })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  return <div className="social-connections">
    <section className="social-connect-hero">
      <span><Link2 size={21}/></span>
      <div><span className="eyebrow">OWNED SOCIAL RADAR</span><h2>Kết nối các trang social</h2><p>Thêm URL trang công khai để AI quan sát nội dung, chủ đề và tín hiệu cạnh tranh liên quan đến thương hiệu.</p></div>
      <div className="social-privacy"><CheckCircle2 size={15}/><p><b>Chỉ dữ liệu công khai</b><small>Không yêu cầu mật khẩu hoặc quyền đăng bài.</small></p></div>
    </section>

    {error && <div className="inline-error">{error}</div>}
    {loading ? <div className="data-loading"><LoaderCircle className="spin" size={19}/> Đang tải kết nối...</div> : <div className="social-platform-grid">
      {platforms.map(platform => {
        const connection = connections.find(item => item.provider === platform.provider)
        const isBusy = busy === platform.provider
        const PlatformIcon = platform.lucideIcon
        return <article className={`social-platform-card ${connection ? 'connected' : ''}`} key={platform.provider}>
          <div className="social-platform-head">
            <span className="social-brand" style={{ color: platform.color }}>{PlatformIcon ? <PlatformIcon size={20}/> : <BrandIcon icon={platform.icon} size={20}/>}</span>
            <div><b>{platform.name}</b><small>{connection ? 'Đang kết nối' : 'Chưa kết nối'}</small></div>
            {connection && <i><CheckCircle2 size={13}/> Live</i>}
          </div>
          {connection ? <>
            <a className="connected-account" href={publicUrl(connection)} target="_blank" rel="noreferrer"><span><b>@{connection.externalAccountName}</b><small>{publicUrl(connection)}</small></span><ExternalLink size={14}/></a>
            <div className="social-sync"><span><RefreshCw size={12}/> Đồng bộ gần nhất</span><b>{connection.lastSyncedAt ? new Date(connection.lastSyncedAt).toLocaleString('vi-VN') : 'Chưa đồng bộ'}</b></div>
            {canEdit && <button className="social-disconnect" onClick={() => disconnect(connection)} disabled={isBusy}>{isBusy ? <LoaderCircle className="spin" size={14}/> : <Trash2 size={14}/>} Ngắt kết nối</button>}
          </> : <>
            <p>Dùng tín hiệu chủ đề và nội dung công khai từ {platform.name}.</p>
            {canEdit ? <div className="social-connect-form"><input aria-label={`URL ${platform.name}`} type="url" placeholder={platform.placeholder} value={forms[platform.provider] || ''} onChange={event => setForms(current => ({ ...current, [platform.provider]: event.target.value }))}/><button onClick={() => connect(platform)} disabled={isBusy}>{isBusy ? <LoaderCircle className="spin" size={14}/> : <Link2 size={14}/>} Kết nối</button></div> : <small>Chỉ Admin hoặc Marketer có thể kết nối.</small>}
          </>}
        </article>
      })}
    </div>}
    <div className="social-connect-note"><b>Cách hoạt động</b><span>Trang kết nối được dùng làm nguồn bối cảnh cho Opportunity Engine. Các chỉ số trend vẫn được chuẩn hóa và luôn hiển thị độ tin cậy.</span></div>
  </div>
}
