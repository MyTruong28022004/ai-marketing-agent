import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, Clock3, Download,
  FileText, Film, FolderOpen, ImagePlus, Layers3, Mic2, Monitor,
  Plus, RefreshCw, Search, Smartphone, Sparkles, Trash2, Upload, Video,
  Volume2, WandSparkles, X,
} from "lucide-react";
import { apiRequest } from "../../lib/api";
import CreativeVideoEditor from "./CreativeVideoEditor";

const starterScripts = [
  { id: "linen-story", label: "Từ Content Studio", title: "Linen nhẹ và xanh", channel: "Instagram Reels", topic: "Bộ sưu tập linen mùa hè", script: "Linen tự nhiên thoáng mát, mềm dần theo thời gian. Khám phá bộ sưu tập mới ngay hôm nay." },
  { id: "styling-tips", label: "Từ Kế hoạch tuần", title: "3 cách phối linen", channel: "TikTok", topic: "Mẹo phối đồ linen", script: "Ba cách phối linen giúp bạn mặc đẹp mà vẫn thoải mái: sơ mi cùng quần suông, váy dài cùng sandal, hoặc khoác ngoài áo hai dây. Lưu lại để thử ngay tuần này nhé." },
  { id: "brand-note", label: "Từ Brand Brain", title: "Vì sao chọn linen?", channel: "YouTube Shorts", topic: "Câu chuyện thương hiệu", script: "Chúng tôi chọn linen vì vẻ đẹp mộc mạc, càng mặc càng mềm và bền bỉ theo năm tháng. Ít hơn, tốt hơn và thật sự thuộc về bạn." },
];

const formats = [
  { value: "9:16", label: "Dọc", note: "Reels · TikTok", icon: Smartphone },
  { value: "1:1", label: "Vuông", note: "Facebook · Feed", icon: Layers3 },
  { value: "16:9", label: "Ngang", note: "YouTube · Website", icon: Monitor },
];
const tones = ["Ấm áp, tinh tế", "Trẻ trung, năng động", "Chuyên gia, thuyết phục", "Gần gũi như UGC", "Tối giản, cao cấp"];
const paces = [
  { id: "slow", name: "Chậm rãi" },
  { id: "balanced", name: "Cân bằng" },
  { id: "fast", name: "Nhanh" },
];
const hooks = [
  { id: "question", name: "Câu hỏi" },
  { id: "statement", name: "Tuyên bố" },
  { id: "story", name: "Kể chuyện" },
  { id: "benefit", name: "Lợi ích" },
];
const steps = ["Ý tưởng", "Kịch bản", "Hình ảnh", "Giọng đọc", "Biên tập & xuất"];
const statusLabels = {
  DRAFT: "Bản nháp", PLANNING: "Lên storyboard", GENERATING_ASSETS: "Tạo tài nguyên",
  READY_TO_EDIT: "Sẵn sàng", RENDERING: "Đang render", COMPLETED: "Hoàn tất", FAILED: "Có lỗi",
};
const busyStatuses = new Set(["PLANNING", "GENERATING_ASSETS", "RENDERING"]);

const initialForm = (workspaceId) => ({
  workspaceId,
  topic: starterScripts[0].topic,
  title: starterScripts[0].title,
  script: starterScripts[0].script,
  channel: starterScripts[0].channel,
  language: "vi",
  wordCount: 140,
  ratio: "9:16",
  tone: tones[0],
  visualStyle: "editorial",
  pace: "balanced",
  hookStyle: "statement",
  audience: "",
  callToAction: "Khám phá ngay",
  voiceChoice: "builtin:marin",
  voiceInstructions: "Đọc tiếng Việt tự nhiên, ấm áp, rõ ràng và nhấn nhẹ ở CTA.",
  sceneCount: 5,
  captions: true,
});

