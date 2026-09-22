import { useEffect, useMemo, useRef, useState } from 'react'
import { Bookmark, CalendarDays, Check, ChevronLeft, ChevronRight, ExternalLink, Facebook, FileText, FolderOpen, LoaderCircle, Pencil, Search, Send, ShieldCheck, Sparkles, Trash2, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { vi } from 'date-fns/locale'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import { apiRequest } from '../../lib/api'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'

function formatVolume(value, period) {
  if (value === null || value === undefined) return 'Chưa có dữ liệu lượt tìm kiếm'
  return `${new Intl.NumberFormat('vi-VN').format(value)} lượt ${period || 'mỗi tháng'}`
}

function formatSearchVolume(value, period) {
  if (value === null || value === undefined) return 'Chưa có dữ liệu lượt tìm kiếm'
  return `Lượt tìm kiếm ước tính: ${new Intl.NumberFormat('vi-VN').format(value)} lượt ${period || 'mỗi tháng'}`
}

function productFitLabel(fit) {
  return ({ FIT: 'Phù hợp', PARTIAL: 'Phù hợp một phần', NOT_FIT: 'Không phù hợp', UNKNOWN: 'Chưa đủ dữ liệu' })[fit] || 'Chưa đủ dữ liệu'
}

const productFitPriority = { FIT: 3, PARTIAL: 2, UNKNOWN: 1, NOT_FIT: 0 }

function bestProductMatches(matches = []) {
  const relevant = matches.filter(match => (productFitPriority[match.fit] || 0) >= 2)
  if (!relevant.length) return []
  const highest = Math.max(...relevant.map(match => productFitPriority[match.fit] || 0))
  return relevant.filter(match => (productFitPriority[match.fit] || 0) === highest)
}

function keywordRelevance(item) {
  return Math.max(...(item.productMatches || []).map(match => productFitPriority[match.fit] || 0), 0)
}

const contentPlatforms = [
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'YOUTUBE', label: 'YouTube' },
]

const contentPillars = [
  { value: 'BRAND', label: 'Thương hiệu' },
  { value: 'PRODUCT_SERVICE', label: 'Sản phẩm/Dịch vụ' },
  { value: 'EDUCATION', label: 'Kiến thức/Giáo dục' },
  { value: 'PROBLEM_SOLUTION', label: 'Vấn đề và giải pháp' },
  { value: 'SALES', label: 'Bán hàng' },
  { value: 'CUSTOMER_PROOF', label: 'Khách hàng/Chứng thực' },
  { value: 'INTERNAL_CULTURE', label: 'Nội bộ/Văn hóa' },
  { value: 'FAQ', label: 'Giải đáp/FAQ' },
  { value: 'CUSTOMER_SUPPORT', label: 'Chăm sóc khách hàng' },
  { value: 'RECRUITING', label: 'Tuyển dụng' },
  { value: 'PARTNERS_ACHIEVEMENTS', label: 'Đối tác/Thành tựu' },
]

const contentFormats = [
  { value: 'TEXT_POST', label: 'Bài viết thường' },
  { value: 'REEL', label: 'Reel' },
  { value: 'CAROUSEL', label: 'Carousel' },
  { value: 'INFOGRAPHIC', label: 'Infographic' },
  { value: 'QUOTE', label: 'Quote' },
  { value: 'STORY', label: 'Story' },
  { value: 'CHECKLIST', label: 'Checklist' },
]

const contentPostStatuses = [
  { value: 'PLANNED', label: 'Chưa viết' },
  { value: 'WRITTEN', label: 'Đã viết' },
  { value: 'PUBLISHED', label: 'Đã đăng' },
  { value: 'CANCELLED', label: 'Đã hủy' },
]

const contentPostReviewStatuses = [
  { value: 'DRAFT', label: 'Chưa gửi duyệt' },
  { value: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'RETURNED', label: 'Cần chỉnh sửa' },
]

const contentPlanStatuses = [
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'RETURNED', label: 'Trả về' },
  { value: 'ACTIVE', label: 'Đang dùng' },
]

const contentGenerationTones = [
  { value: 'BRAND_VOICE', label: 'Theo Brand Voice', help: 'Dùng giọng điệu, từ nên dùng và từ cần tránh của workspace.' },
  { value: 'PROFESSIONAL', label: 'Chuyên nghiệp', help: 'Rõ ràng, có căn cứ, phù hợp với người ra quyết định.' },
  { value: 'FRIENDLY', label: 'Thân thiện', help: 'Gần gũi, dễ đọc nhưng vẫn giữ sự tin cậy.' },
  { value: 'EDUCATIONAL', label: 'Giáo dục / hướng dẫn', help: 'Giải thích từng ý và ưu tiên giá trị thông tin.' },
  { value: 'PERSUASIVE', label: 'Thuyết phục', help: 'Làm rõ vấn đề, lợi ích hợp lệ và lý do hành động.' },
]

const contentGenerationSeoModes = [
  { value: 'SEO_STANDARD', label: 'Chuẩn SEO', help: 'Bám search intent, dùng keyword tự nhiên, không nhồi từ khóa.' },
  { value: 'SOCIAL_FIRST', label: 'Ưu tiên mạng xã hội', help: 'Hook rõ, đoạn ngắn, dễ đọc và tạo tương tác.' },
  { value: 'CONVERSION', label: 'Ưu tiên chuyển đổi', help: 'Nêu vấn đề, lợi ích và CTA cụ thể dựa trên tài liệu.' },
]

const contentGenerationLengths = [
  { value: 'SHORT', label: 'Ngắn', help: 'Khoảng 80–140 từ nếu platform và format cho phép.' },
  { value: 'MEDIUM', label: 'Vừa', help: 'Khoảng 160–300 từ, phù hợp cho đa số bài đăng.' },
  { value: 'LONG', label: 'Dài / chuyên sâu', help: 'Khoảng 350–600 từ nếu platform và format cho phép.' },
]

const contentGenerationCtaStyles = [
  { value: 'NONE', label: 'Không CTA', help: 'Không thêm lời mời hành động ở cuối bài.' },
  { value: 'SOFT', label: 'CTA mềm', help: 'Lời mời tự nhiên, không gây áp lực.' },
  { value: 'DIRECT', label: 'CTA trực tiếp', help: 'Hành động cụ thể, chỉ dựa trên thông tin có trong tài liệu.' },
]

const defaultContentGenerationOptions = { tone: 'BRAND_VOICE', seoMode: 'SEO_STANDARD', contentLength: 'MEDIUM', ctaStyle: 'SOFT' }

const labelFor = (options, value) => options.find(option => option.value === value)?.label || value

function normalizeKeyword(value) {
  return value?.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi') || ''
}

function savedKeywordToTrendKeyword(item) {
  const snapshot = item.keyword.snapshot
  const metadata = snapshot?.metadata && typeof snapshot.metadata === 'object' && !Array.isArray(snapshot.metadata)
    ? snapshot.metadata
    : {}
  return {
    keyword: item.keyword.text,
    topic: metadata.topicName ? { name: metadata.topicName, slug: metadata.topicSlug || undefined } : undefined,
    topicName: metadata.topicName || undefined,
    trendType: metadata.trendType || 'STABLE',
    trendScore: snapshot?.trendScore ?? null,
    trendScoreSource: metadata.trendScoreSource || null,
    searchVolume: snapshot?.searchVolume ?? null,
    volumeSource: metadata.volumeSource || null,
    volumePeriod: metadata.volumePeriod || undefined,
    reason: metadata.reason || 'Keyword đã được lưu từ kết quả tìm kiếm trước đó.',
    intent: item.keyword.intent || '',
    sourceUrls: Array.isArray(metadata.sourceUrls) ? metadata.sourceUrls : [],
    productMatches: Array.isArray(metadata.productMatches) ? metadata.productMatches : [],
  }
}

function SaveKeywordDialog({ workspaceId, keyword, onClose, onSaved }) {
  const [folders, setFolders] = useState([])
  const [foldersLoading, setFoldersLoading] = useState(true)
  const [folderMode, setFolderMode] = useState('existing')
  const [folderId, setFolderId] = useState('')
  const [folderName, setFolderName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    apiRequest(`/workspaces/${workspaceId}/trends/folders`)
      .then(data => {
        if (!mounted) return
        setFolders(data)
        if (!data.length) setFolderMode('new')
      })
      .catch(requestError => mounted && setError(requestError.message || 'Không thể tải danh sách folder.'))
      .finally(() => mounted && setFoldersLoading(false))
    return () => { mounted = false }
  }, [workspaceId])

  const save = async () => {
    if (folderMode === 'existing' && !folderId) {
      setError('Hãy chọn một folder để lưu keyword.')
      return
    }
    if (folderMode === 'new' && !folderName.trim()) {
      setError('Hãy nhập tên folder mới.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = await apiRequest(`/workspaces/${workspaceId}/trends/save`, {
        method: 'POST',
        body: JSON.stringify({
          keyword: keyword.keyword,
          topicSlug: keyword.topic?.slug,
          topicName: keyword.topic?.name,
          trendType: keyword.trendType,
          trendScore: keyword.trendScore,
          trendScoreSource: keyword.trendScoreSource,
          searchVolume: keyword.searchVolume,
          volumeSource: keyword.volumeSource,
          volumePeriod: keyword.volumePeriod,
          reason: keyword.reason,
          intent: keyword.intent,
          sourceUrls: keyword.sourceUrls,
          productMatches: keyword.productMatches || [],
          ...(folderMode === 'existing' ? { folderId } : { folderName: folderName.trim() }),
        }),
      })
      onSaved(result)
    } catch (requestError) {
      if (requestError?.name === 'AbortError') return
      setError(requestError.message || 'Không thể lưu keyword.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="trend-save-backdrop">
      <section className="trend-save-dialog" role="dialog" aria-modal="true" aria-labelledby="save-keyword-title">
        <header><div><span className="eyebrow">SAVE KEYWORD</span><h3 id="save-keyword-title">Lưu “{keyword.keyword}”</h3></div><button className="icon-btn" onClick={onClose} aria-label="Đóng"><X size={17}/></button></header>
        <div className="trend-save-body">
          <p>Chọn folder của workspace để lưu keyword và snapshot volume tại thời điểm tìm kiếm.</p>
          {foldersLoading && <div className="trend-loading"><LoaderCircle className="spin" size={15}/> Đang tải folder...</div>}
          {!foldersLoading && <>
            <div className="trend-save-toggle">
              <button className={folderMode === 'existing' ? 'active' : ''} onClick={() => setFolderMode('existing')} disabled={!folders.length}><FolderOpen size={14}/> Folder có sẵn</button>
              <button className={folderMode === 'new' ? 'active' : ''} onClick={() => setFolderMode('new')}><Bookmark size={14}/> Tạo folder mới</button>
            </div>
            {folderMode === 'existing' && <label className="trend-save-field"><span>Folder</span><select value={folderId} onChange={event => setFolderId(event.target.value)}><option value="">Chọn folder</option>{folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name} ({folder._count?.items || 0})</option>)}</select></label>}
            {folderMode === 'new' && <label className="trend-save-field"><span>Tên folder mới</span><input value={folderName} onChange={event => setFolderName(event.target.value)} placeholder="Ví dụ: Lead SaaS Q4" maxLength={120}/></label>}
          </>}
          <div className="trend-save-preview"><span>Lượt tìm kiếm</span><b>{formatVolume(keyword.searchVolume, keyword.volumePeriod)}</b><small>{keyword.volumeSource || 'Nguồn lượt tìm kiếm chưa được xác định'}</small></div>
          {error && <div className="inline-error">{error}</div>}
        </div>
        <footer><button className="outline-btn" onClick={onClose}>Hủy</button><button className="primary-btn" onClick={save} disabled={saving || foldersLoading}>{saving ? <LoaderCircle className="spin" size={14}/> : <Bookmark size={14}/>} {saving ? 'Đang lưu...' : 'Lưu keyword'}</button></footer>
       </section>
    </div>
  )
}

