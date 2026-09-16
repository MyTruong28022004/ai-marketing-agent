import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowRight, BarChart3, BookOpen, CheckCircle2, ExternalLink, FileSearch,
  Layers3, Lightbulb, Link2, LoaderCircle, Megaphone, Radar, RefreshCw, Search,
  ShieldAlert, Sparkles, Target, TrendingUp,
} from 'lucide-react'
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import CompetitorManager from '../competitors/CompetitorManager'
import SocialConnections from './SocialConnections'
import { apiRequest } from '../../lib/api'

const tabs = [
  { key: 'overview', label: 'Tổng quan', icon: Activity },
  { key: 'trends', label: 'Keyword Trends', icon: TrendingUp },
  { key: 'competitors', label: 'Competitor Radar', icon: Radar },
  { key: 'social', label: 'Kết nối Social', icon: Link2 },
  { key: 'gaps', label: 'Content Gaps', icon: FileSearch },
  { key: 'campaigns', label: 'Campaign Watch', icon: Megaphone },
  { key: 'opportunities', label: 'Opportunities', icon: Lightbulb },
]

const typeLabels = {
  QUICK_WIN: 'QUICK WIN', KEYWORD_GAP: 'KEYWORD GAP', CONTENT_GAP: 'CONTENT GAP',
  TREND: 'TREND', CAMPAIGN: 'CAMPAIGN',
}

const stageLabels = {
  AWARENESS: 'Nhận biết', CONSIDERATION: 'Cân nhắc', DECISION: 'Quyết định', IMPLEMENTATION: 'Triển khai',
}

const coverageLabels = {
  MISSING: 'Chưa có nội dung', WEAK: 'Nội dung còn yếu', OUTDATED: 'Nội dung lỗi thời', COMPETITOR_LED: 'Đối thủ đang dẫn',
}

const dateLabel = value => value
  ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : 'Chưa phân tích'

function RadarCard({ card }) {
  const Icon = card.icon
  return <article className="intelligence-radar-card">
    <span className={`intelligence-icon ${card.tone}`}><Icon size={18}/></span>
    <div><span>{card.title}</span><b>{card.value}</b><small>{card.detail}</small></div>
  </article>
}

function IntelligenceEmpty({ title, children, canAnalyze, analyzing, onAnalyze }) {
  return <section className="intelligence-empty">
    <span><Sparkles size={23}/></span><h2>{title}</h2><p>{children}</p>
    {canAnalyze && <button className="primary-btn intelligence-run" onClick={onAnalyze} disabled={analyzing}>
      {analyzing ? <LoaderCircle className="spin" size={16}/> : <Sparkles size={16}/>} {analyzing ? 'AI đang quan sát...' : 'Phân tích bằng AI'}
    </button>}
  </section>
}

function OpportunityList({ opportunities, onSelect }) {
  return <section className="intelligence-panel opportunity-engine">
    <div className="intelligence-panel-head">
      <div><span className="eyebrow">OPPORTUNITY ENGINE</span><h2>Cơ hội AI đề xuất</h2><p>Xếp hạng theo mức phù hợp, độ khẩn cấp, effort và evidence quan sát được.</p></div>
      {!!opportunities.length && <button className="text-btn" onClick={() => onSelect('opportunities')}>Xem tất cả <ArrowRight size={14}/></button>}
    </div>
    <div className="opportunity-list">{opportunities.slice(0, 4).map(item => <article className="opportunity-item" key={item.id}>
      <div className="opportunity-score"><b>{Math.round(item.score)}</b><small>/100</small></div>
      <div><span>{typeLabels[item.type] || item.type}</span><h3>{item.title}</h3><p>{item.summary}</p><small>{item.recommendation?.channel || 'Đa kênh'} · {item.recommendation?.timeframe || 'Ưu tiên theo kế hoạch'} · Tin cậy {Math.round((item.confidence || 0) * 100)}%</small></div>
      <button onClick={() => onSelect('opportunities')} aria-label={`Xem cơ hội ${item.title}`}><ArrowRight size={16}/></button>
    </article>)}</div>
    {!opportunities.length && <div className="panel-empty"><Sparkles size={18}/><span>Chạy Opportunity Engine để tạo đề xuất từ dữ liệu workspace và đối thủ.</span></div>}
  </section>
}

