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

    return new Promise((resolve, reject) => {
      const outputOptions = isWebm
        ? [`-crf ${crf}`, '-b:v 0', '-deadline realtime', '-cpu-used 4', '-threads 2']
        : [`-crf ${crf}`, '-preset superfast', '-threads 2'];

      ffmpeg(file.path)
        .videoCodec(isWebm ? 'libvpx-vp9' : 'libx264')
        .audioCodec(isWebm ? 'libopus' : 'aac')
        .format(format)
        .outputOptions(outputOptions)
        .on('start', () => {
          this.logger.log(`Mulai kompresi ${file.filename} ke format ${format}.`);
        })
        .on('end', async () => {
          try {
            this.logger.log('Kompresi selesai, mengunggah hasil ke Cloudinary.');
            // 2. Unggah Berkas Hasil Kompresi ke Cloudinary
            const uploadResult = await this.uploadVideoInChunks(tempFilePath);

            // 3. Bersihkan Berkas Sementara
            this.cleanupFiles([file.path, tempFilePath]);
            this.logger.log('Unggah Cloudinary selesai.');

            resolve(uploadResult);
          } catch (uploadError) {
            this.cleanupFiles([file.path, tempFilePath]);
            const message = this.getUploadErrorMessage(uploadError);
            this.logger.error(`Unggah Cloudinary gagal: ${message}`);
            reject(
              new InternalServerErrorException(`Cloudinary Error: ${message}`),
            );
          }
        })
        .on('error', (err) => {
          this.cleanupFiles([file.path, tempFilePath]);
          this.logger.error(`Kompresi gagal: ${err.message}`);
          reject(
            new InternalServerErrorException(`FFmpeg/Compress Error: ${err.message}`),
          );
        })
        .save(tempFilePath);
    });
  }

  private cleanupFiles(filePaths: string[]) {
    filePaths.forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  }

  private uploadVideoInChunks(filePath: string): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_chunked(
        filePath,
        {
          resource_type: 'video',
          folder: 'frameshift_videos',
          // Chunk kecil lebih tahan terhadap koneksi upload yang lambat atau tidak stabil.
          chunk_size: 6_000_000,
          // Dalam milidetik: beri setiap chunk hingga dua menit untuk mendapat respons.
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
