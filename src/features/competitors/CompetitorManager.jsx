import React, { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle, Facebook, Globe2, LoaderCircle, Pencil, Plus, Radar,
  Save, ShieldCheck, Sparkles, Trash2, X,
} from 'lucide-react'
import { apiRequest } from '../../lib/api'

const emptyForm = {
  name: '', type: 'DIRECT', websiteUrl: '', facebookPageUrl: '', frequency: 'WEEKLY',
}

const typeLabels = {
  DIRECT: 'Trực tiếp', INDIRECT: 'Gián tiếp', INSPIRATION: 'Tham khảo', INDUSTRY: 'Trang ngành',
}

const sourceUrl = (competitor, type) => competitor.sources.find(source => source.type === type)?.url || ''

const safeOrigin = value => {
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) return ''
    if (url.protocol === 'http:') url.protocol = 'https:'
    return url.origin
  } catch {
    return ''
  }
}

const facebookAvatar = value => {
  try {
    const path = new URL(value).pathname.split('/').filter(Boolean)
    const handle = path[0]
    if (!handle || handle === 'profile.php' || handle === 'pages') return ''
    return `https://graph.facebook.com/${encodeURIComponent(handle)}/picture?type=large`
  } catch {
    return ''
  }
}

function RemoteSourceImage({ candidates, alt, fallback, className }) {
  const sources = candidates.filter(Boolean)
  const sourceKey = sources.join('|')
  const [index, setIndex] = useState(0)

  useEffect(() => setIndex(0), [sourceKey])

  if (!sources[index]) return fallback
  return <img
    className={className}
    src={sources[index]}
    alt={alt}
    loading="lazy"
    referrerPolicy="no-referrer"
    onError={() => setIndex(current => current + 1)}
  />
}

function CompetitorLogo({ competitor }) {
  const website = sourceUrl(competitor, 'WEBSITE')
  const facebook = sourceUrl(competitor, 'FACEBOOK_PAGE')
  const origin = safeOrigin(website)
  return <span className="competitor-avatar">
    <RemoteSourceImage
      candidates={[
        origin && `${origin}/apple-touch-icon.png`,
        origin && `${origin}/favicon.ico`,
        facebookAvatar(facebook),
        facebook && 'https://www.facebook.com/favicon.ico',
      ]}
      alt={`Logo ${competitor.name}`}
      fallback={<b aria-hidden="true">{competitor.name.slice(0, 1).toUpperCase()}</b>}
      className="competitor-logo-image"
    />
  </span>
}

function SourceLogo({ source }) {
  const origin = safeOrigin(source.url)
  const isWebsite = source.type === 'WEBSITE'
  const label = isWebsite ? 'Website' : source.type === 'FACEBOOK_PAGE' ? 'Facebook' : 'Meta Ad Library'
  return <RemoteSourceImage
    candidates={isWebsite
      ? [origin && `${origin}/favicon.ico`, origin && `${origin}/apple-touch-icon.png`]
      : ['https://www.facebook.com/favicon.ico']}
    alt={`${label} icon`}
    fallback={isWebsite ? <Globe2 size={14}/> : source.type === 'FACEBOOK_PAGE' ? <Facebook size={14}/> : <ShieldCheck size={14}/>}
    className="competitor-source-image"
  />
}

