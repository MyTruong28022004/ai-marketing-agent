import React from "react";
import {
  AbsoluteFill,
  Html5Audio,
  Html5Video,
  Img,
  Sequence,
  interpolate,
  useCurrentFrame,
} from "remotion";

const fallbackColors = [
  ["#203b31", "#73917f"],
  ["#7a513b", "#d0aa8d"],
  ["#273f4a", "#8aa8ae"],
  ["#493b58", "#aa8daf"],
  ["#3d492d", "#9daf78"],
];

function SceneFrame({ scene, index, captions, durationInFrames }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, 8, Math.max(9, durationInFrames - 9), durationInFrames],
    [0, 1, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const scale = interpolate(frame, [0, durationInFrames], [1.04, 1.1], {
    extrapolateRight: "clamp",
  });
  const palette = fallbackColors[index % fallbackColors.length];

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(145deg, ${palette[0]}, ${palette[1]})`,
        overflow: "hidden",
        opacity,
      }}
    >
      {scene.visualUrl && scene.visualMimeType?.startsWith("video/") ? (
        <Html5Video
          src={scene.visualUrl}
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale})`,
          }}
        />
      ) : scene.visualUrl ? (
        <Img
          src={scene.visualUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale})`,
          }}
        />
      ) : (
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at 68% 25%, rgba(255,255,255,.24), transparent 28%), linear-gradient(145deg, ${palette[0]}, ${palette[1]})`,
          }}
        />
      )}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg,rgba(8,20,15,.08),rgba(8,20,15,.03) 46%,rgba(8,20,15,.72))",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "5%",
          left: "6%",
          color: "#fff",
          fontFamily: "Inter, sans-serif",
          fontSize: 22,
          letterSpacing: 5,
          fontWeight: 800,
        }}
      >
        MILO VIDEO
      </div>
      {captions && scene.narration && (
        <div
          style={{
            position: "absolute",
            left: "8%",
            right: "8%",
            bottom: "9%",
            color: "#fff",
            fontFamily: "Inter, sans-serif",
            fontSize: 44,
            lineHeight: 1.18,
            fontWeight: 800,
            textAlign: "center",
            textShadow: "0 3px 18px rgba(0,0,0,.75)",
          }}
        >
          {scene.narration}
        </div>
      )}
      {scene.narrationUrl && <Html5Audio src={scene.narrationUrl} />}
    </AbsoluteFill>
  );
}

export function VideoComposition({ scenes = [], captions = true, fps = 30 }) {
  let from = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#13271f" }}>
      {scenes.map((scene, index) => {
        const durationInFrames = Math.max(
          1,
          Math.round(((scene.durationMs || 5000) / 1000) * fps),
        );
        const start = from;
        from += durationInFrames;
        return (
          <Sequence
            key={scene.id}
            from={start}
            durationInFrames={durationInFrames}
            premountFor={fps}
          >
            <SceneFrame
              scene={scene}
              index={index}
              captions={captions}
              durationInFrames={durationInFrames}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}

export function compositionSize(ratio) {
  if (ratio === "16:9") return { width: 1280, height: 720 };
  if (ratio === "1:1") return { width: 1080, height: 1080 };
  return { width: 720, height: 1280 };
}

export function compositionFrames(scenes, fps = 30) {
  return Math.max(
    fps,
    scenes.reduce(
      (sum, scene) =>
        sum +
        Math.max(1, Math.round(((scene.durationMs || 5000) / 1000) * fps)),
      0,
    ),
  );
}
