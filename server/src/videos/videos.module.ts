import { Module } from '@nestjs/common'
import { VideosController } from './videos.controller'
import { VideoAiService } from './video-ai.service'
import { VideoRendererService } from './video-renderer.service'
import { VideoStorageService } from './video-storage.service'
import { VideosService } from './videos.service'

@Module({
  controllers: [VideosController],
  providers: [VideosService, VideoAiService, VideoRendererService, VideoStorageService],
})
export class VideosModule {}
