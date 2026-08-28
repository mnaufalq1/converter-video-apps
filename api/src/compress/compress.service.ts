import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';
import * as ffmpegPath from 'ffmpeg-static';
import dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class CompressService {
  private readonly logger = new Logger(CompressService.name);

  constructor() {
    // Konfigurasi Kredensial Cloudinary (Ambil dari .env)
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    // Tentukan path FFmpeg (apakah dari ENV, ffmpeg-static, atau sistem)
    const staticPath = (ffmpegPath as any)?.default || ffmpegPath;
    const envPath = process.env.FFMPEG_PATH;

    if (envPath && fs.existsSync(envPath)) {
      ffmpeg.setFfmpegPath(envPath);
      this.logger.log(`Menggunakan FFmpeg dari ENV: ${envPath}`);
    } else if (typeof staticPath === 'string' && fs.existsSync(staticPath)) {
      ffmpeg.setFfmpegPath(staticPath);
      this.logger.log(`Menggunakan FFmpeg dari ffmpeg-static: ${staticPath}`);
    } else {
      // Jika tidak ada di ENV maupun ffmpeg-static, biarkan fluent-ffmpeg menggunakan FFmpeg dari sistem (PATH)
      this.logger.log('Binary ffmpeg-static/ENV tidak ditemukan, menggunakan FFmpeg bawaan sistem (PATH).');
    }
  }

  private getCrfValue(quality: string): number {
    switch (quality?.toLowerCase()) {
      case 'highest':
      case 'high':
        return 20;
      case 'low':
        return 32;
      case 'standard':
      case 'medium':
      default:
        return 26;
    }
  }

  async compressAndUpload(
    file: Express.Multer.File,
    quality: string,
    format: string = 'mp4',
  ): Promise<UploadApiResponse> {
    const crf = this.getCrfValue(quality);
    const isWebm = format === 'webm';
    const tempOutputDir = path.join(__dirname, '..', '..', 'temp');

    if (!fs.existsSync(tempOutputDir)) {
      fs.mkdirSync(tempOutputDir, { recursive: true });
    }

    const tempFilename = `compressed-${Date.now()}.${format}`;
    const tempFilePath = path.join(tempOutputDir, tempFilename);

    try {
      // 1. Coba kompresi lokal dengan FFmpeg
      const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
        const outputOptions = isWebm
          ? [
              `-crf ${crf}`,
              '-b:v 0',
              '-deadline realtime',
              '-cpu-used 8',
              '-threads 1',
              "-vf scale='min(1280,iw)':-2",
            ]
          : [
              `-crf ${crf}`,
              '-preset ultrafast',
              '-tune zerolatency',
              '-threads 1',
              "-vf scale='min(1280,iw)':-2",
              '-max_muxing_queue_size 1024',
            ];

        ffmpeg(file.path)
          .videoCodec(isWebm ? 'libvpx-vp9' : 'libx264')
          .audioCodec(isWebm ? 'libopus' : 'aac')
          .format(format)
          .outputOptions(outputOptions)
          .on('start', () => {
            this.logger.log(`Mulai kompresi FFmpeg ${file.filename} ke format ${format}.`);
          })
          .on('end', async () => {
            try {
              this.logger.log('Kompresi FFmpeg selesai, mengunggah hasil ke Cloudinary.');
              const result = await this.uploadVideoInChunks(tempFilePath, quality, format);
              this.cleanupFiles([file.path, tempFilePath]);
              resolve(result);
            } catch (uploadErr) {
              this.cleanupFiles([file.path, tempFilePath]);
              reject(uploadErr);
            }
          })
          .on('error', (err) => {
            this.cleanupFiles([tempFilePath]);
            reject(err);
          })
          .save(tempFilePath);
      });

      return uploadResult;
    } catch (ffmpegError) {
      const errMessage = (ffmpegError as Error)?.message ?? '';
      this.logger.warn(
        `FFmpeg gagal/di-kill di server (${errMessage}). Mengalihkan pemrosesan video ke Cloudinary Cloud Engine...`,
      );

      // Fallback: Jika FFmpeg di-SIGKILL / OOM di Railway, unggah file mentah langsung ke Cloudinary
      // dan biarkan Cloudinary mengompres & mengonversi video secara serverless di Cloud!
      try {
        const fallbackResult = await this.uploadVideoInChunks(file.path, quality, format);
        this.cleanupFiles([file.path]);
        this.logger.log('Kompresi & unggah via Cloudinary Cloud Engine sukses!');
        return fallbackResult;
      } catch (fallbackError) {
        this.cleanupFiles([file.path]);
        const message = this.getUploadErrorMessage(fallbackError);
        this.logger.error(`Unggah ke Cloudinary gagal: ${message}`);
        throw new InternalServerErrorException(`Gagal memproses video: ${message}`);
      }
    }
  }

  private cleanupFiles(filePaths: string[]) {
    filePaths.forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  }

  private uploadVideoInChunks(
    filePath: string,
    quality?: string,
    format?: string,
  ): Promise<UploadApiResponse> {
    const cloudinaryQuality =
      quality === 'highest' || quality === 'high'
        ? 'auto:best'
        : quality === 'low'
          ? 'auto:eco'
          : 'auto:good';

    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_chunked(
        filePath,
        {
          resource_type: 'video',
          folder: 'frameshift_videos',
          transformation: [
            {
              quality: cloudinaryQuality,
              fetch_format: format?.toLowerCase(),
            },
          ],
          chunk_size: 6_000_000,
          timeout: 120_000,
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error('Cloudinary tidak mengembalikan hasil unggahan.'));
            return;
          }

          resolve(result);
        },
      );
    });
  }

  private getUploadErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (error && typeof error === 'object') {
      const candidate = error as {
        message?: unknown;
        error?: { message?: unknown };
      };

      if (typeof candidate.error?.message === 'string') {
        return candidate.error.message;
      }

      if (typeof candidate.message === 'string') {
        return candidate.message;
      }
    }

    return 'Cloudinary tidak memberikan detail error.';
  }
}
