import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Activity, ArrowRight, BadgeCheck, Banknote, BarChart3, Bell, Bot, CalendarDays,
  Check, ChevronDown, ChevronLeft, ChevronRight, Clock3,
  FileText, Film, Gauge, Globe2, Headphones, HelpCircle, Image, LayoutDashboard,
  Lightbulb, LogOut, Mail, Megaphone, Menu, MessageCircle, MoreHorizontal, MousePointerClick,
  PenTool, Plus, Radar, Search, Send, Settings, Sparkles, Target, TrendingUp,
  Users, WandSparkles, X, Zap, Contact, CreditCard, UserCog
} from 'lucide-react'
import { siFacebook, siGmail, siInstagram, siTiktok } from 'simple-icons'
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import AuthPage from './auth/AuthPage'
import { useAuth } from './auth/AuthContext'
import IntelligenceCenter from './features/intelligence/IntelligenceCenter'
import ProductKnowledgeView from './features/brand-brain/ProductKnowledgeView'
import WeeklyPlanView from './features/weekly-plan/WeeklyPlanView'
import OnboardingPage from './onboarding/OnboardingPage'
import BrandIcon from './components/BrandIcon'
import TeamAccess from './features/access/TeamAccess'
import LeadsDashboard from './features/leads/LeadsDashboard'
import BillingDashboard from './features/billing/BillingDashboard'
import { apiRequest } from './lib/api'

const InstagramBrandIcon = props => <BrandIcon icon={siInstagram} {...props}/>
const FacebookBrandIcon = props => <BrandIcon icon={siFacebook} {...props}/>
const TikTokBrandIcon = props => <BrandIcon icon={siTiktok} {...props}/>
const EmailBrandIcon = props => <BrandIcon icon={siGmail} {...props}/>
const VideoStudio = lazy(() => import('./features/video/VideoStudio'))

const navGroups = [
  { label: 'TỔNG QUAN', items: [
    { name: 'Trang chủ', icon: LayoutDashboard },
    { name: 'Kế hoạch', icon: CalendarDays, badge: 4 },
    { name: 'AI Agent', icon: Sparkles },
  ]},
  { label: 'SÁNG TẠO & PHÂN PHỐI', items: [
    { name: 'Content Studio', icon: PenTool },
    { name: 'Video Studio', icon: Film },
    { name: 'Mạng xã hội', icon: Globe2 },
    { name: 'Quảng cáo', icon: Megaphone },
    { name: 'Email & Leads', icon: Mail },
  ]},
  { label: 'TĂNG TRƯỞNG', items: [
    { name: 'Analytics', icon: BarChart3 },
    { name: 'Radar đối thủ', icon: Radar },
    { name: 'Brand Brain', icon: Bot },
    { name: 'Tích hợp', icon: Zap },
  ]},
  { label: 'VẬN HÀNH', items: [
    { name: 'Lead & Pipeline', icon: Contact },
    { name: 'Quản lý token', icon: CreditCard },
    { name: 'Thành viên & quyền', icon: UserCog },
  ]},
]

const routePaths = {
  'Trang chủ': '/',
  'Kế hoạch': '/weekly-plan',
  'AI Agent': '/ai-agent',
  'Content Studio': '/content-studio',
  'Video Studio': '/video-studio',
  'Mạng xã hội': '/social-media',
  'Quảng cáo': '/ads-center',
  'Email & Leads': '/email-leads',
  'Analytics': '/analytics',
  'Radar đối thủ': '/competitors',
  'Brand Brain': '/brand-brain',
  'Tích hợp': '/integrations',
  'Lead & Pipeline': '/leads',
  'Quản lý token': '/billing',
  'Thành viên & quyền': '/team',
}

const pathRoutes = Object.fromEntries(Object.entries(routePaths).map(([name, path]) => [path, name]))

const chartData = [
  { day: 'T2', value: 1900, prev: 1100 },
  { day: 'T3', value: 2700, prev: 1600 },
  { day: 'T4', value: 2200, prev: 1550 },
  { day: 'T5', value: 3900, prev: 2300 },
  { day: 'T6', value: 3400, prev: 2400 },
  { day: 'T7', value: 4800, prev: 2900 },
  { day: 'CN', value: 5200, prev: 3100 },
]

