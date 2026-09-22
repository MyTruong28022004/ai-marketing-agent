import React, { useCallback, useEffect, useState } from 'react'
import { Bot, CheckCircle2, FileText, LoaderCircle, Plus, Sparkles, Upload } from 'lucide-react'
import { apiRequest } from '../../lib/api'

const canManage = role => role === 'ADMIN' || role === 'MARKETER'

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function statusLabel(status) {
  if (status === 'READY') return 'Sẵn sàng cho AI'
  if (status === 'PROCESSING') return 'Đang xử lý'
  if (status === 'FAILED') return 'Xử lý lỗi'
  return 'Đang tải lên'
}

export default function ProductKnowledgeView({ workspaceId, role }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const editable = canManage(role)

  const load = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      setProducts(await apiRequest(`/workspaces/${workspaceId}/products`))
      setError('')
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu sản phẩm.')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => { void load() }, [load])

  const createProduct = async event => {
    event.preventDefault()
    if (!form.name.trim()) return
    setBusy('create')
    setError('')
    try {
      await apiRequest(`/workspaces/${workspaceId}/products`, {
        method: 'POST',
        body: JSON.stringify({ name: form.name.trim(), description: form.description.trim() || undefined }),
      })
      setForm({ name: '', description: '' })
      setShowCreate(false)
      setNotice('Đã tạo product. Hãy tải tài liệu mô tả sản phẩm lên.')
      await load()
    } catch (err) {
      setError(err.message || 'Không thể tạo product.')
    } finally {
      setBusy('')
    }
  }

  const upload = async (product, event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const extension = file.name.toLowerCase().split('.').pop()
    if (!['txt', 'md', 'pdf'].includes(extension)) {
      setError('Chỉ hỗ trợ file .txt, .md hoặc .pdf.')
      return
    }
    setBusy(product.id)
    setError('')
    setNotice('')
    try {
      const body = new FormData()
      body.append('file', file)
      await apiRequest(`/workspaces/${workspaceId}/products/${product.id}/documents`, { method: 'POST', body })
      setNotice(`Đã nạp “${file.name}” để AI xử lý tài liệu trong lần tìm trend tiếp theo.`)
      await load()
    } catch (err) {
      setError(err.message || 'Không thể tải tài liệu lên.')
    } finally {
      setBusy('')
    }
  }

  return <div className="product-knowledge-view">
    <section className="product-knowledge-hero">
      <span><Bot size={22}/></span>
      <div>
        <span className="eyebrow">WORKSPACE PRODUCT KNOWLEDGE</span>
        <h2>Kiến thức sản phẩm cho AI</h2>
        <p>Mỗi product có tài liệu TXT, Markdown hoặc PDF riêng. Milo trích xuất nội dung, chia thành các đoạn nhỏ và chỉ dùng tài liệu của workspace này khi đối chiếu keyword trend.</p>
      </div>
      {editable && <button className="primary-btn" onClick={() => setShowCreate(value => !value)}><Plus size={16}/> Thêm product</button>}
    </section>

    {showCreate && <form className="product-create-form" onSubmit={createProduct}>
      <label><span>Tên product</span><input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder="Ví dụ: Nền tảng quản lý bán hàng" maxLength={160} required/></label>
      <label><span>Mô tả ngắn</span><textarea value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder="Product giải quyết vấn đề gì?" rows={2} maxLength={1800}/></label>
      <div><button type="button" className="outline-btn" onClick={() => setShowCreate(false)}>Hủy</button><button type="submit" className="primary-btn" disabled={busy === 'create'}>{busy === 'create' ? <LoaderCircle className="spin" size={15}/> : <CheckCircle2 size={15}/>} Lưu product</button></div>
    </form>}

    {error && <div className="inline-error">{error}</div>}
    {notice && <div className="product-knowledge-notice"><CheckCircle2 size={15}/>{notice}</div>}
    {loading ? <div className="data-loading"><LoaderCircle className="spin" size={19}/> Đang tải product knowledge...</div> : products.length === 0 ? <div className="product-knowledge-empty"><Sparkles size={22}/><b>Workspace chưa có product</b><span>Tạo product rồi tải tài liệu mô tả lên để AI có thể đối chiếu khi tìm keyword.</span></div> : <div className="product-knowledge-grid">
      {products.map(product => <article className="product-knowledge-card" key={product.id}>
        <header><span className="product-knowledge-icon"><FileText size={18}/></span><div><h3>{product.name}</h3><small>{product.description || 'Chưa có mô tả ngắn'}</small></div><i className={product.status === 'ACTIVE' ? 'active' : ''}>{product.status === 'ACTIVE' ? 'Đang dùng' : 'Lưu trữ'}</i></header>
        <div className="product-documents-head"><b>Tài liệu nguồn</b><span>{product.documents.length} file</span></div>
        {product.documents.length ? <div className="product-document-list">{product.documents.map(document => <div className="product-document-row" key={document.id}><FileText size={15}/><span><b>{document.name}</b><small>{statusLabel(document.status)}{document.versions?.[0]?.sizeBytes ? ` · ${formatSize(document.versions[0].sizeBytes)}` : ''}</small></span><CheckCircle2 className={document.status === 'READY' ? 'ready' : ''} size={15}/></div>)}</div> : <p className="product-document-empty">Chưa có tài liệu. AI chưa thể đối chiếu product này.</p>}
        {editable && <><input id={`product-file-${product.id}`} className="product-file-input" type="file" accept=".txt,.md,.pdf,text/plain,application/pdf" onChange={event => upload(product, event)}/><label className={`product-upload-button ${busy === product.id ? 'is-uploading' : ''}`} htmlFor={`product-file-${product.id}`} aria-disabled={busy === product.id} onClick={event => { if (busy === product.id) event.preventDefault() }}><Upload size={15}/>{busy === product.id ? 'Đang tải tài liệu...' : 'Tải TXT hoặc PDF lên'}</label></>}
      </article>)}
    </div>}
    <div className="product-knowledge-note"><b>Lưu trữ dữ liệu</b><span>File gốc được lưu theo workspace/product trong object storage. Nội dung trích xuất và chunks được lưu trong database để tìm kiếm nhanh; AI chỉ đọc tài liệu có trạng thái READY và product đang ACTIVE.</span></div>
  </div>
}
