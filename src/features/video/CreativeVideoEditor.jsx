import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ChevronDown, ChevronUp, Download, Pause, Play, Save,
  Scissors, Sparkles, TriangleAlert, Volume2,
} from "lucide-react";
import { apiRequest } from "../../lib/api";

const seconds = (value) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(Math.floor(value % 60)).padStart(2, "0")}`;

function ScenePreview({ scene, ratio, playing, captions, onToggle }) {
  const mediaStyle = { width: "100%", height: "100%", objectFit: "cover" };
  return (
    <div className={`magical-preview ratio-${ratio.replace(":", "-")}`} onClick={onToggle}>
      {scene?.visualUrl ? (scene.visualMimeType?.startsWith("video/") ? (
        <video src={scene.visualUrl} muted={!scene.narrationUrl} autoPlay={playing} loop style={mediaStyle} />
      ) : <img src={scene.visualUrl} alt={scene.title} style={mediaStyle} />) : <div className="magical-preview-empty"><Sparkles size={30} /><span>Chưa có media</span></div>}
      {captions && scene?.narration && <p className="magical-caption">{scene.narration}</p>}
      {!playing && <span className="magical-play"><Play size={25} fill="currentColor" /></span>}
    </div>
  );
}

export default function CreativeVideoEditor({ project, workspaceId, onBack }) {
  const [scenes, setScenes] = useState(project.scenes || []);
  const [selectedId, setSelectedId] = useState(project.scenes?.[0]?.id || null);
  const [playing, setPlaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");
  const [captions, setCaptions] = useState(project.settings?.captions !== false);
  const [playhead, setPlayhead] = useState(0);
  const playTimer = useRef(null);
  const selected = scenes.find((scene) => scene.id === selectedId) || scenes[0];
  const duration = useMemo(() => scenes.reduce((sum, scene) => sum + (scene.durationMs || 5000) / 1000, 0), [scenes]);

  useEffect(() => () => clearInterval(playTimer.current), []);
  useEffect(() => {
    if (!playing) return undefined;
    playTimer.current = setInterval(() => setPlayhead((value) => (value + 0.1) % Math.max(duration, 0.1)), 100);
    return () => clearInterval(playTimer.current);
  }, [playing, duration]);

  const updateSelected = (key, value) => setScenes((items) => items.map((scene) => scene.id === selectedId ? { ...scene, [key]: value } : scene));
  const moveScene = (direction) => {
    const index = scenes.findIndex((scene) => scene.id === selectedId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= scenes.length) return;
    const next = [...scenes];
    [next[index], next[target]] = [next[target], next[index]];
    setScenes(next);
  };

  const save = async () => {
    setSaving(true); setError("");
    try {
      await Promise.all(scenes.map((scene) => apiRequest(`/workspaces/${workspaceId}/videos/${project.id}/scenes/${scene.id}`, {
        method: "PATCH", body: JSON.stringify({ title: scene.title, narration: scene.narration, visualPrompt: scene.visualPrompt, durationMs: scene.durationMs }),
      })));
      await apiRequest(`/workspaces/${workspaceId}/videos/${project.id}/scenes/reorder`, { method: "POST", body: JSON.stringify({ sceneIds: scenes.map((scene) => scene.id) }) });
      await apiRequest(`/workspaces/${workspaceId}/videos/${project.id}/settings`, { method: "PATCH", body: JSON.stringify({ captions }) });
    } catch (requestError) { setError(requestError?.message || "Không thể lưu chỉnh sửa."); }
    finally { setSaving(false); }
  };

  const render = async () => {
    setRendering(true); setError("");
    try {
      await save();
      await apiRequest(`/workspaces/${workspaceId}/videos/${project.id}/render`, { method: "POST" });
    } catch (requestError) { setError(requestError?.message || "Không thể xuất video."); }
    finally { setRendering(false); }
  };

  return (
    <section className="magical-editor-card" data-video-editor>
      <header className="magical-editor-header">
        <button type="button" className="magical-icon-button" onClick={onBack} title="Quay lại"><ArrowLeft size={17} /></button>
        <div><p>MAGICAL CANVAS EDITOR</p><h2>{project.title}</h2></div>
        <div className="magical-editor-actions"><button type="button" onClick={save} disabled={saving}><Save size={15} /> {saving ? "Đang lưu" : "Lưu"}</button><button type="button" className="primary" onClick={render} disabled={rendering}><Download size={15} /> {rendering ? "Đang xuất" : "Xuất MP4"}</button></div>
      </header>
      <div className="magical-editor-main">
        <aside className="magical-assets"><p>PHÂN CẢNH</p>{scenes.map((scene, index) => <button type="button" key={scene.id} className={scene.id === selectedId ? "active" : ""} onClick={() => setSelectedId(scene.id)}><span>{index + 1}</span><div><b>{scene.title}</b><small>{seconds((scene.durationMs || 5000) / 1000)}</small></div></button>)}</aside>
        <main className="magical-canvas">
          <ScenePreview scene={selected} ratio={project.ratio} playing={playing} captions={captions} onToggle={() => setPlaying((value) => !value)} />
          <div className="magical-transport"><button type="button" onClick={() => setPlaying((value) => !value)}>{playing ? <Pause size={17} /> : <Play size={17} fill="currentColor" />}</button><span>{seconds(playhead)} / {seconds(duration)}</span><input type="range" min="0" max={Math.max(duration, 0.1)} step="0.1" value={playhead} onChange={(event) => setPlayhead(Number(event.target.value))} /></div>
        </main>
        <aside className="magical-inspector"><p>THUỘC TÍNH</p>{selected ? <><label>Tiêu đề<input value={selected.title || ""} onChange={(event) => updateSelected("title", event.target.value)} /></label><label>Thời lượng (ms)<input type="number" min="1000" max="30000" value={selected.durationMs || 5000} onChange={(event) => updateSelected("durationMs", Number(event.target.value))} /></label><label>Lời thoại<textarea rows="7" value={selected.narration || ""} onChange={(event) => updateSelected("narration", event.target.value)} /></label><div className="magical-toggle"><input type="checkbox" checked={captions} onChange={(event) => setCaptions(event.target.checked)} /><span>Hiển thị phụ đề</span></div><div className="magical-reorder"><button type="button" onClick={() => moveScene(-1)} title="Đưa lên"><ChevronUp size={16} /></button><button type="button" onClick={() => moveScene(1)} title="Đưa xuống"><ChevronDown size={16} /></button><Scissors size={16} /></div></> : <span>Chưa có phân cảnh</span>}</aside>
      </div>
      {error && <div className="magical-editor-error"><TriangleAlert size={16} />{error}</div>}
      <footer className="magical-editor-footer"><span><Volume2 size={14} /> {scenes.filter((scene) => scene.narrationUrl).length}/{scenes.length} voice</span><span>{project.ratio} · {scenes.length} phân cảnh</span></footer>
    </section>
  );
}
