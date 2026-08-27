import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';
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

    if (process.env.FFMPEG_PATH) {
      ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
      this.logger.log(`Menggunakan FFmpeg dari: ${process.env.FFMPEG_PATH}`);
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
      // 1. Proses Kompresi dengan FFmpeg
      ffmpeg(file.path)
        .videoCodec(isWebm ? 'libvpx-vp9' : 'libx264')
        .audioCodec(isWebm ? 'libopus' : 'aac')
        .format(format)
        .outputOptions(isWebm ? [`-crf ${crf}`, '-b:v 0'] : [`-crf ${crf}`])
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
            const clientMessage =
              process.env.NODE_ENV === 'production'
                ? 'Gagal mengunggah video ke Cloudinary.'
                : `Gagal mengunggah video ke Cloudinary: ${message}`;
            reject(
              new InternalServerErrorException(clientMessage),
            );
          }
        })
        .on('error', (err) => {
          this.cleanupFiles([file.path, tempFilePath]);
          this.logger.error(`Kompresi gagal: ${err.message}`);
          const isFfmpegMissing = /ffmpeg|ENOENT/i.test(err.message);
          reject(
            new InternalServerErrorException(
              isFfmpegMissing
                ? 'FFmpeg tidak ditemukan. Instal FFmpeg dan tambahkan ke PATH server.'
                : 'Gagal memproses kompresi video.',
            ),
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
