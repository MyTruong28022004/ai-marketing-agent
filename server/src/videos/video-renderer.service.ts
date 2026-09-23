import { Injectable, Logger } from '@nestjs/common'
import { VideoAssetType } from '@prisma/client'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { spawn } from 'node:child_process'
import { VideoStorageService } from './video-storage.service'

const ffmpegPath = require('ffmpeg-static') as string | null
const ffprobePath = (require('ffprobe-static') as { path: string }).path

type RenderScene = {
  id: string
  position: number
  title: string
  narration: string
  durationMs: number
  assetType: VideoAssetType
  visualStorageKey: string | null
  visualMimeType: string | null
  narrationStorageKey: string | null
  narrationMimeType: string | null
}

type RenderProject = {
  id: string
  workspaceId: string
  title: string
  ratio: string
  settings: unknown
  musicStorageKey: string | null
  musicMimeType: string | null
  scenes: RenderScene[]
}

@Injectable()
export class VideoRendererService {
  private readonly logger = new Logger(VideoRendererService.name)

  constructor(private readonly storage: VideoStorageService) {}

  async render(project: RenderProject) {
    if (!ffmpegPath) throw new Error('FFmpeg binary is not available for this platform')
    if (!project.scenes.length) throw new Error('Video chưa có phân cảnh để render')
    const workdir = await mkdtemp(join(tmpdir(), 'milo-video-'))
    try {
      const { width, height } = this.dimensions(project.ratio)
      const settings = project.settings as { captions?: boolean; captionStyle?: string } | null
      const segmentFiles: string[] = []
      for (const scene of project.scenes.sort((a, b) => a.position - b.position)) {
        const segmentName = `segment-${String(scene.position).padStart(2, '0')}.mp4`
        const segmentPath = join(workdir, segmentName)
        const duration = Math.max(1, scene.durationMs / 1000)
        const args: string[] = ['-y']

        if (scene.visualStorageKey) {
          const visualName = `visual-${scene.position}${this.extension(scene.visualMimeType)}`
          await writeFile(join(workdir, visualName), await this.storage.get(scene.visualStorageKey))
          if (scene.assetType === VideoAssetType.UPLOADED_VIDEO) args.push('-stream_loop', '-1', '-i', visualName)
          else args.push('-loop', '1', '-i', visualName)
        } else {
          args.push('-f', 'lavfi', '-i', `color=c=#294b3b:s=${width}x${height}:r=30`)
        }

        if (scene.narrationStorageKey) {
          const audioName = `narration-${scene.position}${this.extension(scene.narrationMimeType || 'audio/mpeg')}`
          await writeFile(join(workdir, audioName), await this.storage.get(scene.narrationStorageKey))
          args.push('-i', audioName)
        } else {
          args.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000')
        }

        const filters = [
          `scale=${width}:${height}:force_original_aspect_ratio=increase`,
          `crop=${width}:${height}`,
          'fps=30',
          'format=yuv420p',
          'fade=t=in:st=0:d=0.28',
          `fade=t=out:st=${Math.max(0, duration - .35).toFixed(2)}:d=0.35`,
        ]
        if (settings?.captions !== false && scene.narration.trim()) {
          const subtitleName = `caption-${scene.position}.ass`
          await writeFile(join(workdir, subtitleName), this.ass(scene.narration, width, height), 'utf8')
          filters.push(`subtitles=${subtitleName}`)
        }

        args.push(
          '-t', duration.toFixed(3), '-map', '0:v:0', '-map', '1:a:0', '-vf', filters.join(','),
          '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-c:a', 'aac', '-b:a', '160k',
          '-ar', '48000', '-movflags', '+faststart', segmentName,
        )
        await this.run(ffmpegPath, args, workdir)
        segmentFiles.push(segmentPath)
      }

      const concatName = 'concat.txt'
      await writeFile(join(workdir, concatName), segmentFiles.map(file => `file '${basename(file).replaceAll("'", "'\\''")}'`).join('\n'), 'utf8')
      const joinedName = 'joined.mp4'
      await this.run(ffmpegPath, ['-y', '-f', 'concat', '-safe', '0', '-i', concatName, '-c', 'copy', '-movflags', '+faststart', joinedName], workdir)

      let finalName = joinedName
      if (project.musicStorageKey) {
        const musicName = `music${this.extension(project.musicMimeType || 'audio/mpeg')}`
        await writeFile(join(workdir, musicName), await this.storage.get(project.musicStorageKey))
        finalName = 'final.mp4'
        await this.run(ffmpegPath, [
          '-y', '-i', joinedName, '-stream_loop', '-1', '-i', musicName,
          '-filter_complex', '[0:a]volume=1[a];[1:a]volume=0.16[b];[a][b]amix=inputs=2:duration=first:dropout_transition=2[aout]',
          '-map', '0:v:0', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', finalName,
        ], workdir)
      }

      const finalPath = join(workdir, finalName)
      const thumbnailName = 'thumbnail.jpg'
      await this.run(ffmpegPath, ['-y', '-ss', '0.2', '-i', finalName, '-frames:v', '1', '-q:v', '2', thumbnailName], workdir)
      const outputKey = `workspaces/${project.workspaceId}/videos/${project.id}/renders/final.mp4`
      const thumbnailKey = `workspaces/${project.workspaceId}/videos/${project.id}/renders/thumbnail.jpg`
      const [{ readFile }] = await Promise.all([import('node:fs/promises')])
      await Promise.all([
        this.storage.put(outputKey, await readFile(finalPath), 'video/mp4'),
        this.storage.put(thumbnailKey, await readFile(join(workdir, thumbnailName)), 'image/jpeg'),
      ])
      return { outputKey, thumbnailKey }
    } finally {
      await rm(workdir, { recursive: true, force: true })
    }
  }