function Overview({ data, socialCount, canAnalyze, analyzing, onAnalyze, onSelect }) {
  const cards = [
    { title: 'Owned Radar', value: `${socialCount} kênh kết nối`, detail: socialCount ? 'Nguồn social công khai đang hoạt động' : 'Kết nối social để tăng ngữ cảnh', icon: Link2, tone: 'mint' },
    { title: 'Trend Radar', value: `${data.keywords.length} topic cluster`, detail: 'Toàn ngành · Google vs Facebook · 0–100', icon: TrendingUp, tone: 'gold' },
    { title: 'Opportunity Engine', value: `${data.opportunities.length} cơ hội`, detail: `Cập nhật ${dateLabel(data.generatedAt)}`, icon: Lightbulb, tone: 'peach' },
  ]
  return <>
    <section className="ai-insight-banner">
      <span><Sparkles size={20}/></span>
      <div><span className="eyebrow">AI MARKET BRIEF</span><b>{data.summary || 'Chưa có bản phân tích cho workspace này.'}</b><small>Mỗi kết luận cần evidence; website và social công khai được xem là dữ liệu không đáng tin cậy để phân tích, không phải chỉ dẫn.</small></div>
      {canAnalyze && <button onClick={onAnalyze} disabled={analyzing}>{analyzing ? <LoaderCircle className="spin" size={15}/> : <RefreshCw size={15}/>} {analyzing ? 'Đang phân tích...' : data.generatedAt ? 'Phân tích lại' : 'Chạy AI phân tích'}</button>}
    </section>
    <div className="intelligence-radar-grid">{cards.map(card => <RadarCard card={card} key={card.title}/>)}</div>
    <div className="intelligence-overview-grid">
      <OpportunityList opportunities={data.opportunities} onSelect={onSelect}/>
      <section className="intelligence-panel signal-panel">
        <div className="intelligence-panel-head"><div><span className="eyebrow">OBSERVATION STATUS</span><h2>Tín hiệu đáng chú ý</h2><p>Phân biệt dữ liệu quan sát với suy luận của AI.</p></div><ShieldAlert size={19}/></div>
        <div className="signal-list">
          <div><CheckCircle2 size={16}/><p><b>Social context</b><span>{socialCount ? `${socialCount} trang công khai đã sẵn sàng làm nguồn.` : 'Chưa có trang social được kết nối.'}</span></p></div>
          <div><Search size={16}/><p><b>Market-wide topics</b><span>{data.keywords.length ? `${data.keywords.length} topic cluster toàn ngành có chuỗi Google/Facebook 8 kỳ.` : 'Chưa có chuỗi trend được tạo.'}</span></p></div>
          <div><Sparkles size={16}/><p><b>AI confidence</b><span>Confidence được hiển thị theo từng cơ hội và từ khóa.</span></p></div>
        </div>
        <button className="primary-btn intelligence-action" onClick={() => onSelect(data.keywords.length ? 'trends' : 'social')}><TrendingUp size={16}/> {data.keywords.length ? 'Xem keyword trends' : 'Kết nối nguồn social'}</button>
      </section>
    </div>
  </>
}