const initialTasks = [
  { id: 1, type: 'Bài đăng', title: '5 mẹo phối đồ linen cho ngày hè', channel: 'Instagram', time: '10:30 · Hôm nay', icon: InstagramBrandIcon, color: 'pink', state: 'ready' },
  { id: 2, type: 'Quảng cáo', title: 'Summer Sale — Linen Collection', channel: 'Meta Ads', time: '14:00 · Hôm nay', icon: Target, color: 'blue', state: 'ready' },
  { id: 3, type: 'Email', title: 'BST mới đã về: Chạm vào mùa hè', channel: '2.486 người nhận', time: '08:00 · Ngày mai', icon: EmailBrandIcon, color: 'amber', state: 'ready' },
]

const metrics = [
  { label: 'Tổng tiếp cận', value: '128,4K', change: '+18,2%', note: 'so với tuần trước', icon: Users, shade: 'mint' },
  { label: 'Tương tác', value: '9.842', change: '+12,5%', note: 'so với tuần trước', icon: MousePointerClick, shade: 'lilac' },
  { label: 'Leads mới', value: '186', change: '+24,8%', note: 'so với tuần trước', icon: Target, shade: 'peach' },
  { label: 'Doanh thu ước tính', value: '82,6tr', change: '+16,4%', note: 'ROI 3,8x', icon: Banknote, shade: 'sky' },
]

function Logo({ compact = false }) {
  return <div className="logo-wrap">
    <div className="logo-mark"><span>M</span><i /></div>
    {!compact && <div className="logo-copy"><b>Milo</b><small>MARKETING AI</small></div>}
  </div>
}

const roleLabels = { ADMIN: 'Admin', MARKETER: 'Marketer', SALES: 'Sales' }

const salesPaths = new Set(['/', '/leads'])
const adminOnlyPaths = new Set(['/billing', '/team'])
const salesOnlyPaths = new Set(['/leads'])
function isNavVisible(path, role) {
  if (role === 'ADMIN') return true
  if (role === 'SALES') return salesPaths.has(path)
  if (role === 'MARKETER') return !adminOnlyPaths.has(path) && !salesOnlyPaths.has(path)
  return false
}

