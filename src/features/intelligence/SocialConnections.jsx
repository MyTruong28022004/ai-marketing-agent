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

const publicUrl = connection => connection?.publicPageUrl || connection?.settings?.publicPageUrl || ''

export default function SocialConnections({ workspaceId, role, onChanged }) {
  const [connections, setConnections] = useState([])
  const [pendingPages, setPendingPages] = useState([])
  const [facebookAppConfig, setFacebookAppConfig] = useState(null)
  const [facebookAppForm, setFacebookAppForm] = useState({ appId: '', appSecret: '', loginConfigId: '' })
  const [facebookCredentials, setFacebookCredentials] = useState({ pageId: '', pageAccessToken: '', pageName: '' })
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

  const loadPendingPages = useCallback(async () => {
    if (!workspaceId || !canEdit) return
    try {
      const data = await apiRequest(`/workspaces/${workspaceId}/integrations/facebook/oauth/pending`)
      setPendingPages(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
    }
  }, [workspaceId, canEdit])

  const loadFacebookAppConfig = useCallback(async () => {
    if (!workspaceId) return
    try {
      const data = await apiRequest(`/workspaces/${workspaceId}/integrations/facebook/app-config`)
      setFacebookAppConfig(data)
    } catch (err) {
      setError(err.message)
    }
  }, [workspaceId])

  useEffect(() => {
    void load()
    void loadPendingPages()
    void loadFacebookAppConfig()
    const status = new URLSearchParams(window.location.search).get('facebook')
    if (status === 'error') setError('Không thể kết nối Facebook. Hãy kiểm tra quyền quản trị Fanpage và cấu hình Meta App.')
  }, [load, loadPendingPages, loadFacebookAppConfig])

  const startFacebookOAuth = async () => {
    setBusy('FACEBOOK_OAUTH')
    setError('')
    try {
      const result = await apiRequest(`/workspaces/${workspaceId}/integrations/facebook/oauth/start`, { method: 'POST' })
      if (!result?.authUrl) throw new Error('Facebook chưa trả về địa chỉ kết nối.')
      window.location.assign(result.authUrl)
    } catch (err) {
      setError(err.message || 'Không thể bắt đầu kết nối Facebook.')
      setBusy('')
    }
  }

  const selectFacebookPage = async integrationId => {
    setBusy(`FACEBOOK_PAGE:${integrationId}`)
    setError('')
    try {
      await apiRequest(`/workspaces/${workspaceId}/integrations/facebook/oauth/select`, {
        method: 'POST', body: JSON.stringify({ integrationId }),
      })
      window.history.replaceState({}, '', `/competitors?tab=social&workspaceId=${encodeURIComponent(workspaceId)}`)
      await load()
      await loadPendingPages()
    } catch (err) {
      setError(err.message || 'Không thể chọn Fanpage.')
    } finally {
      setBusy('')
    }
  }

  const saveFacebookAppConfig = async event => {
    event.preventDefault()
    if (!facebookAppForm.appId.trim() || !facebookAppForm.appSecret.trim() || !facebookAppForm.loginConfigId.trim()) {
      setError('Hãy nhập đủ Facebook App ID, App Secret và Login Configuration ID cho workspace này.')
      return
    }
    setBusy('FACEBOOK_APP_CONFIG')
    setError('')
    try {
      const data = await apiRequest(`/workspaces/${workspaceId}/integrations/facebook/app-config`, {
        method: 'POST',
        body: JSON.stringify(facebookAppForm),
      })
      setFacebookAppConfig(data)
      setFacebookAppForm({ appId: '', appSecret: '', loginConfigId: '' })
    } catch (err) {
      setError(err.message || 'Không thể lưu cấu hình Facebook App cho workspace.')
    } finally {
      setBusy('')
    }
  }

  const saveFacebookCredentials = async event => {
    event.preventDefault()
    if (!facebookCredentials.pageId.trim() || !facebookCredentials.pageAccessToken.trim()) {
      setError('Hãy nhập Page ID và Page Access Token của Fanpage.')
      return
    }
    setBusy('FACEBOOK_MANUAL')
    setError('')
    try {
      await apiRequest(`/workspaces/${workspaceId}/integrations/facebook/manual`, {
        method: 'POST',
        body: JSON.stringify(facebookCredentials),
      })
      setFacebookCredentials({ pageId: '', pageAccessToken: '', pageName: '' })
      await load()
    } catch (err) {
      setError(err.message || 'Không thể lưu thông tin Fanpage Facebook.')
    } finally {
      setBusy('')
    }
  }

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
        const platformConnections = connections.filter(item => item.provider === platform.provider)
        const connection = platformConnections[0]
        const isBusy = busy === platform.provider
        const PlatformIcon = platform.lucideIcon
        return <article className={`social-platform-card ${connection ? 'connected' : ''}`} key={platform.provider}>
          <div className="social-platform-head">
            <span className="social-brand" style={{ color: platform.color }}>{PlatformIcon ? <PlatformIcon size={20}/> : <BrandIcon icon={platform.icon} size={20}/>}</span>
            <div><b>{platform.name}</b><small>{platformConnections.length ? `${platformConnections.length} kết nối` : 'Chưa kết nối'}</small></div>
            {platformConnections.length > 0 && <i><CheckCircle2 size={13}/> Live</i>}
          </div>
          {platformConnections.length > 0 && <div className="social-connected-accounts">{platformConnections.map(item => <div className="social-connected-account-row" key={item.id}><a className="connected-account" href={publicUrl(item)} target="_blank" rel="noreferrer"><span><b>@{item.externalAccountName}</b><small>{publicUrl(item)}</small></span><ExternalLink size={14}/></a>{canEdit && <button className="social-disconnect" onClick={() => disconnect(item)} disabled={isBusy}>{isBusy ? <LoaderCircle className="spin" size={14}/> : <Trash2 size={14}/>} Ngắt</button>}</div>)}</div>}
          <p>Dùng tín hiệu chủ đề và nội dung công khai từ {platform.name}.</p>
          {canEdit ? <div className="social-connect-form"><input aria-label={`URL ${platform.name}`} type="url" placeholder={platform.placeholder} value={forms[platform.provider] || ''} onChange={event => setForms(current => ({ ...current, [platform.provider]: event.target.value }))}/><button onClick={() => connect(platform)} disabled={isBusy}>{isBusy ? <LoaderCircle className="spin" size={14}/> : <Link2 size={14}/>} {platformConnections.length ? 'Thêm kết nối' : 'Kết nối'}</button></div> : <small>Chỉ Admin hoặc Marketer có thể kết nối.</small>}
        </article>
      })}
    </div>}
    <div className="social-connect-note"><b>Cách hoạt động</b><span>Trang kết nối được dùng làm nguồn bối cảnh cho Opportunity Engine. Các chỉ số trend vẫn được chuẩn hóa và luôn hiển thị độ tin cậy.</span></div>
    {canEdit && role === 'ADMIN' && <form className="facebook-manual-form facebook-app-config-form" onSubmit={saveFacebookAppConfig}>
      <div><span className="eyebrow">WORKSPACE FACEBOOK APP</span><h3>Cấu hình Facebook App riêng cho công ty</h3><p>Mỗi workspace có thể dùng Meta App riêng. App Secret được mã hóa ở backend và không hiển thị lại. {facebookAppConfig?.source === 'ENVIRONMENT' ? 'Hiện workspace đang dùng cấu hình mặc định từ server.' : facebookAppConfig?.configured ? `Đã cấu hình App ID ${facebookAppConfig.appId}.` : 'Workspace chưa có cấu hình riêng.'}</p></div>
      <div className="facebook-manual-fields"><label>Facebook App ID<input value={facebookAppForm.appId} onChange={event => setFacebookAppForm(current => ({ ...current, appId: event.target.value }))} placeholder={facebookAppConfig?.appId || 'Ví dụ: 4757032161196085'} inputMode="numeric" autoComplete="off"/></label><label>Login Configuration ID<input value={facebookAppForm.loginConfigId} onChange={event => setFacebookAppForm(current => ({ ...current, loginConfigId: event.target.value }))} placeholder={facebookAppConfig?.loginConfigId || 'Ví dụ: 1615071996939403'} inputMode="numeric" autoComplete="off"/></label><label className="facebook-token-field">Facebook App Secret<input type="password" value={facebookAppForm.appSecret} onChange={event => setFacebookAppForm(current => ({ ...current, appSecret: event.target.value }))} placeholder="Nhập lại App Secret để cập nhật" autoComplete="new-password"/></label></div>
      <button type="submit" className="social-facebook-save" disabled={busy === 'FACEBOOK_APP_CONFIG'}>{busy === 'FACEBOOK_APP_CONFIG' ? <LoaderCircle className="spin" size={14}/> : <CheckCircle2 size={14}/>} Lưu cấu hình cho workspace</button>
    </form>}
    {canEdit && <button className="social-facebook-oauth" onClick={startFacebookOAuth} disabled={busy === 'FACEBOOK_OAUTH'}>{busy === 'FACEBOOK_OAUTH' ? <LoaderCircle className="spin" size={14}/> : <Link2 size={14}/>} Kết nối Facebook & thêm Fanpage</button>}
    {canEdit && <form className="facebook-manual-form" onSubmit={saveFacebookCredentials}>
      <div><span className="eyebrow">FACEBOOK PUBLISHING</span><h3>Thêm Page ID và Page Access Token</h3><p>Dùng cách này nếu bạn đã có sẵn thông tin Fanpage. Token chỉ được gửi đến backend để mã hóa và lưu trong Integration, không hiển thị lại trên giao diện.</p></div>
      <div className="facebook-manual-fields"><label>Page ID<input value={facebookCredentials.pageId} onChange={event => setFacebookCredentials(current => ({ ...current, pageId: event.target.value }))} placeholder="Ví dụ: 123456789012345" inputMode="numeric" autoComplete="off"/></label><label>Tên Fanpage (tùy chọn)<input value={facebookCredentials.pageName} onChange={event => setFacebookCredentials(current => ({ ...current, pageName: event.target.value }))} placeholder="Tên hiển thị của Fanpage" autoComplete="off"/></label><label className="facebook-token-field">Page Access Token<input type="password" value={facebookCredentials.pageAccessToken} onChange={event => setFacebookCredentials(current => ({ ...current, pageAccessToken: event.target.value }))} placeholder="Dán Page Access Token" autoComplete="new-password"/></label></div>
      <button type="submit" className="social-facebook-save" disabled={busy === 'FACEBOOK_MANUAL'}>{busy === 'FACEBOOK_MANUAL' ? <LoaderCircle className="spin" size={14}/> : <CheckCircle2 size={14}/>} Lưu thông tin đăng bài</button>
    </form>}
    {pendingPages.length > 0 && <section className="facebook-page-picker">
      <div><span className="eyebrow">FACEBOOK PAGE ACCESS</span><h3>Chọn Fanpage để đăng bài</h3><p>Meta đã trả về các Fanpage mà tài khoản của bạn quản lý. Chọn một Fanpage để lưu Page Access Token vào Integration.</p></div>
      <div className="facebook-page-options">{pendingPages.map(page => {
        const selecting = busy === `FACEBOOK_PAGE:${page.id}`
        return <article className="facebook-page-option" key={page.id}><div><b>{page.pageName || 'Fanpage không tên'}</b><small>{page.publicPageUrl || `Page ID: ${page.pageId}`}</small></div><button onClick={() => selectFacebookPage(page.id)} disabled={selecting || !page.canPublish}>{selecting ? <LoaderCircle className="spin" size={13}/> : <CheckCircle2 size={13}/>} {page.canPublish ? 'Chọn Fanpage này' : 'Thiếu quyền đăng bài'}</button></article>
      })}</div>
    </section>}
  </div>
}