function KeywordTrends({ keywords, canAnalyze, analyzing, onAnalyze }) {
  const [selectedId, setSelectedId] = useState('')
  const selected = keywords.find(item => item.id === selectedId) || keywords[0]
  const chartData = useMemo(() => {
    if (!selected) return []
    const size = Math.max(selected.googleTrend?.length || 0, selected.facebookTrend?.length || 0, 8)
    return Array.from({ length: size }, (_, index) => ({
      period: selected.periodLabels?.[index] || `Kỳ ${index + 1}`,
      google: selected.googleTrend?.[index] ?? null,
      facebook: selected.facebookTrend?.[index] ?? null,
    }))
  }, [selected])

  if (!keywords.length) return <IntelligenceEmpty title="Chưa có market trend" canAnalyze={canAnalyze} analyzing={analyzing} onAnalyze={onAnalyze}>AI sẽ mở rộng từ lĩnh vực, sản phẩm và khách hàng của công ty để quan sát topic trên Google Trends/Search và các tín hiệu Facebook công khai trong toàn thị trường.</IntelligenceEmpty>

  return <div className="keyword-trends-layout">
    <aside className="keyword-list-panel">
      <div><span className="eyebrow">MARKET TOPIC CLUSTERS</span><h2>Chủ đề toàn ngành</h2><small>{keywords.length} cluster theo intent và cơ hội SEO</small></div>
      {keywords.map(item => <button className={selected?.id === item.id ? 'active' : ''} onClick={() => setSelectedId(item.id)} key={item.id}>
        <span><b>{item.keyword}</b><small>{item.intent || 'Chưa xác định intent'}</small></span><em>{Math.round(item.relevance || 0)}</em>
      </button>)}
    </aside>
    <section className="trend-detail-panel">
      <header><div><span className="eyebrow">NORMALIZED INTEREST · 8 KỲ</span><h2>{selected.keyword}</h2><p>{selected.insight}</p></div><span className="confidence-pill">Tin cậy {Math.round((selected.confidence || 0) * 100)}%</span></header>
      <div className="trend-legend"><span><i className="google"/> Google Trends/Search</span><span><i className="facebook"/> Facebook công khai</span><small>Phạm vi thị trường quan sát được · chỉ số tương đối 0–100, không phải volume/reach tuyệt đối</small></div>
      <div className="trend-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 10, left: -24, bottom: 0 }}>
            <CartesianGrid stroke="#edf0ed" vertical={false}/><XAxis dataKey="period" tick={{ fontSize: 8, fill: '#879189' }} axisLine={false} tickLine={false}/><YAxis domain={[0, 100]} tick={{ fontSize: 8, fill: '#879189' }} axisLine={false} tickLine={false}/><Tooltip contentStyle={{ border: '1px solid #dfe6e1', borderRadius: 9, fontSize: 10 }}/>
            <Line type="monotone" dataKey="google" name="Google" stroke="#ea4335" strokeWidth={2.5} dot={{ r: 2.5 }} connectNulls/>
            <Line type="monotone" dataKey="facebook" name="Facebook" stroke="#0866ff" strokeWidth={2.5} dot={{ r: 2.5 }} connectNulls/>
          </LineChart>
        </ResponsiveContainer>
      </div>
      <footer><span>Quan sát lúc {dateLabel(selected.capturedAt)}</span><div>{(selected.sources || []).slice(0, 3).map(source => <a href={source} target="_blank" rel="noreferrer" key={source}>Nguồn <ExternalLink size={11}/></a>)}</div></footer>
    </section>
  </div>
}