function Sidebar({ active, setActive, open, setOpen, workspace, workspaces, role, user, selectWorkspace, logout }) {
  const [workspaceMenu, setWorkspaceMenu] = useState(false)
  const [userMenu, setUserMenu] = useState(false)
  const [billingSummary, setBillingSummary] = useState(null)
  useEffect(() => {
    document.querySelector('.sidebar .nav-item.active')?.scrollIntoView({ block: 'nearest' })
  }, [active, billingSummary])
  useEffect(() => {
    if (role !== 'ADMIN' || !workspace?.id) { setBillingSummary(null); return }
    apiRequest(`/workspaces/${workspace.id}/billing/summary`).then(setBillingSummary).catch(() => setBillingSummary(null))
  }, [role, workspace?.id, active])
  const initials = user?.name?.split(' ').map(part => part[0]).slice(-2).join('').toUpperCase() || 'U'
  return <aside className={`sidebar ${open ? 'mobile-open' : ''}`}>
    <div className="sidebar-head">
      <Logo />
      <button className="icon-btn side-close" onClick={() => setOpen(false)} aria-label="Đóng menu"><X size={19}/></button>
    </div>

    <div className="workspace-menu-wrap">
      <button className="workspace-switch" onClick={() => setWorkspaceMenu(value => !value)} aria-expanded={workspaceMenu}>
        <span className="brand-avatar">{workspace?.name?.slice(0, 1).toUpperCase() || 'W'}</span>
        <span><b>{workspace?.name || 'Chọn workspace'}</b><small>{workspace?.companyProfile?.industry || roleLabels[role] || 'Workspace'}</small></span>
        <ChevronDown size={16}/>
      </button>
      {workspaceMenu && <div className="workspace-dropdown">
        <span>WORKSPACE CỦA BẠN</span>
        {workspaces.map(item => <button className={item.workspace.id === workspace?.id ? 'active' : ''} key={item.workspace.id} onClick={() => { selectWorkspace(item.workspace.id); setWorkspaceMenu(false) }}>
          <i>{item.workspace.name.slice(0, 1).toUpperCase()}</i><p><b>{item.workspace.name}</b><small>{roleLabels[item.role]} · {item.workspace.onboardingStatus === 'COMPLETED' ? 'Đã thiết lập' : 'Chưa hoàn tất'}</small></p>{item.workspace.id === workspace?.id && <Check size={15}/>} 
        </button>)}
      </div>}
    </div>

    <nav>
      {navGroups.map(group => ({ ...group, items: group.items.filter(item => isNavVisible(routePaths[item.name], role)) })).filter(group => group.items.length).map(group => <div className="nav-group" key={group.label}>
        <p>{group.label}</p>
        {group.items.map(item => {
          const Icon = item.icon
          return <button key={item.name} className={`nav-item ${active === item.name ? 'active' : ''}`} onClick={() => {setActive(item.name); setOpen(false)}}>
            <Icon size={18}/><span>{item.name}</span>{item.badge && <em>{item.badge}</em>}
          </button>
        })}
      </div>)}
    </nav>

    <div className="sidebar-foot">
      {role === 'ADMIN' && billingSummary && <div className="plan-card">
        <div><span>GÓI {billingSummary.plan.name.toUpperCase()}</span><b>{billingSummary.usagePercent}%</b></div>
        <div className="progress"><i style={{ width: `${billingSummary.usagePercent}%` }}/></div>
        <p>{new Intl.NumberFormat('vi-VN').format(billingSummary.usedTokens)} / {new Intl.NumberFormat('vi-VN').format(billingSummary.subscription.includedTokens)} token</p>
        <button onClick={() => setActive('Quản lý token')}>Quản lý gói <ArrowRight size={14}/></button>
      </div>}
      <button className="nav-item"><HelpCircle size={18}/><span>Trợ giúp & hướng dẫn</span></button>
      <button className="user-row" onClick={() => setUserMenu(value => !value)} aria-expanded={userMenu}>
        <span className="user-avatar">{initials}<i/></span>
        <span><b>{user?.name}</b><small>{roleLabels[role]}</small></span>
        <MoreHorizontal size={18}/>
      </button>
      {userMenu && <div className="user-dropdown"><div><b>{user?.name}</b><small>{user?.email}</small></div><button onClick={logout}><LogOut size={15}/> Đăng xuất</button></div>}
    </div>
  </aside>
}

function Header({ setMenuOpen, openChat }) {
  return <header className="topbar">
    <button className="icon-btn menu-trigger" aria-label="Mở menu" onClick={() => setMenuOpen(true)}><Menu size={20}/></button>
    <div className="command-search"><Search size={17}/><span>Tìm kiếm hoặc hỏi Milo...</span><kbd>⌘ K</kbd></div>
    <div className="top-actions">
      <div className="live-status"><i/> Hệ thống hoạt động tốt</div>
      <button className="icon-btn notification"><Bell size={19}/><i/></button>
      <button className="primary-btn compact" onClick={openChat}><Sparkles size={16}/> Hỏi Milo</button>
    </div>
  </header>
}

function MetricCard({ metric }) {
  const Icon = metric.icon
  return <article className="metric-card">
    <div className={`metric-icon ${metric.shade}`}><Icon size={19}/></div>
    <span className="metric-label">{metric.label}<HelpCircle size={13}/></span>
    <div className="metric-value">{metric.value}</div>
    <div className="metric-foot"><span><TrendingUp size={13}/>{metric.change}</span> {metric.note}</div>
  </article>
}

