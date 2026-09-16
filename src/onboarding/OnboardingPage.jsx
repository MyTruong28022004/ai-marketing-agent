import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, BriefcaseBusiness, Building2, Check, CircleCheck,
  FileText, Globe2, LoaderCircle, LogOut, Megaphone, Radar, Sparkles,
  Target, UsersRound,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import CompetitorManager from '../features/competitors/CompetitorManager'
import { apiRequest } from '../lib/api'

const steps = [
  { key: 'COMPANY', label: 'Doanh nghiệp', hint: 'Thông tin cơ bản', icon: Building2 },
  { key: 'INDUSTRY', label: 'Lĩnh vực', hint: 'Ngành và mô hình', icon: BriefcaseBusiness },
  { key: 'OFFERING', label: 'Sản phẩm', hint: 'Bạn đang bán gì', icon: FileText },
  { key: 'AUDIENCE', label: 'Khách hàng', hint: 'Ai cần sản phẩm', icon: UsersRound },
  { key: 'GOALS', label: 'Mục tiêu', hint: 'Kết quả ưu tiên', icon: Target },
  { key: 'BRAND', label: 'Brand Voice', hint: 'Cách thương hiệu nói', icon: Sparkles },
  { key: 'SOURCES', label: 'Nguồn dữ liệu', hint: 'Website và Facebook', icon: Globe2 },
  { key: 'COMPETITORS', label: 'Đối thủ', hint: 'Thiết lập radar', icon: Radar },
]

const goalOptions = [
  ['Brand awareness', 'Tăng nhận diện thương hiệu'],
  ['Traffic', 'Tăng lượt truy cập website'],
  ['Leads', 'Thu thập khách hàng tiềm năng'],
  ['Revenue', 'Tăng doanh thu'],
  ['Retention', 'Giữ chân khách hàng'],
  ['Community', 'Xây dựng cộng đồng'],
]

const initialData = {
  legalName: '', website: '', country: 'VN', timezone: 'Asia/Ho_Chi_Minh', language: 'vi',
  industry: '', subIndustries: '', businessModel: 'B2C', description: '',
  productGroups: '', priceRange: '', differentiators: '',
  primaryAudience: '', audienceRegions: '', painPoints: '',
  goals: [], tone: '', wordsUse: '', wordsAvoid: '',
  facebookPageUrl: '', searchConsoleRequested: true,
}