function Opportunities({ opportunities, canAnalyze, analyzing, onAnalyze }) {
  if (!opportunities.length) return <IntelligenceEmpty title="Chưa có opportunity" canAnalyze={canAnalyze} analyzing={analyzing} onAnalyze={onAnalyze}>Thêm đối thủ, kết nối nguồn social rồi chạy AI để tìm cơ hội có evidence.</IntelligenceEmpty>
  return <div className="opportunity-board">{opportunities.map(item => <article key={item.id}>
    <header><span>{typeLabels[item.type] || item.type}</span><b>{Math.round(item.score)}<small>/100</small></b></header>
    <h2>{item.title}</h2><p>{item.summary}</p>
    <div className="opportunity-metrics"><span>Confidence <b>{Math.round((item.confidence || 0) * 100)}%</b></span><span>Urgency <b>{Math.round(item.urgency || 0)}</b></span><span>Effort <b>{Math.round(item.effort || 0)}</b></span></div>
    <div className="opportunity-recommendation"><b>Hành động đề xuất</b><span>{item.recommendation?.action || 'Cần marketer đánh giá thêm.'}</span><small>{item.recommendation?.channel || 'Đa kênh'} · {item.recommendation?.timeframe || 'Chưa xác định'}</small></div>
    <div className="evidence-list"><b>Evidence</b>{item.evidence?.map(evidence => evidence.sourceUrl ? <a href={evidence.sourceUrl} target="_blank" rel="noreferrer" key={evidence.id}>{evidence.payload?.note || evidence.sourceType}<ExternalLink size={11}/></a> : <span key={evidence.id}>{evidence.payload?.note || evidence.sourceType}</span>)}</div>
  </article>)}</div>
}