function ActivityChart() {
  const [range, setRange] = useState('7 ngày')
  return <section className="panel performance-panel">
    <div className="panel-head">
      <div><h2>Hiệu suất marketing</h2><p>Tổng quan hiệu quả các kênh của bạn</p></div>
      <div className="range-tabs">
        {['7 ngày','30 ngày','90 ngày'].map(x => <button className={range === x ? 'active' : ''} onClick={() => setRange(x)} key={x}>{x}</button>)}
      </div>
    </div>
    <div className="chart-summary">
      <div><span>Chuyển đổi</span><b>1.284</b><em>+21,4%</em></div>
      <div className="chart-legend"><span><i className="now"/> Tuần này</span><span><i className="before"/> Tuần trước</span></div>
    </div>
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{top: 4, right: 4, left: -26, bottom: 0}}>
          <defs>
            <linearGradient id="greenFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#276b52" stopOpacity={0.22}/><stop offset="100%" stopColor="#276b52" stopOpacity={0}/></linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e8ece8" />
          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:'#7b847e',fontSize:11}} />
          <YAxis axisLine={false} tickLine={false} tick={{fill:'#9aa19c',fontSize:10}} tickFormatter={v => `${v/1000}K`} />
          <Tooltip contentStyle={{border:'0', borderRadius:12, boxShadow:'0 8px 28px rgba(29,51,39,.12)', fontSize:12}} formatter={(value) => [value.toLocaleString('vi-VN'), 'Chuyển đổi']} />
          <Area type="monotone" dataKey="prev" stroke="#b9c1bc" strokeWidth={1.5} strokeDasharray="5 5" fill="transparent" />
          <Area type="monotone" dataKey="value" stroke="#276b52" strokeWidth={2.5} fill="url(#greenFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </section>
}

function ApprovalQueue() {
  const [tasks, setTasks] = useState(initialTasks)
  const approve = id => setTasks(items => items.map(x => x.id === id ? {...x, state: 'approved'} : x))
  const pending = tasks.filter(x => x.state === 'ready').length
  return <section className="panel approval-panel">
    <div className="panel-head">
      <div><h2>Chờ bạn duyệt <span className="count-pill">{pending}</span></h2><p>Milo đã chuẩn bị và cần bạn xác nhận</p></div>
      <button className="text-btn">Xem tất cả <ArrowRight size={14}/></button>
    </div>
    <div className="task-list">
      {tasks.map(task => {
        const Icon = task.icon
        return <div className={`task-item ${task.state}`} key={task.id}>
          <div className={`task-type ${task.color}`}><Icon size={17}/></div>
          <div className="task-info"><span>{task.type} · {task.channel}</span><b>{task.title}</b><small><Clock3 size={12}/>{task.time}</small></div>
          {task.state === 'approved' ? <div className="approved-label"><Check size={15}/> Đã duyệt</div> : <div className="task-actions"><button className="preview-btn">Xem</button><button className="approve-btn" onClick={() => approve(task.id)}><Check size={15}/> Duyệt</button></div>}
        </div>
      })}
    </div>
    {pending > 0 && <button className="approve-all" onClick={() => setTasks(items => items.map(x => ({...x,state:'approved'})))}><BadgeCheck size={17}/> Duyệt tất cả ({pending})</button>}
  </section>
}

function AgentCard({ setChatOpen, userName, workspaceName }) {
  const [auto, setAuto] = useState(true)
  return <section className="agent-card">
    <div className="agent-orb"><Sparkles size={21}/><i/><i/></div>
    <div className="agent-top"><span>AI AGENT</span><div className="autopilot"><i/> Autopilot <button className={auto ? 'on' : ''} onClick={() => setAuto(!auto)}><i/></button></div></div>
    <h2>Chào bạn, {userName?.split(' ').slice(-1)[0]}!</h2>
    <p>Mình đã phân tích hiệu suất tuần này và tìm thấy <b>3 cơ hội tăng trưởng</b> cho {workspaceName}.</p>
    <div className="agent-suggestion">
      <div className="bulb"><Lightbulb size={18}/></div>
      <div><span>Cơ hội nổi bật</span><b>Tăng 20% ngân sách quảng cáo Linen Collection</b><small>CPA đang thấp hơn mục tiêu 32%</small></div>
      <ChevronRight size={18}/>
    </div>
    <button className="agent-chat-btn" onClick={() => setChatOpen(true)}><MessageCircle size={17}/> Trò chuyện với Milo <ArrowRight size={15}/></button>
  </section>
}