const secondsLabel = (value) => {
  const seconds = Math.round((value || 0) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
};
const errorText = (error) => error?.message || "Có lỗi xảy ra. Vui lòng thử lại.";
const countWords = (value) => value.trim().split(/\s+/).filter(Boolean).length;

function WorkflowSteps({ current }) {
  return (
    <div className="video-flow-steps" aria-label="Tiến trình tạo video">
      {steps.map((label, index) => (
        <React.Fragment key={label}>
          <button type="button" className={current >= index + 1 ? "active" : ""} disabled={index + 1 > current}>
            <i>{current > index + 1 ? <Check size={11} /> : index + 1}</i>
            <span>{label}</span>
          </button>
          {index < steps.length - 1 && <b className={current > index + 1 ? "active" : ""} />}
        </React.Fragment>
      ))}
    </div>
  );
}
function SourcePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="script-source-picker">
      <button type="button" onClick={() => setOpen(!open)}>
        <span className="source-symbol"><Sparkles size={17} /></span>
        <span><small>{value.label}</small><b>{value.title}</b></span>
        <span className="source-channel">{value.channel}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="script-source-menu">
          {starterScripts.map((item) => (
            <button type="button" key={item.id} onClick={() => { onChange(item); setOpen(false); }}>
              <span><b>{item.title}</b><small>{item.label} · {item.channel}</small></span>
              {item.id === value.id && <Check size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VoiceCreator({ onClose, onCreated }) {
  const [name, setName] = useState("Giọng thương hiệu");
  const [consent, setConsent] = useState(null);
  const [sample, setSample] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const data = new FormData();
      data.set("name", name);
      data.set("language", "vi");
      data.set("consent", consent);
      data.set("sample", sample);
      await onCreated(data);
      onClose();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="video-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="voice-upload-modal" onSubmit={submit}>
        <button type="button" className="modal-close" onClick={onClose}><X size={17} /></button>
        <span className="export-orb"><Mic2 size={22} /></span>
        <p>OPENAI CUSTOM VOICE</p>
        <h2>Thêm giọng nói riêng</h2>
        <small>Cần bản ghi xác nhận quyền sử dụng và một mẫu giọng sạch, tối đa 30 giây.</small>
        <label><span>Tên giọng</span><input value={name} maxLength="80" onChange={(event) => setName(event.target.value)} required /></label>
        <label className="voice-file">
          <span>1. Bản ghi xác nhận quyền sử dụng</span>
          <input type="file" accept="audio/*,video/*" onChange={(event) => setConsent(event.target.files[0])} required />
          <b>{consent?.name || "Chọn file consent"}</b>
        </label>
        <label className="voice-file">
          <span>2. Mẫu giọng muốn mô phỏng</span>
          <input type="file" accept="audio/*,video/*" onChange={(event) => setSample(event.target.files[0])} required />
          <b>{sample?.name || "Chọn voice sample"}</b>
        </label>
        <button className="video-generate-btn" disabled={busy || !consent || !sample}>
          {busy ? "Đang tải lên..." : "Tạo custom voice"}
        </button>
      </form>
    </div>
  );
}

function IdeaStep({ form, setForm, source, setSource, config, busy, onGenerate, onNext }) {
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const selectSource = (item) => {
    setSource(item);
    setForm((current) => ({ ...current, topic: item.topic, title: item.title, script: item.script, channel: item.channel }));
  };
  const importScript = async (file) => {
    if (!file) return;
    const text = await file.text();
    setForm((current) => ({ ...current, script: text.slice(0, 12000), title: current.title || file.name.replace(/\.[^.]+$/, "") }));
  };
  return (
    <div className="video-flow-card video-idea-step">
      <header className="video-flow-title">
        <span><WandSparkles size={19} /></span>
        <div><p>BƯỚC 1</p><h2>Ý tưởng và nguồn kịch bản</h2><small>Nhập nội dung có sẵn hoặc để AI viết bản nháp theo Brand Brain.</small></div>
      </header>
      <SourcePicker value={source} onChange={selectSource} />
      <div className="video-flow-grid two">
        <label className="video-control wide"><span>Chủ đề video</span><input value={form.topic} onChange={(event) => set("topic", event.target.value)} placeholder="Bạn muốn kể câu chuyện gì?" /></label>
        <label className="video-control"><span>Ngôn ngữ</span><select value={form.language} onChange={(event) => set("language", event.target.value)}><option value="vi">Tiếng Việt</option><option value="en">English</option></select></label>
        <label className="video-control"><span>Độ dài mục tiêu</span><select value={form.wordCount} onChange={(event) => set("wordCount", Number(event.target.value))}>{[80, 120, 140, 180, 240].map((value) => <option key={value} value={value}>{value} từ</option>)}</select></label>
        <label className="video-control"><span>Văn phong</span><select value={form.tone} onChange={(event) => set("tone", event.target.value)}>{tones.map((tone) => <option key={tone}>{tone}</option>)}</select></label>
        <label className="video-control"><span>Phong cách hình ảnh</span><select value={form.visualStyle} onChange={(event) => set("visualStyle", event.target.value)}>{(config.styles || []).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label className="video-control"><span>Khán giả mục tiêu</span><input value={form.audience} onChange={(event) => set("audience", event.target.value)} placeholder="VD: Nữ 25–35 yêu thời trang" /></label>
        <label className="video-control"><span>CTA</span><input value={form.callToAction} onChange={(event) => set("callToAction", event.target.value)} placeholder="VD: Khám phá ngay" /></label>
      </div>
      <div className="video-script-field flow-script-input">
        <span><b>Kịch bản đầu vào</b><small>{countWords(form.script)} từ</small></span>
        <textarea rows="8" value={form.script} onChange={(event) => set("script", event.target.value)} placeholder="Dán hoặc viết kịch bản tại đây..." />
      </div>
      <div className="video-flow-actions split">
        <label className="flow-file-button"><Upload size={15} /> Nhập .txt/.md<input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={(event) => importScript(event.target.files?.[0])} /></label>
        <div>
          <button type="button" className="flow-secondary" disabled={busy || form.topic.trim().length < 2} onClick={onGenerate}><Sparkles size={15} /> {busy ? "Đang viết..." : "AI viết kịch bản"}</button>
          <button type="button" className="flow-primary" disabled={form.script.trim().length < 20} onClick={onNext}>Duyệt kịch bản <ArrowRight size={15} /></button>
        </div>
      </div>
    </div>
  );
}

function ScriptStep({ form, setForm, config, busy, onBack, onCreate }) {
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  return (
    <div className="video-review-layout">
      <section className="video-flow-card">
        <header className="video-flow-title"><span><FileText size={19} /></span><div><p>BƯỚC 2</p><h2>Duyệt kịch bản</h2><small>Chỉnh lời đọc trước khi tách storyboard và sinh hình.</small></div></header>
        <label className="video-script-field"><span><b>Tiêu đề video</b></span><input value={form.title} onChange={(event) => set("title", event.target.value)} /></label>
        <label className="video-script-field"><span><b>Nội dung kịch bản</b><small>{countWords(form.script)} từ</small></span><textarea rows="14" value={form.script} onChange={(event) => set("script", event.target.value)} /></label>
      </section>
      <aside className="video-flow-card">
        <header className="video-flow-title compact"><span><Film size={17} /></span><div><p>STORYBOARD</p><h2>Thiết lập đầu ra</h2></div></header>
        <div className="format-options">
          {formats.map((item) => {
            const Icon = item.icon;
            return <button type="button" className={form.ratio === item.value ? "active" : ""} key={item.value} onClick={() => set("ratio", item.value)}><Icon size={18} /><span><b>{item.label} · {item.value}</b><small>{item.note}</small></span>{form.ratio === item.value && <Check size={15} />}</button>;
          })}
        </div>
        <label className="video-control"><span>Số phân cảnh</span><select value={form.sceneCount} onChange={(event) => set("sceneCount", Number(event.target.value))}>{[2, 3, 4, 5, 6, 7, 8].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="video-control"><span>Phong cách hook</span><select value={form.hookStyle} onChange={(event) => set("hookStyle", event.target.value)}>{hooks.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label className="video-control"><span>Nhịp video</span><select value={form.pace} onChange={(event) => set("pace", event.target.value)}>{paces.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label className="caption-check"><input type="checkbox" checked={form.captions} onChange={(event) => set("captions", event.target.checked)} /><span><b>Tạo phụ đề tự động</b><small>Burn-in khi render MP4</small></span></label>
        <div className={`video-ai-state ${config.configured ? "ready" : ""}`}><Sparkles size={15} /><span><b>{config.configured ? "OpenAI Media đã sẵn sàng" : "Chưa có OPENAI_API_KEY"}</b><small>{config.configured ? `${config.imageModel} · ${config.speechModel}` : "Bạn vẫn có thể tải ảnh/video riêng lên từng cảnh."}</small></span></div>
        <div className="video-flow-actions"><button type="button" className="flow-secondary" onClick={onBack}><ArrowLeft size={15} /> Quay lại</button><button type="button" className="flow-primary" disabled={busy || form.script.trim().length < 20 || !form.title.trim()} onClick={onCreate}>{busy ? <RefreshCw className="spin" size={15} /> : <ImagePlus size={15} />} {busy ? "Đang tạo..." : "Tạo storyboard & hình ảnh"}</button></div>
      </aside>
    </div>
  );
}

function StoryboardMock({ project, onBack, onConfirm }) {
  return (
    <div className="video-flow-card storyboard-mock">
      <header className="video-flow-title"><span><Film size={19} /></span><div><p>BƯỚC 3 · MOCK STORYBOARD</p><h2>Duyệt storyboard trước khi tạo hình</h2><small>Kiểm tra nhịp kể, lời thoại và prompt của từng cảnh trước khi đưa vào editor.</small></div></header>
      <div className="storyboard-mock-list">
        {(project?.scenes || []).map((scene, index) => (
          <article key={scene.id}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{scene.title}</h3><p>{scene.narration || "Chưa có lời thoại"}</p><small>{scene.visualPrompt || "Chưa có visual prompt"}</small></div><b>{secondsLabel(scene.durationMs)}</b></article>
        ))}
      </div>
      <div className="video-flow-actions"><button type="button" className="flow-secondary" onClick={onBack}><ArrowLeft size={15} /> Sửa kịch bản</button><button type="button" className="flow-primary" onClick={onConfirm}>Duyệt storyboard & tạo hình <ArrowRight size={15} /></button></div>
    </div>
  );
}

function ImagesStep({ project, config, busy, storyboardConfirmed, onConfirmStoryboard, onBack, onNext, onGenerateAll, onRegenerate, onUpload }) {
  const missing = project?.scenes?.filter((scene) => !scene.visualUrl).length || 0;
  if (!storyboardConfirmed) return <StoryboardMock project={project} onBack={onBack} onConfirm={onConfirmStoryboard} />;
  return (
    <div className="video-flow-card">
      <header className="video-flow-title"><span><ImagePlus size={19} /></span><div><p>BƯỚC 3</p><h2>Hình ảnh cho từng phân cảnh</h2><small>Giữ ảnh AI, tạo lại theo prompt hoặc tải ảnh/video riêng.</small></div></header>
      {project?.errorMessage && <div className="video-project-alert">{project.errorMessage}</div>}
      <div className="scene-image-grid">
        {(project?.scenes || []).map((scene, index) => (
          <article key={scene.id}>
            <div className={`scene-image-preview ratio-${project.ratio.replace(":", "-")}`}>
              {scene.visualUrl ? (scene.visualMimeType?.startsWith("video/") ? <video src={scene.visualUrl} muted /> : <img src={scene.visualUrl} alt={scene.title} />) : <span><ImagePlus size={28} /><b>Chưa có hình</b></span>}
              <i>Cảnh {index + 1}</i>
            </div>
            <div className="scene-image-copy"><h3>{scene.title}</h3><p>{scene.visualPrompt}</p></div>
            <footer>
              <button type="button" disabled={busy || !config.configured} onClick={() => onRegenerate(scene.id)}><RefreshCw size={13} /> Tạo lại</button>
              <label><Upload size={13} /> Tải lên<input type="file" accept="image/*,video/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(scene.id, file); event.target.value = ""; }} /></label>
            </footer>
          </article>
        ))}
      </div>
      <div className="video-flow-actions split">
        <button type="button" className="flow-secondary" onClick={onBack}><ArrowLeft size={15} /> Sửa kịch bản</button>
        <div>
          <button type="button" className="flow-secondary" disabled={busy || !config.configured} onClick={onGenerateAll}><RefreshCw size={15} /> Tạo lại tất cả</button>
          <button type="button" className="flow-primary" disabled={busy || missing > 0} onClick={onNext}>Chọn giọng đọc <ArrowRight size={15} /></button>
        </div>
      </div>
      {missing > 0 && <p className="flow-help">Còn {missing} cảnh chưa có hình. Tạo bằng AI hoặc tải file lên để tiếp tục.</p>}
    </div>
  );
}

function VoiceStep({ form, setForm, config, voices, project, busy, onBack, onGenerate, onSkip, onCreateVoice }) {
  const [voiceModal, setVoiceModal] = useState(false);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const audioCount = project?.scenes?.filter((scene) => scene.narrationUrl).length || 0;
  return (
    <div className="video-voice-layout">
      <section className="video-flow-card">
        <header className="video-flow-title"><span><Mic2 size={19} /></span><div><p>BƯỚC 4</p><h2>Giọng đọc và nhịp kể</h2><small>Chọn voice, nghe từng cảnh rồi chuyển sang editor.</small></div></header>
        <div className="voice-choice-grid">
          {(config.builtInVoices || []).map((voice) => (
            <button type="button" key={voice.id} className={form.voiceChoice === `builtin:${voice.id}` ? "active" : ""} onClick={() => set("voiceChoice", `builtin:${voice.id}`)}><span>{voice.name.slice(0, 1)}</span><div><b>{voice.name}</b><small>{voice.description}</small></div>{form.voiceChoice === `builtin:${voice.id}` && <Check size={14} />}</button>
          ))}
          {voices.filter((voice) => voice.status === "READY").map((voice) => (
            <button type="button" key={voice.id} className={form.voiceChoice === `custom:${voice.id}` ? "active" : ""} onClick={() => set("voiceChoice", `custom:${voice.id}`)}><span>{voice.name.slice(0, 1)}</span><div><b>{voice.name}</b><small>Giọng riêng đã xác minh</small></div>{form.voiceChoice === `custom:${voice.id}` && <Check size={14} />}</button>
          ))}
        </div>
        <button type="button" className="voice-add-button" disabled={!config.customVoices} onClick={() => setVoiceModal(true)}><Mic2 size={15} /> Thêm giọng riêng</button>
        <label className="video-control"><span>Chỉ dẫn giọng đọc</span><textarea rows="4" value={form.voiceInstructions} onChange={(event) => set("voiceInstructions", event.target.value)} /></label>
        <div className="video-flow-actions"><button type="button" className="flow-secondary" onClick={onBack}><ArrowLeft size={15} /> Hình ảnh</button><button type="button" className="flow-primary" disabled={busy || !config.configured} onClick={onGenerate}>{busy ? <RefreshCw className="spin" size={15} /> : <Volume2 size={15} />} {busy ? "Đang tạo audio..." : "Tạo audio & tiếp tục"}</button></div>
        {!config.configured && <button type="button" className="flow-link" onClick={onSkip}>Bỏ qua voice và mở editor</button>}
      </section>
      <aside className="video-flow-card voice-scene-list">
        <header><div><p>AUDIO THEO CẢNH</p><h3>{audioCount}/{project?.scenes?.length || 0} cảnh đã có voice</h3></div><Volume2 size={18} /></header>
        {(project?.scenes || []).map((scene, index) => <article key={scene.id}><span>{index + 1}</span><div><b>{scene.title}</b><p>{scene.narration}</p>{scene.narrationUrl ? <audio controls src={scene.narrationUrl} /> : <small>Chưa tạo audio</small>}</div></article>)}
      </aside>
      {voiceModal && <VoiceCreator onClose={() => setVoiceModal(false)} onCreated={async (data) => { await onCreateVoice(data); setVoiceModal(false); }} />}
    </div>
  );
}

function EditorStep({ project, workspaceId, onBack }) {
  return <CreativeVideoEditor project={project} workspaceId={workspaceId} onBack={onBack} />;
}

function VideoLibrary({ videos, loading, onCreate, onOpen, onDelete }) {
  const [query, setQuery] = useState("");
  const filtered = videos.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="video-library">
      <div className="library-heading"><div><p>VIDEO STUDIO</p><h1>Thư viện video</h1><span>Project, asset và bản MP4 được lưu theo workspace.</span></div><button onClick={onCreate}><Plus size={16} /> Tạo video mới</button></div>
      <div className="library-stats">
        <article><span><Video size={18} /></span><div><small>Tổng project</small><b>{videos.length}</b></div></article>
        <article><span><Clock3 size={18} /></span><div><small>Tổng thời lượng</small><b>{secondsLabel(videos.reduce((sum, item) => sum + (item.durationMs || 0), 0))}</b></div></article>
        <article><span><Sparkles size={18} /></span><div><small>Đã xuất MP4</small><b>{videos.filter((item) => item.status === "COMPLETED").length}</b></div></article>
      </div>
      <section className="library-content">
        <div className="library-toolbar"><div><h2>Video của bạn</h2><span>{filtered.length} kết quả</span></div><label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm kiếm video..." /></label></div>
        {loading ? <div className="library-empty"><RefreshCw className="spin" size={28} /><h3>Đang tải thư viện...</h3></div> : filtered.length ? (
          <div className="video-card-grid">{filtered.map((video) => (
            <article className="library-video-card" key={video.id}>
              <button type="button" className={`library-thumb ratio-${video.ratio.replace(":", "-")}`} onClick={() => onOpen(video)}>{video.thumbnailUrl ? <img src={video.thumbnailUrl} alt="" /> : <div className="library-placeholder"><Film size={30} /></div>}<span>{secondsLabel(video.durationMs)}</span><i className="thumb-play"><Film size={14} /></i></button>
              <div className="video-card-info"><div><small>{video.channel || "Video"}</small><h3>{video.title}</h3><p>{new Intl.DateTimeFormat("vi-VN").format(new Date(video.updatedAt))} · {video.ratio}</p></div></div>
              <footer><span className={`status-${video.status.toLowerCase()}`}><i /> {statusLabels[video.status]}</span><div>{video.downloadUrl && <a href={video.downloadUrl}><Download size={14} /></a>}<button onClick={() => onDelete(video)}><Trash2 size={14} /></button></div></footer>
            </article>
          ))}</div>
        ) : <div className="library-empty"><FolderOpen size={32} /><h3>Chưa có video</h3><p>Bắt đầu bằng một kịch bản đã được duyệt.</p></div>}
      </section>
    </div>
  );
}

export default function VideoStudio({ workspaceId, workspaceName, showToast }) {
  const [view, setView] = useState("library");
  const [step, setStep] = useState(1);
  const [source, setSource] = useState(starterScripts[0]);
  const [form, setForm] = useState(() => initialForm(workspaceId));
  const [storyboardConfirmed, setStoryboardConfirmed] = useState(false);
  const [videos, setVideos] = useState([]);
  const [project, setProject] = useState(null);
  const [config, setConfig] = useState({ styles: [], builtInVoices: [] });
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const alive = useRef(true);

  const loadLibrary = useCallback(async () => {
    setLoading(true);
    try { setVideos(await apiRequest(`/workspaces/${workspaceId}/videos`)); }
    catch (error) { showToast(errorText(error)); }
    finally { setLoading(false); }
  }, [workspaceId, showToast]);

  const loadVoices = useCallback(async () => {
    try { setVoices(await apiRequest(`/workspaces/${workspaceId}/videos/voices`)); }
    catch (error) { showToast(errorText(error)); }
  }, [workspaceId, showToast]);

  useEffect(() => {
    alive.current = true;
    Promise.all([apiRequest(`/workspaces/${workspaceId}/videos/configuration`), apiRequest(`/workspaces/${workspaceId}/videos/voices`)]).then(([configuration, voiceProfiles]) => {
      if (alive.current) { setConfig(configuration); setVoices(voiceProfiles); }
    }).catch((error) => showToast(errorText(error)));
    loadLibrary();
    return () => { alive.current = false; };
  }, [workspaceId, loadLibrary, showToast]);

  const poll = async (id) => {
    for (let attempt = 0; attempt < 180 && alive.current; attempt += 1) {
      const data = await apiRequest(`/workspaces/${workspaceId}/videos/${id}`);
      setProject(data);
      if (!busyStatuses.has(data.status)) return data;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    throw new Error("Tác vụ mất nhiều thời gian hơn dự kiến nhưng vẫn đang chạy ở backend.");
  };

  const generateScript = async () => {
    setBusy("script");
    try {
      const result = await apiRequest(`/workspaces/${workspaceId}/videos/script`, { method: "POST", body: JSON.stringify({ topic: form.topic, language: form.language, style: form.visualStyle, tone: form.tone, audience: form.audience, callToAction: form.callToAction, wordCount: form.wordCount }) });
      setForm((current) => ({ ...current, title: result.title || current.title, script: result.script || current.script }));
      showToast("Đã tạo bản nháp kịch bản");
    } catch (error) { showToast(errorText(error)); }
    finally { setBusy(""); }
  };

  const createStoryboard = async () => {
    setBusy("storyboard");
    try {
      const custom = form.voiceChoice.startsWith("custom:");
      const payload = {
        title: form.title, script: form.script, channel: form.channel, ratio: form.ratio,
        tone: form.tone, visualStyle: form.visualStyle, pace: form.pace, hookStyle: form.hookStyle,
        audience: form.audience, callToAction: form.callToAction, voiceInstructions: form.voiceInstructions,
        voiceId: custom ? undefined : form.voiceChoice.replace("builtin:", ""),
        voiceProfileId: custom ? form.voiceChoice.replace("custom:", "") : undefined,
        sceneCount: form.sceneCount, captions: form.captions, autoGenerateAssets: false,
      };
      const created = await apiRequest(`/workspaces/${workspaceId}/videos`, { method: "POST", body: JSON.stringify(payload) });
      setProject(created);
      let ready = await poll(created.id);
      if (ready.status === "FAILED") throw new Error(ready.errorMessage);
      if (config.configured) {
        await apiRequest(`/workspaces/${workspaceId}/videos/${created.id}/generate-images`, { method: "POST" });
        ready = await poll(created.id);
        if (ready.status === "FAILED") throw new Error(ready.errorMessage);
      }
      setProject(ready);
      setStoryboardConfirmed(false);
      setStep(3);
      showToast("Storyboard và hình ảnh đã sẵn sàng");
    } catch (error) { showToast(errorText(error)); }
    finally { setBusy(""); loadLibrary(); }
  };

  const generateImages = async () => {
    setBusy("images");
    try {
      await apiRequest(`/workspaces/${workspaceId}/videos/${project.id}/generate-images`, { method: "POST" });
      const ready = await poll(project.id);
      if (ready.status === "FAILED") throw new Error(ready.errorMessage);
      showToast("Đã tạo lại hình ảnh cho tất cả phân cảnh");
    } catch (error) { showToast(errorText(error)); }
    finally { setBusy(""); }
  };

  const regenerateSceneImage = async (sceneId) => {
    setBusy(`image:${sceneId}`);
    try {
      setProject(await apiRequest(`/workspaces/${workspaceId}/videos/${project.id}/scenes/${sceneId}/generate-image`, { method: "POST" }));
      showToast("Đã tạo lại hình ảnh");
    } catch (error) { showToast(errorText(error)); }
    finally { setBusy(""); }
  };

  const uploadSceneAsset = async (sceneId, file) => {
    setBusy(`upload:${sceneId}`);
    try {
      const data = new FormData(); data.set("file", file);
      setProject(await apiRequest(`/workspaces/${workspaceId}/videos/${project.id}/scenes/${sceneId}/asset`, { method: "POST", body: data }));
      showToast("Đã cập nhật media cho phân cảnh");
    } catch (error) { showToast(errorText(error)); }
    finally { setBusy(""); }
  };

  const voiceSettingsPayload = () => {
    const custom = form.voiceChoice.startsWith("custom:");
    return {
      voiceId: custom ? undefined : form.voiceChoice.replace("builtin:", ""),
      voiceProfileId: custom ? form.voiceChoice.replace("custom:", "") : null,
      voiceInstructions: form.voiceInstructions,
      tone: form.tone,
      pace: form.pace,
      captions: form.captions,
    };
  };

  const generateAudio = async () => {
    setBusy("audio");
    try {
      await apiRequest(`/workspaces/${workspaceId}/videos/${project.id}/settings`, { method: "PATCH", body: JSON.stringify(voiceSettingsPayload()) });
      await apiRequest(`/workspaces/${workspaceId}/videos/${project.id}/generate-audio`, { method: "POST" });
      const ready = await poll(project.id);
      if (ready.status === "FAILED") throw new Error(ready.errorMessage);
      setStep(5);
      showToast("Voice đã sẵn sàng trong editor");
    } catch (error) { showToast(errorText(error)); }
    finally { setBusy(""); }
  };

  const createVoice = async (data) => {
    await apiRequest(`/workspaces/${workspaceId}/videos/voices`, { method: "POST", body: data });
    await loadVoices();
    showToast("Voice đang được xác minh và sẽ xuất hiện khi sẵn sàng");
  };

  const openProject = async (item) => {
    setBusy("open");
    try {
      const data = await apiRequest(`/workspaces/${workspaceId}/videos/${item.id}`);
      const settings = data.settings || {};
      setProject(data);
      setStoryboardConfirmed(Boolean(data.scenes?.length));
      setForm((current) => ({ ...current, title: data.title, script: data.script, channel: data.channel || "", ratio: data.ratio, tone: settings.tone || current.tone, visualStyle: settings.visualStyle || current.visualStyle, pace: settings.pace || current.pace, hookStyle: settings.hookStyle || current.hookStyle, audience: settings.audience || "", callToAction: settings.callToAction || "", voiceChoice: data.voiceProfile?.id ? `custom:${data.voiceProfile.id}` : `builtin:${settings.voiceId || "marin"}`, voiceInstructions: settings.voiceInstructions || current.voiceInstructions, sceneCount: data.scenes?.length || current.sceneCount, captions: settings.captions !== false }));
      const nextStep = data.scenes?.length ? 5 : 2;
      setStep(nextStep);
      setView("create");
    } catch (error) { showToast(errorText(error)); }
    finally { setBusy(""); }
  };

  const startNew = () => {
    setSource(starterScripts[0]); setForm(initialForm(workspaceId)); setProject(null); setStoryboardConfirmed(false); setStep(1); setView("create");
  };

  const removeProject = async (item) => {
    if (!window.confirm(`Xoá “${item.title}” và toàn bộ asset?`)) return;
    try {
      await apiRequest(`/workspaces/${workspaceId}/videos/${item.id}`, { method: "DELETE" });
      setVideos((items) => items.filter((video) => video.id !== item.id));
      showToast("Đã xoá video");
    } catch (error) { showToast(errorText(error)); }
  };

  if (view === "library") return <VideoLibrary videos={videos} loading={loading || busy === "open"} onCreate={startNew} onOpen={openProject} onDelete={removeProject} />;

  const blocking = ["storyboard", "images", "audio"].includes(busy);
  return (
    <div className={`video-studio-view ${step === 5 ? "editing" : ""}`}>
      <div className="video-page-heading">
        <div><p>WORKSPACE · {workspaceName.toUpperCase()}</p><h1>Tạo video từ kịch bản <span>✦</span></h1><small>Quy trình 5 bước: script, storyboard, hình ảnh, voice, editor và MP4.</small></div>
        <button onClick={() => { setView("library"); loadLibrary(); }}><FolderOpen size={16} /> Thư viện video <span>{videos.length}</span></button>
      </div>
      <WorkflowSteps current={step} />
      {step === 1 && <IdeaStep form={form} setForm={setForm} source={source} setSource={setSource} config={config} busy={busy === "script"} onGenerate={generateScript} onNext={() => setStep(2)} />}
      {step === 2 && <ScriptStep form={form} setForm={setForm} config={config} busy={busy === "storyboard"} onBack={() => setStep(1)} onCreate={createStoryboard} />}
      {step === 3 && <ImagesStep project={project} config={config} busy={Boolean(busy)} storyboardConfirmed={storyboardConfirmed} onConfirmStoryboard={() => setStoryboardConfirmed(true)} onBack={() => setStep(2)} onNext={() => setStep(4)} onGenerateAll={generateImages} onRegenerate={regenerateSceneImage} onUpload={uploadSceneAsset} />}
      {step === 4 && <VoiceStep form={form} setForm={setForm} config={config} voices={voices} project={project} busy={busy === "audio"} onBack={() => setStep(3)} onGenerate={generateAudio} onSkip={() => setStep(5)} onCreateVoice={createVoice} />}
      {step === 5 && <EditorStep project={project} workspaceId={workspaceId} onBack={() => setStep(4)} />}
      {blocking && (
        <div className="video-modal-backdrop">
          <div className="export-modal"><span className="export-orb"><Sparkles size={23} /><i /></span><p>MILO VIDEO ENGINE</p><h2>{busy === "storyboard" ? "Đang lập storyboard" : busy === "images" ? "Đang tạo hình ảnh" : busy === "audio" ? "Đang tạo giọng đọc" : "Đang render MP4"}</h2><small>{project?.status === "PLANNING" ? "AI đang chuyển kịch bản thành các phân cảnh..." : project?.status === "GENERATING_ASSETS" ? "Đang xử lý tuần tự từng scene và lưu asset..." : project?.status === "RENDERING" ? "FFmpeg đang ghép hình, voice, phụ đề và nhạc nền..." : "Đang chuẩn bị tác vụ..."}</small><div className="export-progress indeterminate"><i /></div><div className="export-meta"><span>{statusLabels[project?.status] || "Đang xử lý"}</span><span>{form.ratio} · xử lý nền</span></div></div>
        </div>
      )}
    </div>
  );
}