function SavedKeywordsDialog({ workspaceId, onClose, onCreatePlan }) {
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedKeys, setSelectedKeys] = useState([])
  const [deletingKey, setDeletingKey] = useState('')

  useEffect(() => {
    let mounted = true
    setLoading(true)
    apiRequest(`/workspaces/${workspaceId}/trends/saved`)
      .then(data => mounted && setFolders(data))
      .catch(requestError => mounted && setError(requestError.message || 'Không thể tải keyword đã lưu.'))
      .finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [workspaceId])

  const savedCount = folders.reduce((total, folder) => total + folder.items.length, 0)
  const selectedItems = folders.flatMap(folder => folder.items
    .filter(item => selectedKeys.includes(`${folder.id}:${item.keyword.id}`))
    .map(item => ({ ...item, folderId: folder.id })))

  const toggleSelected = key => setSelectedKeys(current => current.includes(key)
    ? current.filter(item => item !== key)
    : [...current, key])

  const deleteKeyword = async (folder, item) => {
    const key = `${folder.id}:${item.keyword.id}`
    if (!window.confirm(`Xóa keyword "${item.keyword.text}" khỏi folder này?`)) return
    setDeletingKey(key)
    setError('')
    try {
      await apiRequest(`/workspaces/${workspaceId}/trends/folders/${folder.id}/items/${item.keyword.id}`, { method: 'DELETE' })
      setFolders(current => current
        .map(currentFolder => currentFolder.id === folder.id
          ? { ...currentFolder, items: currentFolder.items.filter(currentItem => currentItem.keyword.id !== item.keyword.id) }
          : currentFolder)
        .filter(currentFolder => currentFolder.items.length))
      setSelectedKeys(current => current.filter(selectedKey => selectedKey !== key))
    } catch (requestError) {
      setError(requestError.message || 'Không thể xóa keyword đã lưu.')
    } finally {
      setDeletingKey('')
    }
  }

  const createPlan = () => {
    const seen = new Set()
    const keywords = selectedItems
      .map(item => savedKeywordToTrendKeyword(item))
      .filter(keyword => {
        const key = normalizeKeyword(keyword.keyword)
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })
    if (!keywords.length) return
    onCreatePlan(keywords)
  }

  return (
    <div className="trend-save-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="trend-saved-dialog" role="dialog" aria-modal="true" aria-labelledby="saved-keywords-title">
        <header className="trend-saved-header">
          <div className="trend-modal-title"><span><Bookmark size={17}/></span><div><span className="eyebrow">SAVED KEYWORDS</span><h2 id="saved-keywords-title">Keyword đã lưu</h2></div></div>
          <button className="icon-btn" onClick={onClose} aria-label="Đóng"><X size={18}/></button>
        </header>
        <div className="trend-saved-body">
          <p className="trend-saved-intro">Các keyword được lưu theo folder của workspace, kèm snapshot dữ liệu tại thời điểm lưu.</p>
          {loading && <div className="trend-loading"><LoaderCircle className="spin" size={15}/> Đang tải keyword đã lưu...</div>}
          {!loading && error && <div className="inline-error">{error}</div>}
          {!loading && !error && savedCount === 0 && <div className="trend-saved-empty"><Bookmark size={22}/><b>Chưa có keyword đã lưu</b><small>Hãy tìm trend và bấm Lưu để thêm keyword vào folder.</small></div>}
          {!loading && !error && savedCount > 0 && folders.map(folder => (
            <section className="trend-saved-folder" key={folder.id}>
              <div className="trend-saved-folder-head"><div><FolderOpen size={15}/><b>{folder.name}</b></div><span>{folder.items.length} keyword</span></div>
              <div className="trend-saved-list">
                {folder.items.map(item => {
                  const snapshot = item.keyword.snapshot
                  const period = snapshot?.metadata?.volumePeriod
                  const key = `${folder.id}:${item.keyword.id}`
                  const selected = selectedKeys.includes(key)
                  return <article className={`trend-saved-item ${selected ? 'selected' : ''}`} key={`${folder.id}-${item.keyword.id}`}>
                    <label className="trend-saved-select" title="Chọn keyword để tạo kế hoạch"><input type="checkbox" checked={selected} onChange={() => toggleSelected(key)}/><span /></label>
                    <Bookmark size={17} className="trend-saved-bookmark" fill="currentColor"/>
                    <div className="trend-saved-keyword"><b>{item.keyword.text}</b><small>{item.keyword.intent || 'Chưa xác định ý định'}</small></div>
                    <div className="trend-saved-metrics"><b>{formatSearchVolume(snapshot?.searchVolume, period)}</b><small>{snapshot?.metadata?.volumeSource || 'Chưa có nguồn lượt tìm kiếm'}</small></div>
                    <button className="icon-btn trend-saved-delete" onClick={() => deleteKeyword(folder, item)} disabled={deletingKey === key} aria-label={`Xóa ${item.keyword.text}`} title="Xóa keyword">{deletingKey === key ? <LoaderCircle className="spin" size={15}/> : <Trash2 size={15}/>}</button>
                  </article>
                })}
              </div>
            </section>
          ))}
        </div>
        <footer className="trend-modal-footer"><small>{savedCount} keyword trong {folders.length} folder{selectedItems.length ? ` · Đã chọn ${selectedItems.length}` : ''}</small><div className="trend-modal-footer-actions"><button className="primary-btn" onClick={createPlan} disabled={!selectedItems.length}><CalendarDays size={14}/> Tạo kế hoạch bài viết{selectedItems.length ? ` (${selectedItems.length})` : ''}</button><button className="outline-btn" onClick={onClose}>Đóng</button></div></footer>
      </section>
    </div>
  )
}