function Field({ label, hint, children, wide = false }) {
  return <label className={`setup-field ${wide ? 'wide' : ''}`}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { workspace, role, user, logout, updateSelectedWorkspace } = useAuth()
  const [activeIndex, setActiveIndex] = useState(0)
  const [data, setData] = useState({ ...initialData, legalName: workspace?.name || '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [analyzingWebsite, setAnalyzingWebsite] = useState(false)
  const [websiteAnalysis, setWebsiteAnalysis] = useState(null)
  const [error, setError] = useState('')
  const [competitorCount, setCompetitorCount] = useState(0)

  useEffect(() => {
    if (!workspace?.id) return
    let active = true
    apiRequest(`/workspaces/${workspace.id}/onboarding`)
      .then(result => {
        if (!active) return
        const profile = result.companyProfile || {}
        const products = profile.products || {}
        const audiences = profile.audiences || {}
        const brand = profile.brandVoice || {}
        const sourceData = profile.onboardingData || {}
        setData(current => ({
          ...current,
          legalName: profile.legalName || result.name || '',
          website: profile.website || '',
          country: profile.country || 'VN',
          timezone: profile.timezone || 'Asia/Ho_Chi_Minh',
          language: profile.language || 'vi',
          industry: profile.industry || '',
          subIndustries: (profile.subIndustries || []).join(', '),
          businessModel: profile.businessModel || 'B2C',
          description: profile.description || '',
          productGroups: (products.groups || []).join(', '),
          priceRange: products.priceRange || '',
          differentiators: products.differentiators || '',
          primaryAudience: audiences.primary || '',
          audienceRegions: audiences.regions || '',
          painPoints: audiences.painPoints || '',
          goals: profile.goals || [],
          tone: (brand.tone || []).join(', '),
          wordsUse: brand.wordsUse || '',
          wordsAvoid: brand.wordsAvoid || '',
          facebookPageUrl: sourceData.facebookPageUrl || '',
          searchConsoleRequested: sourceData.searchConsoleRequested ?? true,
        }))
        const index = steps.findIndex(step => step.key === result.onboardingStep)
        setActiveIndex(index >= 0 ? index : 0)
      })
      .catch(err => setError(err.message))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [workspace?.id])

  const progress = useMemo(() => Math.round(((activeIndex + 1) / steps.length) * 100), [activeIndex])
  const step = steps[activeIndex]
  const update = event => {
    const { name, value, type, checked } = event.target
    setData(current => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }
  const toggleGoal = goal => setData(current => ({
    ...current,
    goals: current.goals.includes(goal) ? current.goals.filter(item => item !== goal) : [...current.goals, goal],
  }))
  const list = value => value.split(',').map(item => item.trim()).filter(Boolean)

  const analyzeWebsite = async () => {
    if (!data.website.trim()) {
      setError('Hãy nhập website trước khi phân tích.')
      return
    }

    setError('')
    setWebsiteAnalysis(null)
    setAnalyzingWebsite(true)
    try {
      const result = await apiRequest(`/workspaces/${workspace.id}/onboarding/analyze-website`, {
        method: 'POST',
        body: JSON.stringify({ website: data.website.trim() }),
      })
      const profile = result.profile || {}
      const suggestions = {
        legalName: profile.legalName,
        industry: profile.industry,
        subIndustries: profile.subIndustries?.join(', '),
        businessModel: profile.businessModel,
        description: profile.description,
        productGroups: profile.productGroups?.join(', '),
        priceRange: profile.priceRange,
        differentiators: profile.differentiators,
        primaryAudience: profile.primaryAudience,
        audienceRegions: profile.audienceRegions,
        painPoints: profile.painPoints,
        goals: profile.goals,
        tone: profile.tone?.join(', '),
        wordsUse: profile.wordsUse,
        wordsAvoid: profile.wordsAvoid,
        facebookPageUrl: profile.facebookPageUrl,
      }
      const usableSuggestions = Object.fromEntries(Object.entries(suggestions).filter(([, value]) => (
        Array.isArray(value) ? value.length > 0 : typeof value === 'string' && value.trim().length > 0
      )))
      setData(current => ({ ...current, ...usableSuggestions }))
      setWebsiteAnalysis({
        fields: Object.keys(usableSuggestions).length,
        summary: profile.summary,
        confidence: profile.confidence,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setAnalyzingWebsite(false)
    }
  }

  const validateStep = () => {
    if (step.key === 'COMPANY' && (!data.legalName.trim() || !data.website.trim())) return 'Hãy nhập tên công ty và website.'
    if (step.key === 'INDUSTRY' && (!data.industry.trim() || !data.description.trim())) return 'Hãy mô tả lĩnh vực và hoạt động chính.'
    if (step.key === 'OFFERING' && !data.productGroups.trim()) return 'Hãy nhập ít nhất một nhóm sản phẩm hoặc dịch vụ.'
    if (step.key === 'AUDIENCE' && !data.primaryAudience.trim()) return 'Hãy mô tả nhóm khách hàng chính.'
    if (step.key === 'GOALS' && data.goals.length === 0) return 'Hãy chọn ít nhất một mục tiêu.'
    if (step.key === 'BRAND' && !data.tone.trim()) return 'Hãy chọn hoặc mô tả giọng điệu thương hiệu.'
    return ''
  }

  const payloadForStep = nextStep => {
    const common = { currentStep: nextStep }
    if (step.key === 'COMPANY') return { ...common, legalName: data.legalName.trim(), website: data.website.trim(), country: data.country, timezone: data.timezone, language: data.language }
    if (step.key === 'INDUSTRY') return { ...common, industry: data.industry.trim(), subIndustries: list(data.subIndustries), businessModel: data.businessModel, description: data.description.trim() }
    if (step.key === 'OFFERING') return { ...common, products: { groups: list(data.productGroups), priceRange: data.priceRange.trim(), differentiators: data.differentiators.trim() } }
    if (step.key === 'AUDIENCE') return { ...common, audiences: { primary: data.primaryAudience.trim(), regions: data.audienceRegions.trim(), painPoints: data.painPoints.trim() } }
    if (step.key === 'GOALS') return { ...common, goals: data.goals }
    if (step.key === 'BRAND') return { ...common, brandVoice: { tone: list(data.tone), wordsUse: data.wordsUse.trim(), wordsAvoid: data.wordsAvoid.trim() } }
    if (step.key === 'SOURCES') return { ...common, onboardingData: { facebookPageUrl: data.facebookPageUrl.trim(), searchConsoleRequested: data.searchConsoleRequested } }
    return common
  }

  const next = async () => {
    const validationError = validateStep()
    if (validationError) { setError(validationError); return }
    setError('')
    setSaving(true)
    try {
      if (activeIndex === steps.length - 1) {
        const result = await apiRequest(`/workspaces/${workspace.id}/onboarding`, {
          method: 'PATCH',
          body: JSON.stringify({ completed: true }),
        })
        updateSelectedWorkspace(result)
        navigate('/')
      } else {
        const nextStep = steps[activeIndex + 1].key
        const result = await apiRequest(`/workspaces/${workspace.id}/onboarding`, {
          method: 'PATCH',
          body: JSON.stringify(payloadForStep(nextStep)),
        })
        updateSelectedWorkspace(result)
        setActiveIndex(index => index + 1)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const onCompetitorCount = useCallback(count => setCompetitorCount(count), [])

  if (role !== 'ADMIN') return <div className="setup-waiting">
    <div className="setup-waiting-card"><span><Sparkles size={24}/></span><h1>Workspace đang được thiết lập</h1><p>Admin của <b>{workspace?.name}</b> cần hoàn tất hồ sơ doanh nghiệp trước khi đội ngũ có thể bắt đầu.</p><button className="outline-btn" onClick={logout}><LogOut size={16}/> Đăng xuất</button></div>
  </div>

  return <div className="setup-page">
    <aside className="setup-sidebar">
      <div className="auth-brand setup-brand"><span className="auth-logo">M<i /></span><span><b>Milo</b><small>MARKETING AI</small></span></div>
      <div className="setup-intro"><span>THIẾT LẬP WORKSPACE</span><h2>Giúp Milo hiểu<br/>doanh nghiệp của bạn.</h2><p>Thông tin này được dùng để cá nhân hoá radar và đề xuất nội dung.</p></div>
      <div className="setup-steps">
        {steps.map((item, index) => { const Icon = item.icon; const done = index < activeIndex; return <button type="button" key={item.key} onClick={() => index <= activeIndex && setActiveIndex(index)} className={`${index === activeIndex ? 'active' : ''} ${done ? 'done' : ''}`}>
          <span>{done ? <Check size={15}/> : <Icon size={16}/>}</span><p><b>{item.label}</b><small>{item.hint}</small></p>
        </button>})}
      </div>
      <div className="setup-progress"><div><span>Tiến độ</span><b>{progress}%</b></div><i><em style={{width: `${progress}%`}}/></i></div>
    </aside>

    <main className="setup-main">
      <header className="setup-topbar"><span>{workspace?.name}</span><div><small>{user?.email}</small><button onClick={logout} aria-label="Đăng xuất"><LogOut size={17}/></button></div></header>
      <div className="setup-content">
        {loading ? <div className="setup-loading"><LoaderCircle className="spin" size={25}/><span>Đang tải hồ sơ doanh nghiệp...</span></div> : <>
          <div className="setup-step-heading"><span>BƯỚC {activeIndex + 1} / {steps.length}</span><h1>{step.label}</h1><p>{step.key === 'COMPANY' ? 'Bắt đầu với những thông tin khách hàng có thể nhìn thấy.' : step.key === 'INDUSTRY' ? 'Milo dùng ngữ cảnh ngành để lọc trend phù hợp.' : step.key === 'OFFERING' ? 'Cho Milo biết sản phẩm nào cần ưu tiên tăng trưởng.' : step.key === 'AUDIENCE' ? 'Mô tả người bạn muốn tiếp cận và vấn đề của họ.' : step.key === 'GOALS' ? 'Chọn kết quả quan trọng nhất trong 90 ngày tới.' : step.key === 'BRAND' ? 'Thiết lập nguyên tắc để nội dung luôn đúng chất thương hiệu.' : step.key === 'SOURCES' ? 'Khai báo hai nguồn dữ liệu chính của workspace.' : 'Để AI tìm và phân tích top 10 đối thủ, sau đó chỉnh sửa watchlist nếu cần.'}</p></div>

          <div className="setup-form-card">
            {step.key === 'COMPANY' && <>
              <div className="setup-form-grid">
                <Field label="Tên pháp lý / thương hiệu" wide><input required name="legalName" value={data.legalName} onChange={update} placeholder="Tên công ty" /></Field>
                <Field label="Website công ty" hint="Bao gồm https://" wide><input required type="url" name="website" value={data.website} onChange={update} placeholder="https://congty.vn" /></Field>
                <Field label="Quốc gia"><select name="country" value={data.country} onChange={update}><option value="VN">Việt Nam</option><option value="JP">Nhật Bản</option><option value="SG">Singapore</option><option value="US">Hoa Kỳ</option></select></Field>
                <Field label="Ngôn ngữ"><select name="language" value={data.language} onChange={update}><option value="vi">Tiếng Việt</option><option value="en">English</option><option value="ja">日本語</option></select></Field>
                <Field label="Múi giờ" wide><select name="timezone" value={data.timezone} onChange={update}><option value="Asia/Ho_Chi_Minh">GMT+7 · Việt Nam</option><option value="Asia/Tokyo">GMT+9 · Tokyo</option><option value="Asia/Singapore">GMT+8 · Singapore</option></select></Field>
              </div>
              <div className={`website-ai-card ${websiteAnalysis ? 'complete' : ''}`}>
                <span className="website-ai-icon"><Sparkles size={19}/></span>
                <div>
                  <b>{websiteAnalysis ? `Codex đã điền trước ${websiteAnalysis.fields} trường` : 'Để Codex đọc website và điền giúp bạn'}</b>
                  <p>{websiteAnalysis?.summary || 'Codex sẽ đọc nội dung công khai trên website để gợi ý lĩnh vực, sản phẩm, khách hàng, mục tiêu và Brand Voice. Bạn vẫn có thể kiểm tra và sửa từng bước.'}</p>
                  {websiteAnalysis && <small>Độ tin cậy ước tính: {Math.round((websiteAnalysis.confidence || 0) * 100)}%</small>}
                </div>
                <button type="button" onClick={analyzeWebsite} disabled={analyzingWebsite || !data.website.trim()}>
                  {analyzingWebsite ? <><LoaderCircle className="spin" size={16}/> Đang đọc website...</> : <><Sparkles size={16}/> {websiteAnalysis ? 'Phân tích lại' : 'Tự động điền'}</>}
                </button>
              </div>
            </>}

            {step.key === 'INDUSTRY' && <div className="setup-form-grid">
              <Field label="Lĩnh vực chính"><input name="industry" value={data.industry} onChange={update} placeholder="Ví dụ: Thời trang" /></Field>
              <Field label="Mô hình kinh doanh"><select name="businessModel" value={data.businessModel} onChange={update}><option value="B2C">B2C</option><option value="B2B">B2B</option><option value="B2B2C">B2B2C</option><option value="Marketplace">Marketplace</option></select></Field>
              <Field label="Lĩnh vực phụ" hint="Phân tách bằng dấu phẩy" wide><input name="subIndustries" value={data.subIndustries} onChange={update} placeholder="Linen, Phụ kiện, Lifestyle" /></Field>
              <Field label="Mô tả hoạt động" wide><textarea name="description" value={data.description} onChange={update} rows="4" placeholder="Công ty cung cấp sản phẩm gì, cho ai và tại thị trường nào?" /></Field>
            </div>}

            {step.key === 'OFFERING' && <div className="setup-form-grid">
              <Field label="Nhóm sản phẩm / dịch vụ" hint="Phân tách bằng dấu phẩy" wide><input name="productGroups" value={data.productGroups} onChange={update} placeholder="Váy linen, Áo sơ mi, Phụ kiện" /></Field>
              <Field label="Khoảng giá"><input name="priceRange" value={data.priceRange} onChange={update} placeholder="500.000đ – 2.000.000đ" /></Field>
              <Field label="Điểm khác biệt" wide><textarea name="differentiators" value={data.differentiators} onChange={update} rows="4" placeholder="Chất liệu, quy trình, dịch vụ hoặc lợi thế mà đối thủ khó sao chép" /></Field>
            </div>}

            {step.key === 'AUDIENCE' && <div className="setup-form-grid">
              <Field label="Khách hàng chính" wide><textarea name="primaryAudience" value={data.primaryAudience} onChange={update} rows="3" placeholder="Ví dụ: Nữ 25–40 tuổi, sống tại thành phố, yêu thích phong cách tối giản" /></Field>
              <Field label="Khu vực ưu tiên"><input name="audienceRegions" value={data.audienceRegions} onChange={update} placeholder="Hà Nội, TP.HCM, Đà Nẵng" /></Field>
              <Field label="Vấn đề cần giải quyết" wide><textarea name="painPoints" value={data.painPoints} onChange={update} rows="4" placeholder="Khách hàng đang gặp khó khăn hoặc mong muốn điều gì?" /></Field>
            </div>}

            {step.key === 'GOALS' && <div className="goal-grid">{goalOptions.map(([value, label]) => <button type="button" className={data.goals.includes(value) ? 'selected' : ''} onClick={() => toggleGoal(value)} key={value}><span>{data.goals.includes(value) && <Check size={15}/>}</span><p><b>{label}</b><small>{value}</small></p></button>)}</div>}

            {step.key === 'BRAND' && <div className="setup-form-grid">
              <Field label="Giọng điệu thương hiệu" hint="Phân tách bằng dấu phẩy" wide><input name="tone" value={data.tone} onChange={update} placeholder="Tinh tế, gần gũi, tự tin" /></Field>
              <Field label="Từ ngữ nên dùng" wide><textarea name="wordsUse" value={data.wordsUse} onChange={update} rows="3" placeholder="Những cách diễn đạt đặc trưng của thương hiệu" /></Field>
              <Field label="Từ ngữ cần tránh" wide><textarea name="wordsAvoid" value={data.wordsAvoid} onChange={update} rows="3" placeholder="Từ ngữ, cách hứa hẹn hoặc chủ đề không nên sử dụng" /></Field>
            </div>}

            {step.key === 'SOURCES' && <div className="source-setup">
              <div className="source-card ready"><span><Globe2 size={21}/></span><div><b>Website công ty</b><small>Nguồn nội dung, sản phẩm và tín hiệu SEO</small></div><em><CircleCheck size={15}/> Đã khai báo</em><p>{data.website || 'Chưa có URL website'}</p></div>
              <div className="source-card"><span><Megaphone size={21}/></span><div><b>Facebook Page</b><small>Nguồn bài đăng và tín hiệu tương tác first-party</small></div><em>Chờ OAuth</em><input aria-label="Facebook Page" type="url" name="facebookPageUrl" value={data.facebookPageUrl} onChange={update} placeholder="https://facebook.com/ten-page" /></div>
              <label className="setup-check"><input type="checkbox" name="searchConsoleRequested" checked={data.searchConsoleRequested} onChange={update}/><span><b>Kết nối Google Search Console ở bước Tích hợp</b><small>Milo sẽ lấy impression, click, CTR và vị trí keyword sau khi OAuth được triển khai.</small></span></label>
            </div>}

            {step.key === 'COMPETITORS' && <CompetitorManager workspaceId={workspace.id} role={role} compact onCountChange={onCompetitorCount} />}
          </div>

          {error && <div className="setup-error">{error}</div>}
          <footer className="setup-actions">
            <button className="setup-back" disabled={activeIndex === 0 || saving} onClick={() => { setError(''); setActiveIndex(index => index - 1) }}><ArrowLeft size={16}/> Quay lại</button>
            <div>{step.key === 'COMPETITORS' && <small>{competitorCount === 0 ? 'Bạn có thể thêm đối thủ sau.' : `Đã thêm ${competitorCount} đối thủ.`}</small>}<button className="setup-next" disabled={saving} onClick={next}>{saving ? <LoaderCircle className="spin" size={17}/> : <>{activeIndex === steps.length - 1 ? 'Hoàn tất thiết lập' : 'Lưu và tiếp tục'}<ArrowRight size={17}/></>}</button></div>
          </footer>
        </>}
      </div>
    </main>
  </div>
}