  async durationMs(buffer: Buffer, mimeType: string) {
    const workdir = await mkdtemp(join(tmpdir(), 'milo-probe-'))
    try {
      const inputName = `input${this.extension(mimeType)}`
      await writeFile(join(workdir, inputName), buffer)
      const output = await this.run(ffprobePath, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', inputName], workdir)
      return Math.max(1000, Math.round(Number.parseFloat(output.trim()) * 1000))
    } finally {
      await rm(workdir, { recursive: true, force: true })
    }
  }

  private run(binary: string, args: string[], cwd: string) {
    return new Promise<string>((resolve, reject) => {
      const child = spawn(binary, args, { cwd, windowsHide: true })
      let output = ''
      child.stdout.on('data', chunk => { output += chunk.toString() })
      child.stderr.on('data', chunk => { output = `${output}${chunk.toString()}`.slice(-16_000) })
      child.on('error', reject)
      child.on('close', code => code === 0 ? resolve(output) : reject(new Error(`FFmpeg exited with ${code}: ${output.slice(-4000)}`)))
    })
  }

  private dimensions(ratio: string) {
    if (ratio === '16:9') return { width: 1280, height: 720 }
    if (ratio === '1:1') return { width: 1080, height: 1080 }
    return { width: 720, height: 1280 }
  }

  private extension(mimeType?: string | null) {
    const value = mimeType?.toLowerCase() || ''
    if (value.includes('png')) return '.png'
    if (value.includes('jpeg') || value.includes('jpg')) return '.jpg'
    if (value.includes('webp')) return '.webp'
    if (value.includes('wav')) return '.wav'
    if (value.includes('ogg')) return '.ogg'
    if (value.includes('aac')) return '.aac'
    if (value.includes('webm')) return '.webm'
    if (value.includes('quicktime')) return '.mov'
    if (value.includes('video')) return '.mp4'
    return '.mp3'
  }

  private ass(text: string, width: number, height: number) {
    const fontSize = Math.round(Math.min(width, height) * .052)
    const marginV = Math.round(height * .1)
    const safe = text.replace(/[{}]/g, '').replace(/\r?\n/g, '\\N')
    return `[Script Info]\nScriptType: v4.00+\nPlayResX: ${width}\nPlayResY: ${height}\nWrapStyle: 0\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Milo,Arial,${fontSize},&H00FFFFFF,&H000000FF,&H80000000,&H64000000,-1,0,0,0,100,100,0,0,1,3,1,2,50,50,${marginV},1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\nDialogue: 0,0:00:00.00,0:59:59.00,Milo,,0,0,0,,${safe}\n`
  }
}