function QuickActions({ showToast, setChatOpen }) {
  const actions = [
    { icon: PenTool, title: 'Tạo nội dung', sub: 'Caption, blog, email', cls: 'green' },
    { icon: CalendarDays, title: 'Lên lịch bài', sub: 'Đa nền tảng', cls: 'purple' },
    { icon: Megaphone, title: 'Tạo quảng cáo', sub: 'AI tối ưu chuyển đổi', cls: 'orange' },
    { icon: BarChart3, title: 'Xem báo cáo', sub: 'Insight tuần này', cls: 'blue' },
  ]
  return <section className="quick-section">
    <div className="section-title"><div><h2>Bắt đầu nhanh</h2><p>Milo có thể giúp bạn làm gì hôm nay?</p></div></div>
    <div className="quick-grid">
      {actions.map((a, i) => { const Icon = a.icon; return <button className="quick-card" key={a.title} onClick={() => i === 0 ? setChatOpen(true) : showToast(`Đã mở ${a.title.toLowerCase()}`)}>
        <span className={`quick-icon ${a.cls}`}><Icon size={19}/></span><span><b>{a.title}</b><small>{a.sub}</small></span><ArrowRight size={16}/>
      </button>})}
    </div>
  </section>
}

function Schedule() {
  return <section className="panel schedule-panel">
    <div className="panel-head"><div><h2>Lịch nội dung sắp tới</h2><p>12 nội dung đã lên lịch trong 7 ngày tới</p></div><button className="text-btn">Mở lịch <ArrowRight size={14}/></button></div>
    <div className="schedule-days">
      {[
        ['HÔM NAY','14','2',true], ['TH 3','15','1'], ['TH 4','16','3'], ['TH 5','17','2'], ['TH 6','18','1'], ['TH 7','19','2'], ['CN','20','1']
      ].map((day, i) => <button className={day[3] ? 'today' : ''} key={day[1]}>
        <span>{day[0]}</span><b>{day[1]}</b><div className="post-dots">{Array.from({length: Math.min(+day[2],3)}, (_,n) => <i key={n}/>)}</div><small>{day[2]} bài</small>
      </button>)}
    </div>
  </section>
}

function ChannelHealth() {
  const channels = [
    ['Instagram','24,8K','+8,2%',InstagramBrandIcon,'instagram'],
    ['Facebook','18,2K','+5,6%',FacebookBrandIcon,'facebook'],
    ['TikTok','42,1K','+21,4%',TikTokBrandIcon,'tiktok'],
    ['Email','8,6K','+3,2%',EmailBrandIcon,'email'],
  ]
  return <section className="panel channel-panel">
    <div className="panel-head"><div><h2>Sức khoẻ kênh</h2><p>Cập nhật 5 phút trước</p></div><button className="icon-btn"><MoreHorizontal size={18}/></button></div>
    <div className="channel-list">
      {channels.map(([name,value,change,Icon,color]) => <div className="channel-row" key={name}>
        <span className={`channel-icon ${color}`}><Icon size={16}/></span><span className="channel-name">{name}</span><b>{value}</b><em>{change}</em>
      </div>)}
    </div>
    <div className="health-score"><div className="score-ring"><span>86</span></div><div><b>Rất tốt</b><small>Tất cả các kênh đang tăng trưởng</small></div></div>
  </section>
}