function dateAfterToday(days) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function ContentPlanDialog({ workspaceId, keywords, onClose }) {
  const [startDate, setStartDate] = useState(() => dateAfterToday(1))
  const [endDate, setEndDate] = useState(() => dateAfterToday(7))
  const [postCount, setPostCount] = useState(Math.max(3, keywords.length))
  const [platforms, setPlatforms] = useState(['FACEBOOK', 'LINKEDIN'])
  const [pillars, setPillars] = useState(['EDUCATION', 'PRODUCT_SERVICE'])
  const [formats, setFormats] = useState(['TEXT_POST', 'CAROUSEL', 'REEL'])
  const [plan, setPlan] = useState(null)
  const [selectedPostIndexes, setSelectedPostIndexes] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const generate = async () => {
    if (!startDate || !endDate || startDate > endDate) {
      setError('Hãy chọn khoảng ngày hợp lệ.')
      return
    }
    if (!postCount || postCount < 1) {
      setError('Số bài đăng phải lớn hơn 0.')
      return
    }
    if (!platforms.length || !pillars.length || !formats.length) {
      setError('Hãy chọn ít nhất một nền tảng, content pillar và định dạng.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await apiRequest(`/workspaces/${workspaceId}/trends/content-plan`, {
        method: 'POST',
        body: JSON.stringify({
          startDate,
          endDate,
          postCount: Number(postCount),
          platforms,
          pillars,
          formats,
          keywords: keywords.map(keyword => ({
            keyword: keyword.keyword,
            topicName: keyword.topic?.name,
            searchVolume: keyword.searchVolume,
            volumePeriod: keyword.volumePeriod,
            sourceUrls: keyword.sourceUrls || [],
            productMatches: bestProductMatches(keyword.productMatches).map(match => ({
              productId: match.productId,
              productName: match.productName,
              fit: match.fit,
              reason: match.reason,
            })),
          })),
        }),
      })
      setPlan(data)
      setSelectedPostIndexes([])
      setSaved(false)
      setSubmitted(false)
    } catch (requestError) {
      setError(requestError.message || 'Không thể tạo kế hoạch đăng bài.')
    } finally {
      setLoading(false)
    }
  }

  const togglePost = index => {
    setSelectedPostIndexes(current => current.includes(index)
      ? current.filter(item => item !== index)
      : [...current, index])
    setError('')
  }

  const savePlan = async () => {
    if (!plan || !selectedPostIndexes.length) {
      setError('Hãy tick chọn ít nhất một bài đăng trước khi lưu.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const data = await apiRequest(`/workspaces/${workspaceId}/trends/content-plan/save`, {
        method: 'POST',
        body: JSON.stringify({
          startDate: plan.startDate,
          endDate: plan.endDate,
          posts: selectedPostIndexes.map(index => {
            const post = plan.posts[index]
            return {
              date: post.date,
              platform: post.platform,
              pillar: post.pillar,
              contentType: post.contentType,
              format: post.format,
              title: post.title,
              highlight: post.highlight,
              keyword: post.keyword,
              productId: post.productId,
              volume: post.volume,
              volumePeriod: post.volumePeriod,
              ref: post.ref,
            }
          }),
        }),
      })
      setPlan(data)
      setSelectedPostIndexes(data.posts.map((_, index) => index))
      setSaved(true)
      setSubmitted(false)
    } catch (requestError) {
      setError(requestError.message || 'Không thể lưu kế hoạch đăng bài.')
    } finally {
      setSaving(false)
    }
  }

  const submitSavedPlan = async () => {
    if (!plan?.id) return
    setSubmitting(true)
    setError('')
    try {
      await apiRequest(`/workspaces/${workspaceId}/trends/content-plans/${plan.id}/submit`, { method: 'POST' })
      setSubmitted(true)
    } catch (requestError) {
      setError(requestError.message || 'Không thể gửi kế hoạch duyệt.')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleOption = (setter, value) => setter(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value])

  return <div className="content-plan-backdrop" role="presentation">
    <section className={`content-plan-dialog ${plan ? 'has-plan' : ''}`} role="dialog" aria-modal="true" aria-labelledby="content-plan-title">
      <header className="content-plan-header">
        <div className="trend-modal-title"><span><CalendarDays size={17}/></span><div><span className="eyebrow">AI CONTENT CALENDAR</span><h2 id="content-plan-title">Tạo kế hoạch đăng bài</h2></div></div>
        <button className="icon-btn" onClick={onClose} aria-label="Đóng cửa sổ"><X size={18}/></button>
      </header>
      {!plan ? <>
        <div className="content-plan-body">
          <p className="content-plan-intro">AI sẽ dùng các keyword đã chọn, volume hiện có, nguồn tham khảo và kiến thức product của workspace để sắp xếp lịch nội dung.</p>
          <div className="content-plan-selected"><b>{keywords.length} keyword đã chọn</b><div>{keywords.map(keyword => <span key={keyword.keyword}>{keyword.keyword}{bestProductMatches(keyword.productMatches).map(match => <small key={match.productId}>→ {match.productName}</small>)}</span>)}</div></div>
          <div className="content-plan-fields">
            <label><span>Từ ngày</span><input type="date" value={startDate} onChange={event => setStartDate(event.target.value)}/></label>
            <label><span>Đến ngày</span><input type="date" value={endDate} min={startDate} onChange={event => setEndDate(event.target.value)}/></label>
            <label><span>Số bài đăng</span><input type="number" min="1" max="100" value={postCount} onChange={event => setPostCount(event.target.value)}/></label>
          </div>
          <div className="content-plan-option-group"><b>Nền tảng muốn đăng</b><div>{contentPlatforms.map(option => <label key={option.value}><input type="checkbox" checked={platforms.includes(option.value)} onChange={() => toggleOption(setPlatforms, option.value)}/><span>{option.label}</span></label>)}</div></div>
          <div className="content-plan-option-group"><b>Content Pillar</b><div>{contentPillars.map(option => <label key={option.value}><input type="checkbox" checked={pillars.includes(option.value)} onChange={() => toggleOption(setPillars, option.value)}/><span>{option.label}</span></label>)}</div></div>
          <div className="content-plan-option-group"><b>Định dạng</b><div>{contentFormats.map(option => <label key={option.value}><input type="checkbox" checked={formats.includes(option.value)} onChange={() => toggleOption(setFormats, option.value)}/><span>{option.label}</span></label>)}</div></div>
          <div className="content-plan-note"><Sparkles size={15}/><span>Volume trong bảng sẽ lấy đúng từ keyword đã tìm. Nếu keyword không có volume chính thức, bảng sẽ ghi chưa có dữ liệu.</span></div>
          {error && <div className="inline-error">{error}</div>}
        </div>
        <footer className="content-plan-footer"><button className="outline-btn" onClick={onClose}>Hủy</button><button className="primary-btn" onClick={generate} disabled={loading}>{loading ? <LoaderCircle className="spin" size={15}/> : <Sparkles size={15}/>} {loading ? 'Đang tạo kế hoạch...' : 'Tạo kế hoạch bằng AI'}</button></footer>
      </> : <>
        <div className="content-plan-table-wrap">
          <div className="content-plan-result-head"><div><span className="eyebrow">CONTENT PLAN</span><h3>{plan.postCount} bài đăng từ {plan.startDate} đến {plan.endDate}</h3></div><span className="trend-result-count">AI đã tạo</span></div>
          <div className="content-plan-selection-bar"><span>Đã chọn <b>{selectedPostIndexes.length}</b>/{plan.posts.length} bài đăng</span><button className="outline-btn" onClick={() => setSelectedPostIndexes(selectedPostIndexes.length === plan.posts.length ? [] : plan.posts.map((_, index) => index))} disabled={saved}>{selectedPostIndexes.length === plan.posts.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}</button></div>
          <div className="content-plan-table-scroll"><table className="content-plan-table"><thead><tr><th>Chọn</th><th>Ngày</th><th>Nền tảng</th><th>Content Pillar</th><th>Loại nội dung</th><th>Định dạng</th><th>Title</th><th>Highlight nội dung chính</th><th>Keyword</th><th>Product</th><th>Volume</th><th>Ref</th></tr></thead><tbody>{plan.posts.map((post, index) => <tr key={`${post.date}-${post.keyword}-${index}`}><td><input className="content-plan-check" type="checkbox" checked={selectedPostIndexes.includes(index)} onChange={() => togglePost(index)} disabled={saved}/></td><td>{post.date}</td><td>{labelFor(contentPlatforms, post.platform)}</td><td>{labelFor(contentPillars, post.pillar)}</td><td>{post.contentType}</td><td>{labelFor(contentFormats, post.format)}</td><td><b>{post.title}</b></td><td>{post.highlight}</td><td><span className="content-plan-keyword">{post.keyword}</span></td><td><span className="content-plan-product">{post.productName}</span></td><td>{post.volume === null || post.volume === undefined ? 'Chưa có dữ liệu' : `${new Intl.NumberFormat('vi-VN').format(post.volume)} ${post.volumePeriod || ''}`}</td><td>{post.ref?.startsWith('http') ? <a href={post.ref} target="_blank" rel="noreferrer">Nguồn</a> : post.ref}</td></tr>)}</tbody></table></div>
          {saved && <div className="content-plan-saved"><Check size={15}/> Đã lưu {plan.posts.length} bài đăng vào lịch của workspace.</div>}
          {error && <div className="inline-error">{error}</div>}
        </div>
        <footer className="content-plan-footer"><button className="outline-btn" onClick={() => { setPlan(null); setSelectedPostIndexes([]); setSaved(false); setSubmitted(false); setError('') }} disabled={saving || submitting}>Chỉnh lại</button><button className="primary-btn" onClick={saved ? (submitted ? onClose : submitSavedPlan) : savePlan} disabled={saving || submitting || (!saved && !selectedPostIndexes.length)}>{saving ? <LoaderCircle className="spin" size={15}/> : submitted ? <Check size={15}/> : saved ? <Send size={15}/> : <Bookmark size={15}/>} {saving ? 'Đang lưu...' : submitting ? 'Đang gửi duyệt...' : submitted ? 'Đã gửi duyệt' : saved ? 'Gửi duyệt' : `Lưu kế hoạch (${selectedPostIndexes.length})`}</button></footer>
      </>}
    </section>
  </div>
}

function calendarDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function ContentCalendarDialog({ workspaceId, role, onClose, onOpenPlan }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const editable = role === 'ADMIN' || role === 'MARKETER'

  useEffect(() => {
    let mounted = true
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0)
    setLoading(true)
    apiRequest(`/workspaces/${workspaceId}/trends/content-calendar?from=${calendarDateKey(firstDay)}&to=${calendarDateKey(lastDay)}`)
      .then(data => mounted && setPosts(data))
      .catch(requestError => mounted && setError(requestError.message || 'Không thể tải lịch đăng bài.'))
      .finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [workspaceId, month])

  useEffect(() => {
    const handleCalendarPostClick = event => {
      const postElement = event.target.closest?.('.calendar-post')
      if (!postElement || event.target.closest?.('select')) return
      const title = postElement.querySelector('strong')?.textContent
      const post = posts.find(item => item.title === title)
      if (post?.planId) onOpenPlan?.(post.planId)
    }
    document.addEventListener('click', handleCalendarPostClick)
    return () => document.removeEventListener('click', handleCalendarPostClick)
  }, [posts, onOpenPlan])

  const postsByDate = useMemo(() => posts.reduce((groups, post) => {
    groups[post.date] = groups[post.date] || []
    groups[post.date].push(post)
    return groups
  }, {}), [posts])

  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
  const leadingDays = (firstDay.getDay() + 6) % 7
  const totalDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cellCount = Math.ceil((leadingDays + totalDays) / 7) * 7
  const cells = Array.from({ length: cellCount }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index - leadingDays + 1))

  const changeStatus = async (post, status) => {
    setBusy(post.id)
    setError('')
    try {
      const updated = await apiRequest(`/workspaces/${workspaceId}/trends/content-posts/${post.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
      setPosts(current => current.map(item => item.id === updated.id ? updated : item))
    } catch (requestError) {
      setError(requestError.message || 'Không thể cập nhật trạng thái bài đăng.')
    } finally {
      setBusy('')
    }
  }

  return <Dialog.Root open onOpenChange={open => !open && onClose()}>
    <Dialog.Portal>
      <Dialog.Overlay className="content-popup-overlay" />
      <Dialog.Content className="content-calendar-dialog" aria-describedby="content-calendar-description">
        <header className="content-calendar-header"><div className="trend-modal-title"><span><CalendarDays size={17}/></span><div><span className="eyebrow">CONTENT CALENDAR</span><Dialog.Title asChild><h2 id="content-calendar-title">Lịch đăng bài</h2></Dialog.Title><Dialog.Description id="content-calendar-description" className="visually-hidden">Lịch các bài đăng trong workspace.</Dialog.Description></div></div><button className="icon-btn" onClick={onClose} aria-label="Đóng cửa sổ"><X size={18}/></button></header>
       <div className="content-calendar-toolbar"><div className="content-calendar-navigation"><button className="icon-btn" onClick={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))} aria-label="Tháng trước"><ChevronLeft size={17}/></button><button className="icon-btn" onClick={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))} aria-label="Tháng sau"><ChevronRight size={17}/></button></div><h3>{month.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</h3><div className="content-calendar-toolbar-actions"><div className="content-calendar-legend">{contentPostStatuses.slice(0, 3).map(status => <span key={status.value} className={`calendar-status calendar-status-${status.value.toLowerCase()}`}>{status.label}</span>)}</div><button className="content-calendar-date-picker-btn" onClick={() => setDatePickerOpen(true)}><CalendarDays size={14}/> Chọn ngày</button></div></div>
      {error && <div className="inline-error content-calendar-error">{error}</div>}
      {loading ? <div className="data-loading"><LoaderCircle className="spin" size={19}/> Đang tải lịch đăng bài...</div> : <div className="content-calendar-grid-wrap"><div className="content-calendar-weekdays">{['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'].map(day => <span key={day}>{day}</span>)}</div><div className="content-calendar-grid">{cells.map((date, index) => { const dateKey = calendarDateKey(date); const inMonth = date.getMonth() === month.getMonth(); return <div className={`content-calendar-cell ${inMonth ? '' : 'outside'}`} key={`${dateKey}-${index}`}><b>{date.getDate()}</b><div>{(postsByDate[dateKey] || []).map(post => <article className={`calendar-post calendar-post-${post.status.toLowerCase()}`} key={post.id}><strong title={post.title}>{post.title}</strong><small>{labelFor(contentPlatforms, post.platform)} · {labelFor(contentFormats, post.format)}{post.productName ? ` · ${post.productName}` : ''}</small>{editable ? <select value={post.status} disabled={busy === post.id} onChange={event => changeStatus(post, event.target.value)}>{contentPostStatuses.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}</select> : <span className={`calendar-status calendar-status-${post.status.toLowerCase()}`}>{labelFor(contentPostStatuses, post.status)}</span>}</article>)}</div></div>})}</div></div>}
       <footer className="content-calendar-footer"><small>Chọn trạng thái trên từng bài để cập nhật tiến độ đăng.</small><button className="outline-btn" onClick={onClose}>Đóng</button></footer>
      </Dialog.Content>
      <Dialog.Root open={datePickerOpen} onOpenChange={setDatePickerOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="calendar-picker-overlay" />
          <Dialog.Content className="calendar-picker-dialog" aria-describedby="calendar-picker-description">
            <Dialog.Title className="calendar-picker-title">Chọn ngày xem lịch</Dialog.Title>
            <Dialog.Description id="calendar-picker-description" className="calendar-picker-description">Chọn ngày cụ thể để chuyển nhanh đến tháng tương ứng.</Dialog.Description>
            <DayPicker
              mode="single"
              selected={month}
              month={month}
              onMonthChange={nextMonth => setMonth(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1))}
              onSelect={selectedDate => {
                if (!selectedDate) return
                setMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
                setDatePickerOpen(false)
              }}
              captionLayout="dropdown"
              startMonth={new Date(new Date().getFullYear() - 5, 0, 1)}
              endMonth={new Date(new Date().getFullYear() + 5, 11, 31)}
              locale={vi}
              showOutsideDays
            />
            <div className="calendar-picker-actions"><button className="outline-btn" onClick={() => setDatePickerOpen(false)}>Đóng</button></div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Dialog.Portal>
  </Dialog.Root>
}

function planStatusLabel(status) {
  return labelFor(contentPlanStatuses, status)
}

function postReviewStatusLabel(status) {
  return labelFor(contentPostReviewStatuses, status || 'DRAFT')
}

function ContentPlansDialog({ workspaceId, role, userId, onClose, initialPlanId = '', onBackToCalendar }) {
  const [plans, setPlans] = useState([])
  const [facebookPages, setFacebookPages] = useState([])
  const [selectedFacebookPageIds, setSelectedFacebookPageIds] = useState({})
  const [selectedPlanIds, setSelectedPlanIds] = useState([])
  const [selectedPostIds, setSelectedPostIds] = useState([])
  const [selectedReviewPostIds, setSelectedReviewPostIds] = useState([])
  const [expandedPlanId, setExpandedPlanId] = useState(initialPlanId)
  const [editingPostId, setEditingPostId] = useState('')
  const [editDraft, setEditDraft] = useState({ title: '', highlight: '' })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [returnDialog, setReturnDialog] = useState(null)
  const [returnReason, setReturnReason] = useState('')
  const [returnReasonError, setReturnReasonError] = useState('')
  const [returnDialogSubmitting, setReturnDialogSubmitting] = useState(false)
  const [generationDialogOpen, setGenerationDialogOpen] = useState(false)
  const [generationOptions, setGenerationOptions] = useState(defaultContentGenerationOptions)
  const isAdmin = role === 'ADMIN'

  const loadPlans = async () => {
    setLoading(true)
    try {
      const [planData, socialData] = await Promise.all([
        apiRequest(`/workspaces/${workspaceId}/trends/content-plans`),
        apiRequest(`/workspaces/${workspaceId}/integrations/social`),
      ])
      setPlans(planData)
      const pages = socialData.filter(connection => connection.provider === 'FACEBOOK'
        && connection.status === 'CONNECTED'
        && ['OAUTH', 'MANUAL'].includes(connection.connectionMode))
      setFacebookPages(pages)
      setSelectedFacebookPageIds(current => pages.reduce((next, page) => {
        next[page.id] = current[page.id] || page.id
        return next
      }, {}))
      setError('')
    } catch (requestError) {
      setError(requestError.message || 'Không thể tải danh sách kế hoạch.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPlans() }, [workspaceId])
  useEffect(() => {
    if (initialPlanId) setExpandedPlanId(initialPlanId)
  }, [initialPlanId])

  const runAction = async (key, endpoint, options = {}) => {
    setBusy(key)
    setError('')
    try {
      await apiRequest(`/workspaces/${workspaceId}/trends/${endpoint}`, { method: 'POST', ...options })
      await loadPlans()
      setSelectedReviewPostIds([])
      return true
    } catch (requestError) {
      setError(requestError.message || 'Không thể cập nhật kế hoạch.')
      return false
    } finally {
      setBusy('')
    }
  }

  const openReturnDialog = ({ scope, plan = null }) => {
    setReturnDialog({ scope, planId: plan?.id || '', planName: plan?.name || '' })
    setReturnReason(plan?.returnReason || 'Vui lòng rà soát và chỉnh sửa phần được trả về.')
    setReturnReasonError('')
  }

  const closeReturnDialog = (force = false) => {
    if (returnDialogSubmitting && !force) return
    setReturnDialog(null)
    setReturnReason('')
    setReturnReasonError('')
  }

  const returnPlan = plan => openReturnDialog({ scope: 'plan', plan })

  const confirmReturn = async () => {
    if (!returnDialog) return
    const reason = returnReason.trim()
    if (!reason) {
      setReturnReasonError('Hãy nhập lý do để người tạo biết phần nào cần chỉnh sửa.')
      return
    }

    setReturnDialogSubmitting(true)
    const succeeded = returnDialog.scope === 'plan'
      ? await runAction(`return-${returnDialog.planId}`, `content-plans/${returnDialog.planId}/return`, { body: JSON.stringify({ reason }) })
      : await runBulkReviewAction('return', reason)
    setReturnDialogSubmitting(false)
    if (succeeded) closeReturnDialog(true)
  }

  const startEditingPost = post => {
    setEditingPostId(post.id)
    setEditDraft({ title: post.title || '', highlight: post.highlight || '' })
  }

  const savePostEdit = async postId => {
    if (!editDraft.title.trim() || !editDraft.highlight.trim()) {
      setError('Hãy nhập đủ tiêu đề và điểm chính trước khi lưu chỉnh sửa.')
      return
    }
    const saved = await runAction(`edit-${postId}`, `content-posts/${postId}`, {
      method: 'PATCH',
      body: JSON.stringify(editDraft),
    })
    if (saved) setEditingPostId('')
  }

  const reviewablePosts = plan => plan.posts.filter(post => {
    if (post.status === 'PUBLISHED' || post.status === 'CANCELLED') return false
    if (isAdmin) return post.reviewStatus === 'PENDING_APPROVAL'
    return plan.createdBy?.id === userId && ['DRAFT', 'RETURNED'].includes(post.reviewStatus || 'DRAFT')
  })

  const toggleReviewPlan = plan => {
    const ids = reviewablePosts(plan).map(post => post.id)
    if (!ids.length) return
    setSelectedReviewPostIds(current => ids.every(id => current.includes(id))
      ? current.filter(id => !ids.includes(id))
      : [...new Set([...current, ...ids])])
  }

  const toggleReviewPost = postId => setSelectedReviewPostIds(current => current.includes(postId)
    ? current.filter(id => id !== postId)
    : [...current, postId])

  const runBulkReviewAction = async (action, submittedReason = '') => {
    if (!selectedReviewPostIds.length) return
    const reason = submittedReason.trim()
    if (action === 'return' && !reason) {
      openReturnDialog({ scope: 'posts' })
      return false
    }
    const grouped = plans.reduce((groups, plan) => {
      const postIds = plan.posts.filter(post => selectedReviewPostIds.includes(post.id)).map(post => post.id)
      if (postIds.length) groups.push({ plan, postIds })
      return groups
    }, [])
    setBusy(`bulk-review-${action}`)
    setError('')
    try {
      for (const { plan, postIds } of grouped) {
        const endpoint = action === 'submit' ? 'submit' : action === 'approve' ? 'approve' : 'return'
        await apiRequest(`/workspaces/${workspaceId}/trends/content-plans/${plan.id}/${endpoint}`, {
          method: 'POST',
          body: JSON.stringify({ postIds, ...(action === 'return' ? { reason } : {}) }),
        })
      }
      setSelectedReviewPostIds([])
      await loadPlans()
      return true
    } catch (requestError) {
      setError(requestError.message || 'Không thể cập nhật luồng duyệt.')
      return false
    } finally {
      setBusy('')
    }
  }

  const selectablePlans = plans.filter(plan => ['APPROVED', 'ACTIVE'].includes(plan.status) && plan.posts.some(post => post.status !== 'PUBLISHED' && post.reviewStatus === 'APPROVED'))
  const togglePlanSelection = planOrId => {
    const plan = typeof planOrId === 'string' ? selectablePlans.find(item => item.id === planOrId) : planOrId
    if (!plan) return
    setSelectedPlanIds(current => current.includes(plan.id)
      ? current.filter(id => id !== plan.id)
      : [...current, plan.id])
    setSelectedPostIds(current => current.filter(postId => !plan.posts.some(post => post.id === postId)))
  }
  const togglePostSelection = postId => {
    setSelectedPostIds(current => current.includes(postId)
      ? current.filter(id => id !== postId)
      : [...current, postId])
  }
  const toggleAllPlans = () => {
    setSelectedPlanIds(selectedPlanIds.length === selectablePlans.length ? [] : selectablePlans.map(plan => plan.id))
    setSelectedPostIds([])
  }

  const selectedPostCount = selectablePlans.reduce((count, plan) => {
    const eligiblePosts = plan.posts.filter(post => post.status !== 'PUBLISHED' && post.reviewStatus === 'APPROVED')
    if (selectedPlanIds.includes(plan.id)) return count + eligiblePosts.length
    return count + eligiblePosts.filter(post => selectedPostIds.includes(post.id)).length
  }, 0)

  const generateSelectedPlans = async (options = generationOptions) => {
    const selectedPlans = selectablePlans.map(plan => {
      const eligiblePostIds = plan.posts.filter(post => post.status !== 'PUBLISHED' && post.reviewStatus === 'APPROVED').map(post => post.id)
      const postIds = selectedPlanIds.includes(plan.id)
        ? eligiblePostIds
        : eligiblePostIds.filter(postId => selectedPostIds.includes(postId))
      return { plan, postIds }
    }).filter(item => item.postIds.length)
    if (!selectedPlans.length) return
    setBusy('bulk-generate')
    setError('')
    try {
      const failures = []
      for (const { plan, postIds } of selectedPlans) {
        try {
          await apiRequest(`/workspaces/${workspaceId}/trends/content-plans/${plan.id}/generate-content`, {
            method: 'POST',
            body: JSON.stringify({ postIds, ...options }),
          })
        } catch (requestError) {
          failures.push(`${plan.name || plan.startDate}: ${requestError.message}`)
        }
      }
      setSelectedPlanIds([])
      setSelectedPostIds([])
      await loadPlans()
      if (failures.length) setError(`Một số kế hoạch chưa tạo được nội dung: ${failures.join(' | ')}`)
      return failures.length === 0
    } finally {
      setBusy('')
    }
  }

  const openGenerationDialog = () => {
    if (selectedPostCount) setGenerationDialogOpen(true)
  }

  const confirmGeneration = async () => {
    if (!selectedPostCount || busy === 'bulk-generate') return
    setGenerationDialogOpen(false)
    await generateSelectedPlans(generationOptions)
  }

  const facebookPage = facebookPages[0] || null
  const facebookPageUrl = facebookPage?.publicPageUrl || facebookPage?.settings?.publicPageUrl || ''

  return <Dialog.Root open onOpenChange={open => !open && onClose()}>
    <Dialog.Portal>
      <Dialog.Overlay className="content-popup-overlay" />
      <Dialog.Content className="content-plans-dialog" aria-describedby="content-plans-description">
        <header className="content-calendar-header"><div className="trend-modal-title"><span><FileText size={17}/></span><div><span className="eyebrow">CONTENT PLANS</span><Dialog.Title asChild><h2 id="content-plans-title">Kế hoạch</h2></Dialog.Title><Dialog.Description id="content-plans-description" className="visually-hidden">Danh sách kế hoạch và các bài đăng trong workspace.</Dialog.Description></div></div><button className="icon-btn" onClick={onClose} aria-label="Đóng"><X size={18}/></button></header>
      <div className="content-plans-toolbar">
        <div className={`content-plan-facebook-target ${facebookPage ? 'connected' : ''}`}><Facebook size={15}/><span><b>{facebookPages.length > 1 ? `${facebookPages.length} Fanpage có quyền đăng bài` : facebookPage ? `Fanpage đăng bài: ${facebookPage.externalAccountName || 'Facebook Page'}` : 'Chưa kết nối Fanpage Facebook'}</b><small>{facebookPageUrl || (facebookPage ? 'Có thể chọn Fanpage cụ thể ngay trên từng bài đăng.' : 'Hãy kết nối Fanpage trong phần Tích hợp trước khi đăng bài.')}</small></span></div>
         <div className="content-plans-bulk-actions">
           {isAdmin
             ? <><button className="primary-btn" onClick={() => runBulkReviewAction('approve')} disabled={!selectedReviewPostIds.length || busy === 'bulk-review-approve'}><ShieldCheck size={14}/> Duyệt phần đã chọn ({selectedReviewPostIds.length})</button><button className="danger-outline-btn" onClick={() => openReturnDialog({ scope: 'posts' })} disabled={!selectedReviewPostIds.length || busy === 'bulk-review-return'}>Trả phần đã chọn ({selectedReviewPostIds.length})</button></>
             : <button className="primary-btn" onClick={() => runBulkReviewAction('submit')} disabled={!selectedReviewPostIds.length || busy === 'bulk-review-submit'}><Send size={14}/> Gửi phần đã chọn ({selectedReviewPostIds.length})</button>}
           <button className="outline-btn" onClick={toggleAllPlans} disabled={!selectablePlans.length}>{selectedPlanIds.length === selectablePlans.length && selectablePlans.length ? 'Bỏ chọn tất cả' : 'Chọn kế hoạch đã duyệt'}</button><button className="primary-btn" onClick={openGenerationDialog} disabled={!selectedPostCount || busy === 'bulk-generate'}><Sparkles size={14}/> {busy === 'bulk-generate' ? `Đang tạo nội dung (${selectedPostCount})...` : `Tạo / tạo lại nội dung (${selectedPostCount})`}</button>
         </div>
      </div>
      {error && <div className="inline-error content-calendar-error">{error}</div>}
      {onBackToCalendar && <div className="content-plan-back-calendar-row"><button className="outline-btn content-plan-back-calendar-btn" onClick={onBackToCalendar}><CalendarDays size={14}/> Quay lại lịch đăng bài</button></div>}
      <div className="content-plans-body">
        {loading && <div className="data-loading"><LoaderCircle className="spin" size={19}/> Đang tải kế hoạch...</div>}
        {!loading && !plans.length && <div className="content-plan-empty"><FileText size={24}/><b>Chưa có kế hoạch</b><small>Lưu kế hoạch từ kết quả trend, sau đó gửi Admin duyệt.</small></div>}
        {!loading && plans.map(plan => {
          const expanded = expandedPlanId === plan.id
          const reviewable = reviewablePosts(plan)
          const allReviewSelected = reviewable.length > 0 && reviewable.every(post => selectedReviewPostIds.includes(post.id))
          const canSubmit = plan.createdBy?.id === userId && ['DRAFT', 'RETURNED', 'ACTIVE', 'PENDING_APPROVAL'].includes(plan.status) && reviewable.length > 0
          const canGenerate = ['APPROVED', 'ACTIVE'].includes(plan.status)
          const needsContent = plan.posts.some(post => post.status === 'PLANNED' || !post.contentBody)
          const selectable = canGenerate && plan.posts.some(post => post.status !== 'PUBLISHED' && post.reviewStatus === 'APPROVED')
          return <article className="content-plan-card" key={plan.id}>
            <header><div className="content-plan-card-title">{selectable && <input className="content-plan-select" type="checkbox" checked={selectedPlanIds.includes(plan.id)} onChange={() => togglePlanSelection(plan.id)} aria-label={`Chọn kế hoạch ${plan.startDate} để tạo nội dung`}/>} {reviewable.length > 0 && <input className="content-plan-review-select" type="checkbox" checked={allReviewSelected} onChange={() => toggleReviewPlan(plan)} aria-label={`Chọn phần duyệt của kế hoạch ${plan.startDate}`}/>}<div><span className="eyebrow">{plan.startDate} → {plan.endDate}</span><h3>{plan.name || `Kế hoạch ${plan.startDate}`}</h3><small>Tạo bởi {plan.createdBy?.name || 'Thành viên'} · {plan.posts.length} bài</small></div></div><span className={`content-plan-status content-plan-status-${plan.status.toLowerCase()}`}>{planStatusLabel(plan.status)}</span></header>
            {plan.status === 'RETURNED' && <div className="content-plan-return-reason"><b>Lý do trả về:</b> {plan.returnReason || 'Vui lòng chỉnh sửa kế hoạch.'}</div>}
            <div className="content-plan-card-actions">
              <button className="outline-btn" onClick={() => setExpandedPlanId(expanded ? '' : plan.id)}>{expanded ? 'Thu gọn' : 'Xem bài viết'}</button>
              {canSubmit && <button className="primary-btn" onClick={() => runAction(`submit-${plan.id}`, `content-plans/${plan.id}/submit`)} disabled={busy === `submit-${plan.id}`}><Send size={14}/> {busy === `submit-${plan.id}` ? 'Đang gửi...' : 'Gửi duyệt'}</button>}
              {isAdmin && plan.status === 'PENDING_APPROVAL' && <><button className="primary-btn" onClick={() => runAction(`approve-${plan.id}`, `content-plans/${plan.id}/approve`)} disabled={busy === `approve-${plan.id}`}><ShieldCheck size={14}/> Duyệt</button><button className="danger-outline-btn" onClick={() => returnPlan(plan)} disabled={busy === `return-${plan.id}`}>Trả về</button></>}
              {selectable && <small className="content-plan-select-hint">{needsContent ? 'Tick để tạo nội dung' : 'Đã có nội dung · tick để tạo lại'}</small>}
              {canGenerate && !needsContent && <span className="content-plan-content-ready"><Check size={13}/> Đã tạo nội dung</span>}
            </div>
            {expanded && <div className="content-plan-post-list">{plan.posts.map(post => {
              const postSelectable = canGenerate && post.status !== 'PUBLISHED' && post.reviewStatus === 'APPROVED'
              const reviewSelectable = reviewable.some(item => item.id === post.id)
              const postSelected = selectedPlanIds.includes(plan.id) || selectedPostIds.includes(post.id)
              const reviewSelected = selectedReviewPostIds.includes(post.id)
              const canEditPost = !isAdmin && ['DRAFT', 'RETURNED'].includes(post.reviewStatus || 'DRAFT') && post.status !== 'PUBLISHED'
              return <article className={`content-plan-post-card ${postSelected ? 'selected' : ''} ${reviewSelected ? 'review-selected' : ''}`} key={post.id}>
                <div className="content-plan-post-meta">
                  {postSelectable && <input className="content-plan-post-select" type="checkbox" checked={postSelected} disabled={selectedPlanIds.includes(plan.id)} onChange={() => togglePostSelection(post.id)} aria-label={`Chọn keyword ${post.keyword} để tạo nội dung`}/>} {reviewSelectable && <input className="content-plan-review-post-select" type="checkbox" checked={reviewSelected} onChange={() => toggleReviewPost(post.id)} aria-label={`Chọn keyword ${post.keyword} để duyệt`}/>}<span>{post.date}</span><b>{labelFor(contentPlatforms, post.platform)}</b><em>{post.productName || 'Chưa gắn product'}</em><small>{labelFor(contentPostStatuses, post.status)}</small><small className={`content-plan-review-status content-plan-review-status-${(post.reviewStatus || 'DRAFT').toLowerCase()}`}>{postReviewStatusLabel(post.reviewStatus)}</small>
                </div>
                {editingPostId === post.id ? <div className="content-plan-post-edit-form"><label><span>Tiêu đề</span><input value={editDraft.title} onChange={event => setEditDraft(current => ({ ...current, title: event.target.value }))} maxLength={220}/></label><label><span>Điểm chính</span><textarea value={editDraft.highlight} onChange={event => setEditDraft(current => ({ ...current, highlight: event.target.value }))} maxLength={700} rows={3}/></label><div><button className="primary-btn" onClick={() => savePostEdit(post.id)} disabled={busy === `edit-${post.id}`}>{busy === `edit-${post.id}` ? 'Đang lưu...' : 'Lưu chỉnh sửa'}</button><button className="outline-btn" onClick={() => setEditingPostId('')} disabled={busy === `edit-${post.id}`}>Hủy</button></div></div> : <><h4>{post.title}</h4><p className="content-plan-post-keyword">{post.keyword} · {labelFor(contentFormats, post.format)}</p>{canEditPost && <button className="outline-btn content-plan-edit-btn" onClick={() => startEditingPost(post)}><Pencil size={13}/> Chỉnh sửa bài</button>}</>}
                {post.contentBody ? <div className="content-plan-post-body">{post.contentBody}</div> : <p className="content-plan-post-empty">Chưa có nội dung. Chỉ có thể tạo nội dung sau khi kế hoạch được duyệt.</p>}
                {post.reviewReason && <p className="content-plan-post-review-reason"><b>Phản hồi duyệt:</b> {post.reviewReason}</p>}
                {post.platform === 'FACEBOOK' && post.contentBody && post.status !== 'PUBLISHED' && <div className="content-plan-facebook-publish">
                  {facebookPages.length > 1 && <Select value={selectedFacebookPageIds[post.id] || facebookPages[0]?.id || ''} onValueChange={value => setSelectedFacebookPageIds(current => ({ ...current, [post.id]: value }))}>
                    <SelectTrigger aria-label="Chọn Fanpage đăng bài"><SelectValue placeholder="Chọn Fanpage đăng bài"/></SelectTrigger>
                    <SelectContent>{facebookPages.map(page => <SelectItem key={page.id} value={page.id}>{page.externalAccountName || page.externalAccountId || 'Facebook Page'}</SelectItem>)}</SelectContent>
                  </Select>}
                  <button className="outline-btn content-plan-facebook-btn" onClick={() => runAction(`publish-${post.id}`, `content-posts/${post.id}/publish-facebook`, { body: JSON.stringify({ integrationId: selectedFacebookPageIds[post.id] || facebookPages[0]?.id }) })} disabled={busy === `publish-${post.id}` || !facebookPages.length}><Facebook size={14}/> {busy === `publish-${post.id}` ? 'Đang đăng...' : 'Đăng Facebook'}</button>
                  {!facebookPages.length && <small className="content-plan-publish-error">Hãy kết nối Fanpage có Page Access Token trước khi đăng bài.</small>}
                </div>}
                {post.publishedUrl && <a className="content-plan-published-link" href={post.publishedUrl} target="_blank" rel="noreferrer">Xem bài đã đăng</a>}
                {post.publishError && <small className="content-plan-publish-error">{post.publishError}</small>}
              </article>
            })}</div>}
          </article>
        })}
      </div>
       <footer className="content-calendar-footer"><small>Quy trình: Lưu nháp → chọn cả kế hoạch hoặc từng bài để gửi duyệt → Admin duyệt/trả về → chỉnh sửa nếu cần → Tạo nội dung → Đăng Facebook.</small><button className="outline-btn" onClick={onClose}>Đóng</button></footer>
       </Dialog.Content>
    <Dialog.Root open={Boolean(returnDialog)} onOpenChange={open => !open && closeReturnDialog()}>
      <Dialog.Portal>
        <Dialog.Overlay className="review-return-dialog-overlay" />
        <Dialog.Content className="review-return-dialog-content" aria-describedby="review-return-dialog-description">
          <Dialog.Title className="review-return-dialog-title">Trả {returnDialog?.scope === 'plan' ? 'kế hoạch' : 'phần nội dung'} về chỉnh sửa</Dialog.Title>
          <Dialog.Description id="review-return-dialog-description" className="review-return-dialog-description">
            {returnDialog?.scope === 'plan' && returnDialog.planName ? `Kế hoạch: ${returnDialog.planName}` : 'Nêu rõ lý do để người tạo biết nội dung cần rà soát.'}
          </Dialog.Description>
          <label className="review-return-dialog-field">
            <span>Lý do trả về</span>
            <textarea value={returnReason} onChange={event => { setReturnReason(event.target.value); setReturnReasonError('') }} rows={5} maxLength={500} autoFocus placeholder="Ví dụ: Bổ sung nguồn, chỉnh lại thông điệp hoặc chọn đúng sản phẩm phù hợp." />
            <small>{returnReason.length}/500</small>
          </label>
          {returnReasonError && <p className="review-return-dialog-error" role="alert">{returnReasonError}</p>}
          <div className="review-return-dialog-actions">
            <button className="outline-btn" onClick={closeReturnDialog} disabled={returnDialogSubmitting}>Hủy</button>
            <button className="danger-outline-btn" onClick={confirmReturn} disabled={returnDialogSubmitting}>{returnDialogSubmitting ? 'Đang cập nhật...' : 'Xác nhận trả về'}</button>
           </div>
         </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    <Dialog.Root open={generationDialogOpen} onOpenChange={open => { if (!open && busy !== 'bulk-generate') setGenerationDialogOpen(false) }}>
      <Dialog.Portal>
        <Dialog.Overlay className="review-return-dialog-overlay" />
        <Dialog.Content className="content-generation-dialog-content" aria-describedby="content-generation-dialog-description">
          <Dialog.Title className="content-generation-dialog-title">Cấu hình AI tạo nội dung</Dialog.Title>
          <Dialog.Description id="content-generation-dialog-description" className="content-generation-dialog-description">
            Áp dụng cho {selectedPostCount} bài đã chọn. Các lựa chọn này sẽ được truyền vào AI cùng Brand Voice và tài liệu product.
          </Dialog.Description>
          <div className="content-generation-grid">
            <label className="content-generation-field">
              <span>Tông giọng (Brand Voice)</span>
              <Select value={generationOptions.tone} onValueChange={value => setGenerationOptions(current => ({ ...current, tone: value }))}>
                <SelectTrigger className="content-generation-select-trigger"><SelectValue /></SelectTrigger>
                <SelectContent className="content-generation-select-content">{contentGenerationTones.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
              </Select>
              <small>{contentGenerationTones.find(option => option.value === generationOptions.tone)?.help}</small>
            </label>
            <label className="content-generation-field">
              <span>Mục tiêu nội dung</span>
              <Select value={generationOptions.seoMode} onValueChange={value => setGenerationOptions(current => ({ ...current, seoMode: value }))}>
                <SelectTrigger className="content-generation-select-trigger"><SelectValue /></SelectTrigger>
                <SelectContent className="content-generation-select-content">{contentGenerationSeoModes.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
              </Select>
              <small>{contentGenerationSeoModes.find(option => option.value === generationOptions.seoMode)?.help}</small>
            </label>
            <label className="content-generation-field">
              <span>Độ dài bài viết</span>
              <Select value={generationOptions.contentLength} onValueChange={value => setGenerationOptions(current => ({ ...current, contentLength: value }))}>
                <SelectTrigger className="content-generation-select-trigger"><SelectValue /></SelectTrigger>
                <SelectContent className="content-generation-select-content">{contentGenerationLengths.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
              </Select>
              <small>{contentGenerationLengths.find(option => option.value === generationOptions.contentLength)?.help}</small>
            </label>
            <label className="content-generation-field">
              <span>Call to action</span>
              <Select value={generationOptions.ctaStyle} onValueChange={value => setGenerationOptions(current => ({ ...current, ctaStyle: value }))}>
                <SelectTrigger className="content-generation-select-trigger"><SelectValue /></SelectTrigger>
                <SelectContent className="content-generation-select-content">{contentGenerationCtaStyles.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
              </Select>
              <small>{contentGenerationCtaStyles.find(option => option.value === generationOptions.ctaStyle)?.help}</small>
            </label>
          </div>
          <div className="content-generation-dialog-actions">
            <button className="outline-btn" onClick={() => setGenerationDialogOpen(false)} disabled={busy === 'bulk-generate'}>Hủy</button>
            <button className="primary-btn" onClick={confirmGeneration} disabled={busy === 'bulk-generate'}><Sparkles size={14}/> Bắt đầu tạo nội dung</button>
          </div>
       </Dialog.Content>
      </Dialog.Portal>
      </Dialog.Root>
    </Dialog.Portal>
  </Dialog.Root>
}

function TrendSearchModal({ workspaceId, role, topics, topicsLoading, topicsError, trendState, onTrendStateChange, onClose }) {
  const [selectedIndustry, setSelectedIndustry] = useState(trendState.selectedIndustry)
  const [selectedTopicIds, setSelectedTopicIds] = useState(trendState.selectedTopicIds)
  const [results, setResults] = useState(trendState.results)
  const [summary, setSummary] = useState(trendState.summary)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [saveTarget, setSaveTarget] = useState(null)
  const [savedKeywords, setSavedKeywords] = useState({})
  const [selectedKeywords, setSelectedKeywords] = useState(trendState.selectedKeywords)
  const [sortMode, setSortMode] = useState(trendState.sortMode)
  const [contentPlanOpen, setContentPlanOpen] = useState(false)
  const searchControllerRef = useRef(null)
  const canSearch = role === 'ADMIN' || role === 'MARKETER'

  useEffect(() => {
    onTrendStateChange({
      selectedIndustry,
      selectedTopicIds,
      results,
      summary,
      selectedKeywords,
      sortMode,
    })
  }, [onTrendStateChange, results, selectedIndustry, selectedKeywords, selectedTopicIds, sortMode, summary])

  useEffect(() => () => {
    searchControllerRef.current?.abort()
  }, [])

  useEffect(() => {
    let mounted = true
    apiRequest(`/workspaces/${workspaceId}/trends/saved`)
      .then(folders => {
        if (!mounted) return
        const saved = {}
        folders.forEach(folder => folder.items.forEach(item => {
          saved[normalizeKeyword(item.keyword.text)] = folder.name
        }))
        setSavedKeywords(saved)
      })
      .catch(() => {})
    return () => { mounted = false }
  }, [workspaceId])

  const selectedTopics = useMemo(
    () => topics.filter(topic => selectedTopicIds.includes(topic.id)),
    [selectedTopicIds, topics],
  )

  const industries = useMemo(() => {
    const seen = new Set()
    return topics.reduce((values, topic) => {
      if (topic.industry && !seen.has(topic.industry)) {
        seen.add(topic.industry)
        values.push(topic.industry)
      }
      return values
    }, [])
  }, [topics])

  const visibleTopics = useMemo(
    () => selectedIndustry ? topics.filter(topic => topic.industry === selectedIndustry) : [],
    [selectedIndustry, topics],
  )

  const changeIndustry = value => {
    setSelectedIndustry(value)
    setSelectedTopicIds([])
    setError('')
    setResults(null)
    setSummary('')
    setSelectedKeywords([])
  }

  const toggleTopic = topicId => {
    setSelectedTopicIds(current => current.includes(topicId)
      ? current.filter(id => id !== topicId)
      : [...current, topicId])
    setError('')
    setResults(null)
    setSummary('')
    setSelectedKeywords([])
  }

  const toggleKeyword = keyword => {
    const key = normalizeKeyword(keyword.keyword)
    setSelectedKeywords(current => current.some(item => normalizeKeyword(item.keyword) === key)
      ? current.filter(item => normalizeKeyword(item.keyword) !== key)
      : [...current, keyword])
  }

  const sortedResults = useMemo(() => {
    if (!results) return []
    return [...results].sort((a, b) => {
      const relevanceDiff = keywordRelevance(b) - keywordRelevance(a)
      const trendDiff = (Number(b.trendScore) || 0) - (Number(a.trendScore) || 0)
      const volumeDiff = (Number(b.searchVolume) || 0) - (Number(a.searchVolume) || 0)

      if (sortMode === 'TREND') return trendDiff || relevanceDiff || volumeDiff
      if (sortMode === 'VOLUME') return volumeDiff || relevanceDiff || trendDiff
      return relevanceDiff || trendDiff || volumeDiff
    })
  }, [results, sortMode])

  const searchTrends = async () => {
    if (!selectedTopicIds.length) {
      setError('Hãy chọn ít nhất một chủ đề trước khi tìm trend.')
      return
    }
    if (!canSearch) {
      setError('Vai trò hiện tại không có quyền tìm trend bằng AI.')
      return
    }

    searchControllerRef.current?.abort()
    const controller = new AbortController()
    searchControllerRef.current = controller
    setSearching(true)
    setError('')
    setSelectedKeywords([])
    try {
      const data = await apiRequest(`/workspaces/${workspaceId}/trends/search`, {
        method: 'POST',
        body: JSON.stringify({ topicIds: selectedTopicIds }),
        signal: controller.signal,
      })
      if (controller.signal.aborted) return
      setSummary(data.summary || '')
      setResults(data.keywords || [])
    } catch (requestError) {
      setError(requestError.message || 'Không thể tìm trend lúc này.')
    } finally {
      if (searchControllerRef.current === controller) {
        searchControllerRef.current = null
        setSearching(false)
      }
    }
  }

  const cancelSearch = () => {
    searchControllerRef.current?.abort()
    searchControllerRef.current = null
    setSearching(false)
    setError('Đã hủy tìm trend.')
  }

  const closeModal = () => {
    searchControllerRef.current?.abort()
    searchControllerRef.current = null
    onClose()
  }

  const markSaved = result => {
    setSavedKeywords(current => ({ ...current, [normalizeKeyword(result.keyword.text)]: result.folder.name }))
    setSaveTarget(null)
  }

  return (
    <div className="trend-modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && closeModal()}>
      <section className="trend-modal" role="dialog" aria-modal="true" aria-labelledby="trend-modal-title">
        <header className="trend-modal-header">
          <div className="trend-modal-title">
            <span><Sparkles size={17}/></span>
            <div>
              <span className="eyebrow">AI TREND RESEARCH</span>
              <h2 id="trend-modal-title">Tìm trend cho kế hoạch tuần</h2>
            </div>
          </div>
          <button className="icon-btn" onClick={closeModal} aria-label="Đóng cửa sổ"><X size={18}/></button>
        </header>

        <div className="trend-modal-body">
          <div className="trend-modal-intro">
            <p>Chọn một hoặc nhiều chủ đề để Milo tìm các từ khóa đang được quan tâm trên Google Search và Google Trends.</p>
            <small>Chỉ hiển thị lượt tìm kiếm khi nguồn công bố rõ số liệu và kỳ thống kê; hệ thống không tự ước lượng khi thiếu dữ liệu.</small>
          </div>

          <div className="trend-topic-section">
            <div className="trend-section-head">
              <div><b>Chủ đề tìm kiếm</b><small>{selectedTopics.length} chủ đề đã chọn</small></div>
              {selectedTopics.length > 0 && <button className="trend-clear-btn" onClick={() => setSelectedTopicIds([])}>Bỏ chọn</button>}
            </div>
            {topicsLoading && <div className="trend-loading"><LoaderCircle className="spin" size={15}/> Đang tải danh sách chủ đề...</div>}
            {!topicsLoading && topicsError && <div className="inline-error">{topicsError}</div>}
            <div className="trend-industry-picker">
              <label htmlFor="trend-industry">Lĩnh vực tìm kiếm</label>
              <Select value={selectedIndustry} onValueChange={changeIndustry} disabled={topicsLoading || Boolean(topicsError)}>
                <SelectTrigger id="trend-industry" aria-label="Lĩnh vực tìm kiếm">
                  <SelectValue placeholder="Chọn lĩnh vực trước"/>
                </SelectTrigger>
                <SelectContent>
                  {industries.map(industry => <SelectItem key={industry} value={industry}>{industry}</SelectItem>)}
                </SelectContent>
              </Select>
              <small>Chọn lĩnh vực để hiển thị các chủ đề phù hợp.</small>
            </div>
            {!topicsLoading && !topicsError && !selectedIndustry && (
              <div className="trend-topic-empty">Hãy chọn một lĩnh vực để bắt đầu chọn chủ đề.</div>
            )}
            {!topicsLoading && !topicsError && selectedIndustry && (
              <div className="trend-topic-grid">
                {visibleTopics.map(topic => {
                  const selected = selectedTopicIds.includes(topic.id)
                  return <button key={topic.id} className={`trend-topic-option ${selected ? 'selected' : ''}`} onClick={() => toggleTopic(topic.id)}>
                    <span className="trend-topic-check">{selected && <Check size={13}/>}</span>
                    <span><b>{topic.name}</b><small>{topic.description}</small></span>
                  </button>
                })}
              </div>
            )}
          </div>

          {error && <div className="inline-error trend-modal-error">{error}</div>}

          <div className="trend-search-actions">
            <button className="primary-btn trend-search-btn" onClick={searchTrends} disabled={searching || topicsLoading || !selectedTopicIds.length || !canSearch}>
              {searching ? <LoaderCircle className="spin" size={15}/> : <Search size={15}/>} {searching ? 'Đang tìm trên Google...' : 'Tìm kiếm trend'}
            </button>
            {searching && <button className="outline-btn trend-cancel-btn" onClick={cancelSearch}><X size={15}/> Hủy tìm</button>}
          </div>

          {results && (
            <div className="trend-results">
              <div className="trend-results-head">
                <label className="trend-sort-control">
                  <span>S&#x1eaf;p x&#x1ebf;p</span>
                  <select value={sortMode} onChange={event => setSortMode(event.target.value)} aria-label="S&#x1eaf;p x&#x1ebf;p k&#x1ebf;t qu&#x1ea3; keyword">
                    <option value="RELEVANCE">Ph&#x00f9; h&#x1ee3;p nh&#x1ea5;t</option>
                    <option value="TREND">Trend score cao nh&#x1ea5;t</option>
                    <option value="VOLUME">L&#x1b0;&#x1ee3;t t&#x00ec;m ki&#x1ebf;m cao nh&#x1ea5;t</option>
                  </select>
                </label>
                <div><span className="eyebrow">TOP 20 KEYWORD</span><h3>Kết quả nổi bật</h3></div>
                <div className="trend-results-actions"><span className="trend-result-count">{results.length}/20</span></div>
              </div>
              {summary && <p className="trend-summary">{summary}</p>}
              <div className="trend-result-list">
                {sortedResults.map((item, index) => {
                  const relevantProductMatches = bestProductMatches(item.productMatches)
                  const selected = selectedKeywords.some(keyword => normalizeKeyword(keyword.keyword) === normalizeKeyword(item.keyword))
                  return <article className={`trend-result-item ${selected ? 'selected' : ''}`} key={`${item.keyword}-${index}`}>
                    <label className="trend-keyword-select" title={relevantProductMatches.length ? 'Chọn keyword để tạo kế hoạch' : 'Keyword này chưa phù hợp với sản phẩm nào'}><input type="checkbox" checked={selected} onChange={() => toggleKeyword(item)} disabled={!relevantProductMatches.length}/><span className="trend-rank">{String(index + 1).padStart(2, '0')}</span></label>
                    <div className="trend-result-content">
                      <div className="trend-result-labels"><span>{item.topic?.name}</span><em>{item.trendType}</em></div>
                      <h4>{item.keyword}</h4>
                      <div className="trend-product-matches">
                        <span className="trend-product-match-heading">Đối chiếu sản phẩm</span>
                        {relevantProductMatches.length ? relevantProductMatches.map(match => <span key={match.productId} className={`trend-product-fit trend-product-fit-${match.fit.toLowerCase()}`} title={match.reason}><b>{productFitLabel(match.fit)}</b> {match.productName}</span>) : <small>Không phù hợp với các sản phẩm hiện tại</small>}
                      </div>
                      <p>{item.reason}</p>
                      <small>Ý định: {item.intent}</small>
                      <div className="trend-result-volume"><span>Lượt tìm kiếm</span><b>{formatVolume(item.searchVolume, item.volumePeriod)}</b>{item.volumeSource && <small>{item.volumeSource}</small>}</div>
                      <div className="trend-result-sources">
                        {(item.sourceUrls || []).map((url, sourceIndex) => <a key={`${url}-${sourceIndex}`} href={url} target="_blank" rel="noreferrer"><ExternalLink size={10}/> Nguồn {sourceIndex + 1}</a>)}
                      </div>
                    </div>
                    <div className="trend-result-actions">{savedKeywords[normalizeKeyword(item.keyword)] ? <span className="trend-saved-label" title={`Đã lưu trong folder ${savedKeywords[normalizeKeyword(item.keyword)]}`}><Bookmark size={12} fill="currentColor"/> Đã lưu</span> : <button className="trend-save-btn" onClick={() => setSaveTarget(item)}><Bookmark size={12}/> Lưu</button>}<div className="trend-score"><span className="trend-score-label">{formatSearchVolume(item.searchVolume, item.volumePeriod)}</span><small>{item.volumeSource || 'Chưa có nguồn lượt tìm kiếm chính thức'}</small></div></div>
                  </article>
                })}
              </div>
            </div>
          )}
        </div>
        <footer className="trend-modal-footer">
          <small>{results ? 'Bạn có thể cuộn trong phần kết quả để xem đủ 20 keyword.' : 'Chọn chủ đề trước khi bắt đầu tìm kiếm.'}</small>
          <div className="trend-modal-footer-actions">
            <button className="primary-btn trend-footer-create-plan-btn" onClick={() => setContentPlanOpen(true)} disabled={!selectedKeywords.length}><CalendarDays size={14}/> Tạo kế hoạch đăng bài{selectedKeywords.length ? ` (${selectedKeywords.length})` : ''}</button>
            <button className="outline-btn" onClick={closeModal}>Đóng</button>
          </div>
        </footer>
      </section>
      {saveTarget && <SaveKeywordDialog workspaceId={workspaceId} keyword={saveTarget} onClose={() => setSaveTarget(null)} onSaved={markSaved}/>} 
      {contentPlanOpen && <ContentPlanDialog workspaceId={workspaceId} keywords={selectedKeywords} onClose={() => setContentPlanOpen(false)}/>} 
    </div>
  )
}

export default function WeeklyPlanView({ workspaceId, role, userId }) {
  const [topics, setTopics] = useState([])
  const [topicsLoading, setTopicsLoading] = useState(true)
  const [topicsError, setTopicsError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [savedOpen, setSavedOpen] = useState(false)
  const [savedPlanOpen, setSavedPlanOpen] = useState(false)
  const [savedPlanKeywords, setSavedPlanKeywords] = useState([])
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [plansOpen, setPlansOpen] = useState(false)
  const [plansInitialPlanId, setPlansInitialPlanId] = useState('')
  const [returnToCalendar, setReturnToCalendar] = useState(false)
  const [trendState, setTrendState] = useState({
    selectedIndustry: '',
    selectedTopicIds: [],
    results: null,
    summary: '',
    selectedKeywords: [],
    sortMode: 'RELEVANCE',
  })

  useEffect(() => {
    setTrendState({
      selectedIndustry: '',
      selectedTopicIds: [],
      results: null,
      summary: '',
      selectedKeywords: [],
      sortMode: 'RELEVANCE',
    })
  }, [workspaceId])

  const openPlanFromCalendar = planId => {
    if (!planId) return
    setCalendarOpen(false)
    setPlansInitialPlanId(planId)
    setReturnToCalendar(true)
    setPlansOpen(true)
  }

  const closePlans = () => {
    const shouldReturnToCalendar = returnToCalendar
    setPlansOpen(false)
    setPlansInitialPlanId('')
    setReturnToCalendar(false)
    if (shouldReturnToCalendar) setCalendarOpen(true)
  }

  useEffect(() => {
    let mounted = true
    setTopicsLoading(true)
    apiRequest(`/workspaces/${workspaceId}/trends/topics`)
      .then(data => {
        if (mounted) setTopics(data)
      })
      .catch(error => {
        if (mounted) setTopicsError(error.message || 'Không thể tải danh sách chủ đề.')
      })
      .finally(() => {
        if (mounted) setTopicsLoading(false)
      })
    return () => { mounted = false }
  }, [workspaceId])

  return (
    <div className="weekly-plan-page">
      <div className="feature-heading">
        <div>
          <span className="eyebrow">WEEKLY PLANNER</span>
          <h1>Kế hoạch</h1>
          <p>Biến tín hiệu thị trường thành lịch nội dung và chiến dịch có thể triển khai.</p>
        </div>
          <div className="weekly-plan-actions"><button className="outline-btn" onClick={() => setPlansOpen(true)}><FileText size={15}/> Kế hoạch đã lưu</button><button className="outline-btn" onClick={() => setCalendarOpen(true)}><CalendarDays size={15}/> Xem lịch đăng bài</button><button className="outline-btn" onClick={() => setSavedOpen(true)}><Bookmark size={15}/> Keyword đã lưu</button><button className="primary-btn" onClick={() => setModalOpen(true)}><Sparkles size={15}/> Tạo mới với AI</button></div>
      </div>

      <div className="weekly-plan-hero">
        <div className="weekly-plan-hero-icon"><CalendarDays size={24}/></div>
        <div><span className="eyebrow">AI PLANNING WORKSPACE</span><h2>Bắt đầu bằng tín hiệu đang tăng</h2><p>Chọn chủ đề phù hợp với thương hiệu, sau đó để Milo tìm top 20 từ khóa trend làm nguyên liệu cho kế hoạch tuần.</p></div>
        <button className="outline-btn" onClick={() => setModalOpen(true)}><Search size={14}/> Tìm trend</button>
      </div>

      <div className="weekly-plan-grid">
        <div className="weekly-plan-panel"><span className="eyebrow">WORKFLOW</span><h2>Quy trình tạo kế hoạch</h2><div className="weekly-plan-steps"><div><b>01</b><span>Chọn chủ đề</span><small>Lấy danh sách chủ đề từ dữ liệu hệ thống.</small></div><div><b>02</b><span>Tìm top 20 trend</span><small>AI quan sát Google Search và Google Trends.</small></div><div><b>03</b><span>Lên lịch nội dung</span><small>Chọn tín hiệu phù hợp để phát triển thành kế hoạch.</small></div></div></div>
        <div className="weekly-plan-panel weekly-plan-note"><Sparkles size={19}/><div><b>AI luôn cần được duyệt</b><p>Kết quả trend là đề xuất nghiên cứu. Hãy kiểm tra nguồn, độ phù hợp thương hiệu và bối cảnh trước khi xuất bản.</p></div></div>
      </div>

      {modalOpen && <TrendSearchModal workspaceId={workspaceId} role={role} topics={topics} topicsLoading={topicsLoading} topicsError={topicsError} trendState={trendState} onTrendStateChange={setTrendState} onClose={() => setModalOpen(false)}/>} 
      {savedOpen && <SavedKeywordsDialog workspaceId={workspaceId} onClose={() => setSavedOpen(false)} onCreatePlan={keywords => { setSavedPlanKeywords(keywords); setSavedOpen(false); setSavedPlanOpen(true) }}/>} 
      {savedPlanOpen && <ContentPlanDialog workspaceId={workspaceId} keywords={savedPlanKeywords} onClose={() => { setSavedPlanOpen(false); setSavedPlanKeywords([]) }}/>} 
      {calendarOpen && <ContentCalendarDialog workspaceId={workspaceId} role={role} onOpenPlan={openPlanFromCalendar} onClose={() => setCalendarOpen(false)}/>} 
      {plansOpen && <ContentPlansDialog workspaceId={workspaceId} role={role} userId={userId} initialPlanId={plansInitialPlanId} onBackToCalendar={returnToCalendar ? closePlans : undefined} onClose={closePlans}/>} 
    </div>
  )
}