function ContentGaps({ opportunities, keywords, canAnalyze, analyzing, onAnalyze }) {
  const [stage, setStage] = useState('ALL')
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState('')
  const gaps = useMemo(() => opportunities.filter(item => ['CONTENT_GAP', 'KEYWORD_GAP'].includes(item.type)), [opportunities])
  const filtered = useMemo(() => gaps.filter(item => {
    const recommendation = item.recommendation || {}
    const matchesStage = stage === 'ALL' || recommendation.funnelStage === stage
    const haystack = [item.title, item.summary, recommendation.primaryKeyword, ...(recommendation.supportingKeywords || [])].join(' ').toLocaleLowerCase('vi')
    return matchesStage && haystack.includes(query.trim().toLocaleLowerCase('vi'))
  }), [gaps, query, stage])
  const highPriority = gaps.filter(item => item.score >= 75).length
  const searchable = gaps.filter(item => item.recommendation?.searchable !== false).length
  const competitors = new Set(gaps.flatMap(item => item.competitor?.name ? [item.competitor.name] : [])).size

  if (!gaps.length) return <IntelligenceEmpty title="Chưa có content gap" canAnalyze={canAnalyze} analyzing={analyzing} onAnalyze={onAnalyze}>AI sẽ đối chiếu topic toàn ngành, nội dung đối thủ, search intent và trend Google–Facebook để tạo backlog có evidence.</IntelligenceEmpty>

  return <div className="content-gap-view">
    <section className="content-gap-hero">
      <span><FileSearch size={21}/></span>
      <div><span className="eyebrow">AI CONTENT GAP ANALYSIS</span><h2>Backlog nội dung cần ưu tiên</h2><p>Khoảng trống được xếp theo customer impact, content-market fit, search potential và effort triển khai.</p></div>
      {canAnalyze && <button onClick={onAnalyze} disabled={analyzing}>{analyzing ? <LoaderCircle className="spin" size={15}/> : <RefreshCw size={15}/>} {analyzing ? 'Đang rà thị trường...' : 'Phân tích lại gaps'}</button>}
    </section>
    <div className="content-gap-stats">
      <article><Target size={17}/><span><b>{gaps.length}</b><small>Gap có evidence</small></span></article>
      <article><Sparkles size={17}/><span><b>{highPriority}</b><small>Ưu tiên từ 75 điểm</small></span></article>
      <article><Search size={17}/><span><b>{searchable}</b><small>Cơ hội searchable</small></span></article>
      <article><Radar size={17}/><span><b>{competitors}</b><small>Đối thủ được đối chiếu</small></span></article>
    </div>
    <section className="content-gap-workspace">
      <header className="content-gap-toolbar">
        <div><span className="eyebrow">PRIORITIZED BACKLOG</span><h2>{filtered.length} cơ hội nội dung</h2></div>
        <label><Search size={14}/><input aria-label="Tìm content gap" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm chủ đề hoặc keyword..."/></label>
        <select aria-label="Lọc theo hành trình" value={stage} onChange={event => setStage(event.target.value)}><option value="ALL">Tất cả hành trình</option>{Object.entries(stageLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
      </header>
      <div className="content-gap-list">{filtered.map(item => {
        const recommendation = item.recommendation || {}
        const isExpanded = expandedId === item.id
        return <article className={`content-gap-card ${isExpanded ? 'expanded' : ''}`} key={item.id}>
          <div className="content-gap-rank"><b>{Math.round(item.score)}</b><small>/100</small></div>
          <div className="content-gap-body">
            <div className="content-gap-labels"><span>{typeLabels[item.type]}</span><span>{stageLabels[recommendation.funnelStage] || 'Chưa rõ hành trình'}</span><span>{coverageLabels[recommendation.coverageStatus] || 'Cần đánh giá'}</span></div>
            <h3>{item.title}</h3><p>{item.summary}</p>
            <div className="content-gap-keyword"><Search size={13}/><span><small>Primary keyword</small><b>{recommendation.primaryKeyword || item.title}</b></span><em>{recommendation.contentFormat || 'Bài chuyên sâu'}</em></div>
            <div className="content-gap-tags">{recommendation.searchable !== false && <span>Searchable</span>}{recommendation.shareable && <span>Shareable</span>}{item.competitor?.name && <span>Đối chiếu: {item.competitor.name}</span>}<span>Tin cậy {Math.round((item.confidence || 0) * 100)}%</span></div>
            {isExpanded && <div className="content-gap-brief">
              <div><b>Vì sao đây là gap?</b><p>{recommendation.gapReason || 'AI xác định chủ đề có mức phù hợp cao nhưng độ phủ hiện tại chưa tương xứng.'}</p></div>
              <div><b>Hướng triển khai</b><p>{recommendation.action || 'Xây nội dung people-first, có dữ liệu và liên kết về cluster chính.'}</p><small>{recommendation.channel || 'SEO + Social'} · {recommendation.timeframe || 'Theo editorial calendar'}</small></div>
              {!!recommendation.supportingKeywords?.length && <div className="supporting-keywords"><b>Supporting keywords</b><p>{recommendation.supportingKeywords.map(keyword => <span key={keyword}>{keyword}</span>)}</p></div>}
              <div className="content-gap-evidence"><b>Evidence</b>{item.evidence?.map(evidence => evidence.sourceUrl ? <a href={evidence.sourceUrl} target="_blank" rel="noreferrer" key={evidence.id}>{evidence.payload?.note || evidence.sourceType}<ExternalLink size={11}/></a> : <span key={evidence.id}>{evidence.payload?.note || evidence.sourceType}</span>)}</div>
            </div>}
          </div>
          <button className="content-gap-toggle" onClick={() => setExpandedId(isExpanded ? '' : item.id)}>{isExpanded ? 'Thu gọn' : 'Xem brief'} <ArrowRight size={13}/></button>
        </article>
      })}</div>
      {!filtered.length && <div className="panel-empty"><Search size={17}/><span>Không có content gap phù hợp với bộ lọc.</span></div>}
    </section>
    <section className="content-cluster-section">
      <header><div><span className="eyebrow">TOPIC CLUSTER MAP</span><h2>Cụm chủ đề hỗ trợ topical authority</h2></div><small>Ưu tiên hub trước, sau đó liên kết các spoke theo search intent.</small></header>
      <div>{keywords.slice(0, 6).map(keyword => <article key={keyword.id}><span><Layers3 size={15}/></span><div><b>{keyword.keyword}</b><small>{keyword.intent || 'Mixed intent'} · Relevance {Math.round(keyword.relevance || 0)}</small></div><BookOpen size={15}/></article>)}</div>
    </section>
  </div>
}

function InsightPlaceholder({ tab }) {
  const copy = {
    campaigns: ['Campaign Watch', 'Theo dõi quảng cáo công khai từ Meta Ad Library và tín hiệu chiến dịch do marketer xác nhận.'],
  }[tab]
  return <section className="intelligence-empty"><span><BarChart3 size={23}/></span><h2>{copy[0]}</h2><p>{copy[1]}</p><div><b>Đang chuẩn bị dữ liệu</b><small>Nguồn và độ tin cậy sẽ luôn đi cùng từng tín hiệu.</small></div></section>
}

export default function IntelligenceCenter({ workspaceId, role }) {
  const [tab, setTab] = useState('competitors')
  const [data, setData] = useState({ summary: '', generatedAt: null, opportunities: [], keywords: [] })
  const [socialCount, setSocialCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const canAnalyze = role === 'ADMIN' || role === 'MARKETER'

  const load = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true); setError('')
    try {
      const [intelligence, social] = await Promise.all([
        apiRequest(`/workspaces/${workspaceId}/competitors/intelligence`),
        apiRequest(`/workspaces/${workspaceId}/integrations/social`),
      ])
      setData(intelligence); setSocialCount(social.length)
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }, [workspaceId])

  useEffect(() => { void load() }, [load])

  const analyze = async () => {
    setAnalyzing(true); setError('')
    try {
      const result = await apiRequest(`/workspaces/${workspaceId}/competitors/intelligence/analyze`, { method: 'POST' })
      setData(result)
    } catch (err) { setError(err.message) } finally { setAnalyzing(false) }
  }

  const title = tab === 'competitors' ? 'Radar đối thủ' : tab === 'social' ? 'Kết nối Social' : tab === 'gaps' ? 'Content Gaps' : 'Trung tâm Intelligence'
  return <div className="intelligence-center">
    <div className="feature-heading intelligence-heading"><div><span className="eyebrow">INTELLIGENCE CENTER</span><h1>{title}</h1><p>Quan sát nguồn sở hữu, thị trường và đối thủ để biến tín hiệu thành kế hoạch có evidence.</p></div><div className="intelligence-status"><i/> {data.generatedAt ? `AI cập nhật ${dateLabel(data.generatedAt)}` : 'Sẵn sàng phân tích'}</div></div>
    <div className="intelligence-tabs" role="tablist">{tabs.map(item => { const Icon = item.icon; return <button role="tab" aria-selected={tab === item.key} className={tab === item.key ? 'active' : ''} onClick={() => setTab(item.key)} key={item.key}><Icon size={15}/>{item.label}</button> })}</div>
    {error && <div className="inline-error intelligence-error">{error}</div>}
    {loading ? <div className="data-loading"><LoaderCircle className="spin" size={20}/> Đang tải Intelligence Center...</div>
      : tab === 'competitors' ? <CompetitorManager workspaceId={workspaceId} role={role} compact/>
        : tab === 'social' ? <SocialConnections workspaceId={workspaceId} role={role} onChanged={setSocialCount}/>
          : tab === 'overview' ? <Overview data={data} socialCount={socialCount} canAnalyze={canAnalyze} analyzing={analyzing} onAnalyze={analyze} onSelect={setTab}/>
            : tab === 'trends' ? <KeywordTrends keywords={data.keywords} canAnalyze={canAnalyze} analyzing={analyzing} onAnalyze={analyze}/>
              : tab === 'gaps' ? <ContentGaps opportunities={data.opportunities} keywords={data.keywords} canAnalyze={canAnalyze} analyzing={analyzing} onAnalyze={analyze}/>
              : tab === 'opportunities' ? <Opportunities opportunities={data.opportunities} canAnalyze={canAnalyze} analyzing={analyzing} onAnalyze={analyze}/>
                : <InsightPlaceholder tab={tab}/>} 
  </div>
}