function ChatDrawer({ open, onClose, showToast, workspaceName, userName }) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    { from: 'ai', text: `Chào ${userName?.split(' ').slice(-1)[0] || 'bạn'}! Mình đã sẵn sàng. Bạn muốn tạo nội dung, lên chiến dịch hay xem insight hôm nay?` }
  ])
  const send = () => {
    if (!input.trim()) return
    const text = input.trim()
    setMessages(m => [...m, {from:'user', text}, {from:'ai', text:'Đã hiểu. Mình đang tạo một bản nháp theo đúng Brand Voice của Atelier No.8. Bạn sẽ được xem trước khi có bất kỳ nội dung nào được đăng.'}])
    setInput('')
    showToast('Milo đã nhận yêu cầu')
  }
  return <>
    <div className={`drawer-backdrop ${open ? 'show' : ''}`} onClick={onClose}/>
    <aside className={`chat-drawer ${open ? 'show' : ''}`}>
      <div className="chat-head"><div className="mini-orb"><Sparkles size={17}/><i/></div><div><b>Milo AI Agent</b><small><i/> Đang trực tuyến</small></div><button className="icon-btn" onClick={onClose}><X size={19}/></button></div>
      <div className="chat-context"><WandSparkles size={15}/> Đang dùng Brand Brain của <b>{workspaceName}</b></div>
      <div className="chat-body">
        {messages.map((m,i) => <div className={`message ${m.from}`} key={i}>{m.text}</div>)}
        <div className="suggested-prompts">
          <span>Gợi ý cho bạn</span>
          <button onClick={() => setInput('Tạo 5 caption cho BST Linen mới')}>Tạo 5 caption cho BST Linen mới</button>
          <button onClick={() => setInput('Phân tích quảng cáo tuần này')}>Phân tích quảng cáo tuần này</button>
        </div>
      </div>
      <div className="chat-compose"><button className="icon-btn"><Plus size={18}/></button><textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => {if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}} placeholder="Giao việc cho Milo..." rows="1"/><button className="send-btn" onClick={send}><Send size={17}/></button></div>
      <small className="chat-note">Milo có thể mắc lỗi. Mọi hành động đều cần bạn phê duyệt.</small>
    </aside>
  </>
}

function PlaceholderView({ title, setActive, workspaceName }) {
  const details = {
    'Kế hoạch': ['12 nội dung','2 chiến dịch','1 chuỗi email'],
    'AI Agent': ['Autopilot đang bật','3 cơ hội mới','4 tác vụ chờ duyệt'],
    'Content Studio': ['Caption mạng xã hội','Bài blog chuẩn SEO','Email marketing'],
    'Mạng xã hội': ['Instagram','Facebook','TikTok'],
    'Quảng cáo': ['Meta Ads','Google Ads','TikTok Ads'],
    'Email & Leads': ['8.624 subscribers','186 leads mới','28 leads nóng'],
    'Analytics': ['ROI 3,8x','128,4K tiếp cận','9.842 tương tác'],
    'Brand Brain': ['Giọng điệu: Tinh tế','6 tài liệu kiến thức','Đồng bộ 94%'],
    'Tích hợp': ['4 kênh đang kết nối','Google Analytics','Shopify'],
  }
  const items = details[title] || []
  return <div className="placeholder-view">
    <div className="placeholder-head"><button className="back-btn" onClick={() => setActive('Trang chủ')}><ChevronLeft size={17}/> Trang chủ</button><span>Workspace / {title}</span></div>
    <div className="placeholder-hero"><span className="eyebrow">MILO WORKSPACE</span><h1>{title}</h1><p>Không gian làm việc tập trung, được cá nhân hoá theo Brand Brain của {workspaceName}.</p><button className="primary-btn"><Plus size={17}/> Tạo mới với AI</button></div>
    <div className="placeholder-grid">{items.map((x,i) => <div className="placeholder-card" key={x}><span>0{i+1}</span><b>{x}</b><p>Dữ liệu được Milo cập nhật tự động và sẵn sàng để bạn hành động.</p><ArrowRight size={18}/></div>)}</div>
  </div>
}

