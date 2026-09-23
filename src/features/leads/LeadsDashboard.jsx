import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Banknote, Filter, Mail, Phone, Plus, Search, Target, Trash2, TrendingUp, UserRound, X } from 'lucide-react'
import { apiRequest } from '../../lib/api'

const statuses = [
  ['NEW', 'Mới', 'blue'],
  ['QUALIFIED', 'Tiềm năng', 'purple'],
  ['CONTACTED', 'Đã liên hệ', 'amber'],
  ['WON', 'Thành công', 'green'],
  ['LOST', 'Thất bại', 'gray'],
]
const statusMap = Object.fromEntries(statuses.map(item => [item[0], item]))
const emptyForm = { name: '', email: '', phone: '', company: '', source: '', status: 'NEW', score: 50, valueCents: 0, notes: '' }
const money = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0)

export default function LeadsDashboard({ workspaceId, role, showToast }) {
  const [data, setData] = useState({ leads: [], pipeline: [], total: 0, wonValue: 0 })
  const [members, setMembers] = useState([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await apiRequest(`/workspaces/${workspaceId}/leads`)
      setData(result)
      if (role === 'ADMIN') {
        const team = await apiRequest(`/workspaces/${workspaceId}/members`)
        setMembers(team.members.filter(member => member.role === 'SALES' || member.role === 'ADMIN'))
      }
    } finally { setLoading(false) }
  }, [workspaceId, role])

  useEffect(() => { load().catch(error => showToast(error.message)) }, [load, showToast])

  const filtered = useMemo(() => data.leads.filter(lead => {
    const matchesStatus = filter === 'ALL' || lead.status === filter
    const text = `${lead.name} ${lead.email || ''} ${lead.company || ''}`.toLowerCase()
    return matchesStatus && text.includes(query.toLowerCase())
  }), [data.leads, filter, query])

  const openCreate = () => { setEditing('new'); setForm(emptyForm) }
  const openEdit = lead => { setEditing(lead.id); setForm({ ...emptyForm, ...lead, assignedToId: lead.assignedTo?.id || '' }) }
  const save = async event => {
    event.preventDefault()
    setSaving(true)
    const payload = { ...form, score: Number(form.score), valueCents: Number(form.valueCents), assignedToId: form.assignedToId || undefined }
    try {
      await apiRequest(`/workspaces/${workspaceId}/leads${editing === 'new' ? '' : `/${editing}`}`, { method: editing === 'new' ? 'POST' : 'PATCH', body: JSON.stringify(payload) })
      setEditing(null)
      await load()
      showToast(editing === 'new' ? 'Đã tạo lead mới' : 'Đã cập nhật lead')
    } catch (error) { showToast(error.message) }
    finally { setSaving(false) }
  }
  const quickStatus = async (lead, status) => {
    try {
      await apiRequest(`/workspaces/${workspaceId}/leads/${lead.id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      await load()
    } catch (error) { showToast(error.message) }
  }
  const remove = async lead => {
    if (!window.confirm(`Xóa lead ${lead.name}?`)) return
    try { await apiRequest(`/workspaces/${workspaceId}/leads/${lead.id}`, { method: 'DELETE' }); await load(); showToast('Đã xóa lead') }
    catch (error) { showToast(error.message) }
  }

  const qualified = data.pipeline.find(item => item.status === 'QUALIFIED')?.count || 0
  const won = data.pipeline.find(item => item.status === 'WON')?.count || 0
  return <div className="sales-page">
    <div className="admin-heading">
      <div><span className="eyebrow">SALES WORKSPACE</span><h1>Lead & cơ hội bán hàng</h1><p>Quản lý pipeline tập trung dành riêng cho Admin và Sales.</p></div>
      <button className="primary-btn" onClick={openCreate}><Plus size={17}/> Thêm lead</button>
    </div>
    <div className="sales-kpis">
      <article><span className="kpi-icon blue"><Target size={19}/></span><div><small>Tổng lead</small><b>{data.total}</b><em>Trong workspace</em></div></article>
      <article><span className="kpi-icon purple"><TrendingUp size={19}/></span><div><small>Lead tiềm năng</small><b>{qualified}</b><em>Cần ưu tiên</em></div></article>
      <article><span className="kpi-icon green"><UserRound size={19}/></span><div><small>Đã chốt</small><b>{won}</b><em>{data.total ? Math.round(won / data.total * 100) : 0}% chuyển đổi</em></div></article>
      <article><span className="kpi-icon amber"><Banknote size={19}/></span><div><small>Giá trị thắng</small><b>{money(data.wonValue)}</b><em>Doanh thu ghi nhận</em></div></article>
    </div>
    <section className="admin-card lead-card">
      <div className="lead-toolbar"><div><h2>Danh sách lead</h2><span>{filtered.length} kết quả</span></div><label><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm tên, email, công ty..."/></label><div className="lead-filter"><Filter size={15}/><select value={filter} onChange={event => setFilter(event.target.value)}><option value="ALL">Tất cả trạng thái</option>{statuses.map(status => <option value={status[0]} key={status[0]}>{status[1]}</option>)}</select></div></div>
      {loading ? <div className="admin-empty">Đang tải pipeline...</div> : filtered.length === 0 ? <div className="admin-empty"><Target size={28}/><b>Chưa có lead phù hợp</b><span>Thêm lead đầu tiên để bắt đầu pipeline.</span></div> : <div className="lead-table"><header><span>Lead</span><span>Liên hệ</span><span>Giá trị</span><span>Phụ trách</span><span>Trạng thái</span><span/></header>{filtered.map(lead => <div key={lead.id} onClick={() => openEdit(lead)}>
        <span><b>{lead.name}</b><small>{lead.company || lead.source || 'Chưa có công ty'}</small></span>
        <span className="lead-contact">{lead.email && <small><Mail size={12}/>{lead.email}</small>}{lead.phone && <small><Phone size={12}/>{lead.phone}</small>}</span>
        <span><b>{money(lead.valueCents)}</b><small>Điểm {lead.score}/100</small></span>
        <span>{lead.assignedTo?.name || 'Chưa giao'}</span>
        <span><select className={`lead-status ${statusMap[lead.status]?.[2]}`} value={lead.status} onClick={event => event.stopPropagation()} onChange={event => quickStatus(lead, event.target.value)}>{statuses.map(status => <option value={status[0]} key={status[0]}>{status[1]}</option>)}</select></span>
        <span>{role === 'ADMIN' && <button className="danger-icon" onClick={event => { event.stopPropagation(); remove(lead) }}><Trash2 size={14}/></button>}</span>
      </div>)}</div>}
    </section>
    {editing && <div className="admin-modal-backdrop" onMouseDown={() => setEditing(null)}><form className="admin-modal lead-form" onSubmit={save} onMouseDown={event => event.stopPropagation()}><button className="modal-x" type="button" onClick={() => setEditing(null)}><X size={18}/></button><span className="eyebrow">{editing === 'new' ? 'LEAD MỚI' : 'CẬP NHẬT LEAD'}</span><h2>{editing === 'new' ? 'Thêm cơ hội bán hàng' : form.name}</h2><div className="form-grid"><label>Họ tên<input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} required/></label><label>Công ty<input value={form.company || ''} onChange={event => setForm({ ...form, company: event.target.value })}/></label><label>Email<input type="email" value={form.email || ''} onChange={event => setForm({ ...form, email: event.target.value })}/></label><label>Điện thoại<input value={form.phone || ''} onChange={event => setForm({ ...form, phone: event.target.value })}/></label><label>Nguồn<input value={form.source || ''} onChange={event => setForm({ ...form, source: event.target.value })} placeholder="Website, Facebook..."/></label><label>Giá trị dự kiến<input type="number" min="0" value={form.valueCents || 0} onChange={event => setForm({ ...form, valueCents: event.target.value })}/></label><label>Trạng thái<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}>{statuses.map(status => <option value={status[0]} key={status[0]}>{status[1]}</option>)}</select></label><label>Điểm lead<input type="number" min="0" max="100" value={form.score} onChange={event => setForm({ ...form, score: event.target.value })}/></label>{role === 'ADMIN' && <label className="form-wide">Phụ trách<select value={form.assignedToId || ''} onChange={event => setForm({ ...form, assignedToId: event.target.value })}><option value="">Chưa giao</option>{members.map(member => <option key={member.user.id} value={member.user.id}>{member.user.name} · {member.role}</option>)}</select></label>}<label className="form-wide">Ghi chú<textarea rows="4" value={form.notes || ''} onChange={event => setForm({ ...form, notes: event.target.value })}/></label></div><button className="primary-btn form-submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu lead'}</button></form></div>}
  </div>
}
