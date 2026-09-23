import React, { useCallback, useEffect, useState } from 'react'
import { Check, Copy, MailPlus, ShieldCheck, Trash2, Users, X } from 'lucide-react'
import { apiRequest } from '../../lib/api'

const roleLabels = { ADMIN: 'Admin', MARKETER: 'Marketing', SALES: 'Sales' }
const permissionRows = [
  ['Toàn bộ cấu hình workspace', true, false, false],
  ['Content, social, quảng cáo, video', true, true, false],
  ['Competitor intelligence & analytics', true, true, false],
  ['Quản lý Lead và pipeline bán hàng', true, false, true],
  ['Quản lý thành viên và phân quyền', true, false, false],
  ['Gói dịch vụ, token và thanh toán', true, false, false],
]

export default function TeamAccess({ workspaceId, showToast }) {
  const [data, setData] = useState({ members: [], invitations: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('MARKETER')
  const [inviteToken, setInviteToken] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { setData(await apiRequest(`/workspaces/${workspaceId}/members`)) }
    finally { setLoading(false) }
  }, [workspaceId])

  useEffect(() => { load().catch(error => showToast(error.message)) }, [load, showToast])

  const invite = async event => {
    event.preventDefault()
    setSaving(true)
    try {
      const result = await apiRequest(`/workspaces/${workspaceId}/invitations`, { method: 'POST', body: JSON.stringify({ email, role }) })
      setInviteToken(result.token)
      setEmail('')
      await load()
      showToast('Đã tạo lời mời thành viên')
    } catch (error) { showToast(error.message) }
    finally { setSaving(false) }
  }

  const changeRole = async (membershipId, nextRole) => {
    try {
      await apiRequest(`/workspaces/${workspaceId}/members/${membershipId}`, { method: 'PATCH', body: JSON.stringify({ role: nextRole }) })
      await load()
      showToast('Đã cập nhật quyền thành viên')
    } catch (error) { showToast(error.message) }
  }

  const remove = async member => {
    if (!window.confirm(`Xóa ${member.user.name} khỏi workspace?`)) return
    try {
      await apiRequest(`/workspaces/${workspaceId}/members/${member.id}`, { method: 'DELETE' })
      await load()
      showToast('Đã xóa thành viên')
    } catch (error) { showToast(error.message) }
  }

  const copyInvite = async () => {
    await navigator.clipboard.writeText(inviteToken)
    showToast('Đã sao chép mã lời mời')
  }

  return <div className="admin-page">
    <div className="admin-heading">
      <div><span className="eyebrow">QUẢN TRỊ WORKSPACE</span><h1>Thành viên & phân quyền</h1><p>Phân tách rõ dữ liệu Marketing và Sales. Chỉ Admin được quản lý tài khoản.</p></div>
      <div className="secure-badge"><ShieldCheck size={18}/><span><b>RBAC đang bật</b><small>3 vai trò được bảo vệ ở API</small></span></div>
    </div>

    <section className="access-grid">
      <form className="admin-card invite-card" onSubmit={invite}>
        <div className="card-title"><span><MailPlus size={18}/></span><div><h2>Mời thành viên</h2><p>Tạo tài khoản Marketing hoặc Sales</p></div></div>
        <label>Email công việc<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@company.com" required/></label>
        <label>Vai trò<select value={role} onChange={event => setRole(event.target.value)}><option value="MARKETER">Marketing</option><option value="SALES">Sales</option></select></label>
        <button className="primary-btn" disabled={saving}>{saving ? 'Đang tạo...' : 'Tạo lời mời'}</button>
        {inviteToken && <div className="invite-token"><span><b>Mã mời dùng một lần</b><small>{inviteToken.slice(0, 22)}…</small></span><button type="button" onClick={copyInvite}><Copy size={15}/></button></div>}
      </form>

      <section className="admin-card permission-card">
        <div className="card-title"><span><ShieldCheck size={18}/></span><div><h2>Ma trận quyền</h2><p>Ẩn menu và chặn API theo vai trò</p></div></div>
        <div className="permission-table"><header><span>Quyền</span><b>Admin</b><b>Marketing</b><b>Sales</b></header>{permissionRows.map(row => <div key={row[0]}><span>{row[0]}</span>{row.slice(1).map((allowed, index) => allowed ? <Check key={index} size={15}/> : <X key={index} size={14}/>)}</div>)}</div>
      </section>
    </section>

    <section className="admin-card members-card">
      <div className="card-title"><span><Users size={18}/></span><div><h2>Thành viên hiện tại</h2><p>{data.members.length} thành viên đang hoạt động · {data.invitations.length} lời mời chờ</p></div></div>
      {loading ? <div className="admin-empty">Đang tải thành viên...</div> : <div className="member-table">
        <header><span>Thành viên</span><span>Vai trò</span><span>Trạng thái</span><span/></header>
        {data.members.map(member => <div key={member.id}>
          <span className="member-identity"><i>{member.user.name.slice(0, 1).toUpperCase()}</i><span><b>{member.user.name}</b><small>{member.user.email}</small></span></span>
          <span>{member.role === 'ADMIN' ? <strong className="role-pill admin">Admin</strong> : <select value={member.role} onChange={event => changeRole(member.id, event.target.value)}><option value="MARKETER">Marketing</option><option value="SALES">Sales</option></select>}</span>
          <span><em className="status-dot"/> {member.user.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm khóa'}</span>
          <span>{member.role !== 'ADMIN' && <button className="danger-icon" onClick={() => remove(member)} aria-label="Xóa thành viên"><Trash2 size={15}/></button>}</span>
        </div>)}
        {data.invitations.map(invitation => <div className="pending-member" key={invitation.id}><span className="member-identity"><i>?</i><span><b>{invitation.email}</b><small>Hết hạn {new Date(invitation.expiresAt).toLocaleDateString('vi-VN')}</small></span></span><span><strong className="role-pill">{roleLabels[invitation.role]}</strong></span><span>Đang chờ xác nhận</span><span/></div>)}
      </div>}
    </section>
  </div>
}