export default function CompetitorManager({ workspaceId, role, compact = false, onCountChange }) {
  const [competitors, setCompetitors] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [discovering, setDiscovering] = useState(false)
  const [discovery, setDiscovery] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [error, setError] = useState('')
  const canEdit = role === 'ADMIN' || role === 'MARKETER'

  const syncCompetitors = useCallback(next => {
    setCompetitors(next)
    onCountChange?.(next.filter(item => item.active).length)
  }, [onCountChange])

  const load = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      syncCompetitors(await apiRequest(`/workspaces/${workspaceId}/competitors`))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [workspaceId, syncCompetitors])

  useEffect(() => { void load() }, [load])

  const update = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  const updateEdit = event => setEditForm(current => ({ ...current, [event.target.name]: event.target.value }))

  const add = async event => {
    event.preventDefault()
    setError('')
    if (competitors.filter(item => item.active).length >= 10) {
      setError('Watchlist đã đủ 10 đối thủ. Hãy xóa một đối thủ trước khi thêm mới.')
      return
    }
    if (!form.websiteUrl && !form.facebookPageUrl) {
      setError('Hãy nhập ít nhất website hoặc Facebook Page của đối thủ.')
      return
    }
    setSaving(true)
    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ''))
      const created = await apiRequest(`/workspaces/${workspaceId}/competitors`, {
        method: 'POST', body: JSON.stringify(payload),
      })
      syncCompetitors([...competitors, created])
      setForm(emptyForm)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const discover = async () => {
    setError('')
    setDiscovery(null)
    setDiscovering(true)
    try {
      const result = await apiRequest(`/workspaces/${workspaceId}/competitors/discover`, { method: 'POST' })
      syncCompetitors(result.competitors)
      setDiscovery({ summary: result.summary, createdCount: result.createdCount, updatedCount: result.updatedCount })
    } catch (err) {
      setError(err.message)
    } finally {
      setDiscovering(false)
    }
  }

  const startEdit = item => {
    setError('')
    setEditingId(item.id)
    setEditForm({
      name: item.name,
      type: item.type,
      websiteUrl: sourceUrl(item, 'WEBSITE'),
      facebookPageUrl: sourceUrl(item, 'FACEBOOK_PAGE'),
      frequency: item.frequency,
      description: item.description || '',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(null)
  }

  const saveEdit = async event => {
    event.preventDefault()
    setError('')
    if (!editForm.websiteUrl.trim() && !editForm.facebookPageUrl.trim()) {
      setError('Hãy giữ lại ít nhất website hoặc Facebook Page của đối thủ.')
      return
    }
    setSaving(true)
    try {
      const updated = await apiRequest(`/workspaces/${workspaceId}/competitors/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...editForm,
          name: editForm.name.trim(),
          description: editForm.description.trim(),
          websiteUrl: editForm.websiteUrl.trim() || null,
          facebookPageUrl: editForm.facebookPageUrl.trim() || null,
        }),
      })
      syncCompetitors(competitors.map(item => item.id === editingId ? { ...item, ...updated } : item))
      cancelEdit()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const deactivate = async competitorId => {
    setError('')
    try {
      await apiRequest(`/workspaces/${workspaceId}/competitors/${competitorId}`, { method: 'DELETE' })
      syncCompetitors(competitors.map(item => item.id === competitorId ? { ...item, active: false } : item))
      if (editingId === competitorId) cancelEdit()
    } catch (err) {
      setError(err.message)
    }
  }

  const activeCompetitors = competitors.filter(item => item.active)

  return <div className={`competitor-manager ${compact ? 'compact' : ''}`}>
    {!compact && <div className="feature-heading">
      <div><span className="eyebrow">INTELLIGENCE CENTER</span><h1>Radar đối thủ</h1><p>Theo dõi thay đổi website, chiến dịch và khoảng trống nội dung.</p></div>
      <div className="radar-summary"><Radar size={20}/><span><b>{activeCompetitors.length}</b><small>đối thủ đang theo dõi</small></span></div>
    </div>}

    {canEdit && <section className={`competitor-ai-card ${discovery ? 'complete' : ''}`}>
      <span><Sparkles size={20}/></span>
      <div>
        <b>{discovery ? 'AI đã cập nhật watchlist' : 'Tìm top 10 đối thủ bằng AI'}</b>
        <p>{discovery?.summary || 'AI dùng hồ sơ workspace và web search để tìm, xếp hạng và phân tích các đối thủ tiềm năng. Kết quả được lưu tự động và bạn có thể sửa hoặc xóa.'}</p>
        {discovery && <small>Đã thêm {discovery.createdCount}, cập nhật {discovery.updatedCount} đối thủ.</small>}
      </div>
      <button type="button" onClick={discover} disabled={discovering}>
        {discovering ? <><LoaderCircle className="spin" size={16}/> Đang nghiên cứu...</> : <><Sparkles size={16}/> {activeCompetitors.length ? 'Phân tích lại top 10' : 'Tìm top 10 tự động'}</>}
      </button>
    </section>}

    {canEdit && <form className="competitor-form" onSubmit={add}>
      <div className="competitor-form-head">
        <span><Plus size={16}/></span>
        <div><b>Thêm đối thủ thủ công</b><small>Dùng khi bạn muốn bổ sung một thương hiệu cụ thể vào watchlist.</small></div>
      </div>
      <div className="competitor-form-grid">
        <label><span>Tên đối thủ *</span><input required name="name" value={form.name} onChange={update} placeholder="Tên thương hiệu" /></label>
        <label><span>Phân loại</span><select name="type" value={form.type} onChange={update}><option value="DIRECT">Đối thủ trực tiếp</option><option value="INDIRECT">Đối thủ gián tiếp</option><option value="INSPIRATION">Thương hiệu tham khảo</option><option value="INDUSTRY">Trang ngành</option></select></label>
        <label><span>Website</span><div className="field-with-icon"><Globe2 size={15}/><input type="url" name="websiteUrl" value={form.websiteUrl} onChange={update} placeholder="https://doithu.vn" /></div></label>
        <label><span>Facebook Page</span><div className="field-with-icon"><Facebook size={15}/><input type="url" name="facebookPageUrl" value={form.facebookPageUrl} onChange={update} placeholder="https://facebook.com/doithu" /></div></label>
        <label><span>Tần suất</span><select name="frequency" value={form.frequency} onChange={update}><option value="WEEKLY">Hàng tuần</option><option value="DAILY">Hàng ngày</option></select></label>
        <button className="primary-btn competitor-add" disabled={saving || activeCompetitors.length >= 10} type="submit">{saving ? <LoaderCircle className="spin" size={16}/> : <Plus size={16}/>} Thêm đối thủ</button>
      </div>
    </form>}

    {error && <div className="inline-error"><AlertCircle size={16}/>{error}</div>}

    <div className="competitor-list-head"><b>Top đối thủ tiềm năng</b><span>{activeCompetitors.length}/10 đối thủ</span></div>
    {loading ? <div className="data-loading"><LoaderCircle className="spin" size={20}/> Đang tải dữ liệu đối thủ...</div> : activeCompetitors.length === 0 ? <div className="empty-competitors">
      <span><Radar size={24}/></span><b>Chưa có đối thủ trong radar</b><p>Bấm “Tìm top 10 tự động” để Codex nghiên cứu và thiết lập watchlist.</p>
    </div> : <div className="competitor-grid">
      {activeCompetitors.map(item => <article className={`competitor-card ${editingId === item.id ? 'editing' : ''}`} key={item.id}>
        {editingId === item.id ? <form className="competitor-edit-form" onSubmit={saveEdit}>
          <div className="competitor-edit-head"><b>Chỉnh sửa đối thủ</b><button type="button" onClick={cancelEdit} aria-label="Hủy chỉnh sửa"><X size={16}/></button></div>
          <label><span>Tên đối thủ đang sửa</span><input required name="name" value={editForm.name} onChange={updateEdit} /></label>
          <div className="competitor-edit-row">
            <label><span>Phân loại</span><select name="type" value={editForm.type} onChange={updateEdit}><option value="DIRECT">Trực tiếp</option><option value="INDIRECT">Gián tiếp</option><option value="INSPIRATION">Tham khảo</option><option value="INDUSTRY">Trang ngành</option></select></label>
            <label><span>Tần suất</span><select name="frequency" value={editForm.frequency} onChange={updateEdit}><option value="WEEKLY">Hàng tuần</option><option value="DAILY">Hàng ngày</option></select></label>
          </div>
          <label><span>Website đang sửa</span><input type="url" name="websiteUrl" value={editForm.websiteUrl} onChange={updateEdit} placeholder="https://doithu.vn" /></label>
          <label><span>Facebook Page đang sửa</span><input type="url" name="facebookPageUrl" value={editForm.facebookPageUrl} onChange={updateEdit} placeholder="https://facebook.com/doithu" /></label>
          <label><span>Phân tích</span><textarea name="description" value={editForm.description} onChange={updateEdit} rows="4" maxLength="1000" /></label>
          <div className="competitor-edit-actions"><button type="button" onClick={() => deactivate(item.id)} className="danger-btn"><Trash2 size={14}/> Xóa</button><button type="submit" disabled={saving} className="save-btn">{saving ? <LoaderCircle className="spin" size={14}/> : <Save size={14}/>} Lưu thay đổi</button></div>
        </form> : <>
          <div className="competitor-card-top"><CompetitorLogo competitor={item}/><div><b>{item.name}</b><small>{typeLabels[item.type]}</small></div><span className="monitoring-pill"><i/> Đang theo dõi</span></div>
          {item.description && <p className="competitor-description">{item.description}</p>}
          <div className="competitor-sources">
            {item.sources.map(source => <a href={source.url} target="_blank" rel="noreferrer" key={source.id}><SourceLogo source={source}/><span>{source.type === 'WEBSITE' ? 'Website' : source.type === 'FACEBOOK_PAGE' ? 'Facebook' : 'Ad Library'}</span></a>)}
          </div>
          <div className="competitor-score"><span><small>Threat score</small><b>{item.threatScore == null ? '—' : Math.round(item.threatScore)}</b></span><p>{item.threatScore == null ? 'Chưa có phân tích AI' : `Content ${Math.round(item.contentScore || 0)} · Visibility ${Math.round(item.visibilityScore || 0)}`}</p><div className="competitor-card-actions">{canEdit && <button onClick={() => startEdit(item)} aria-label={`Chỉnh sửa ${item.name}`}><Pencil size={15}/></button>}{role === 'ADMIN' && <button onClick={() => deactivate(item.id)} aria-label={`Xóa ${item.name}`}><Trash2 size={15}/></button>}</div></div>
        </>}
      </article>)}
    </div>}
  </div>
}