export default function App() {
  const { status, user, workspace, role, workspaces, selectWorkspace, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const active = pathRoutes[location.pathname] || 'Trang chủ'
  const setActive = name => navigate(routePaths[name] || '/')
  const [menuOpen, setMenuOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [toast, setToast] = useState('')
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname, workspace?.onboardingStatus])
  useEffect(() => {
    if (status === 'authenticated' && role && !isNavVisible(location.pathname, role)) navigate('/', { replace: true })
  }, [location.pathname, navigate, role, status])
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    return hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'
  }, [])
  const showToast = useCallback(text => { setToast(text); setTimeout(() => setToast(''), 2400) }, [])

  if (status === 'loading') return <div className="app-loading"><div className="logo-mark"><span>M</span><i /></div><span className="button-spinner dark"/><p>Đang khôi phục phiên làm việc...</p></div>
  if (status === 'guest') return <AuthPage />
  if (!workspace) return <div className="app-loading"><Logo/><p>Tài khoản chưa có workspace.</p><button className="outline-btn" onClick={logout}>Đăng xuất</button></div>
  if (workspace.onboardingStatus !== 'COMPLETED') return <OnboardingPage />

  return <div className="app-shell">
    <Sidebar active={active} setActive={setActive} open={menuOpen} setOpen={setMenuOpen} workspace={workspace} workspaces={workspaces} role={role} user={user} selectWorkspace={selectWorkspace} logout={logout}/>
    <div className="main-shell">
      <Header setMenuOpen={setMenuOpen} openChat={() => setChatOpen(true)}/>
      <main className="main-content">
        {role === 'SALES' && active === 'Trang chủ'
          ? <LeadsDashboard workspaceId={workspace.id} role={role} showToast={showToast}/>
          : active === 'Trang chủ' ? <>
          <div className="welcome-row">
            <div><p>KHÔNG GIAN · {workspace.name.toUpperCase()}</p><h1>{greeting}, {user.name.split(' ').slice(-1)[0]} <span>✦</span></h1><small>Đây là những gì đang diễn ra với hoạt động marketing của bạn.</small></div>
            <button className="outline-btn" onClick={() => showToast('Đã tạo bản báo cáo tuần')}><FileText size={16}/> Báo cáo tuần <ChevronDown size={14}/></button>
          </div>

          <div className="dashboard-layout">
            <div className="dashboard-main">
              <div className="metric-grid">{metrics.map(m => <MetricCard metric={m} key={m.label}/>)}</div>
              <QuickActions showToast={showToast} setChatOpen={setChatOpen}/>
              <div className="two-col"><ActivityChart/><ApprovalQueue/></div>
              <Schedule/>
            </div>
            <div className="dashboard-aside"><AgentCard setChatOpen={setChatOpen} userName={user.name} workspaceName={workspace.name}/><ChannelHealth/></div>
          </div>
        </> : active === 'Lead & Pipeline'
          ? <LeadsDashboard workspaceId={workspace.id} role={role} showToast={showToast}/>
          : active === 'Quản lý token'
            ? <BillingDashboard workspaceId={workspace.id} role={role} showToast={showToast}/>
            : active === 'Thành viên & quyền'
              ? <TeamAccess workspaceId={workspace.id} showToast={showToast}/>
              : active === 'Radar đối thủ'
                ? <IntelligenceCenter workspaceId={workspace.id} role={role} initialTab={new URLSearchParams(location.search).get('tab') || 'competitors'}/>
                : active === 'Tích hợp'
                  ? <IntelligenceCenter workspaceId={workspace.id} role={role} initialTab="social"/>
                  : active === 'Brand Brain'
                    ? <ProductKnowledgeView workspaceId={workspace.id} role={role}/>
                    : active === 'Kế hoạch'
                      ? <WeeklyPlanView workspaceId={workspace.id} role={role} userId={user.id}/>
                      : active === 'Video Studio'
                        ? <Suspense fallback={<div className="app-loading"><span className="button-spinner dark"/><p>Đang tải Video Studio...</p></div>}><VideoStudio key={workspace.id} workspaceId={workspace.id} workspaceName={workspace.name} showToast={showToast}/></Suspense>
                        : <PlaceholderView title={active} setActive={setActive} workspaceName={workspace.name}/>}
      </main>
    </div>
    <ChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} showToast={showToast} workspaceName={workspace.name} userName={user.name}/>
    <div className={`toast ${toast ? 'show' : ''}`}><Check size={16}/>{toast}</div>
    {menuOpen && <div className="mobile-overlay" onClick={() => setMenuOpen(false)}/>} 
  </div>
}
