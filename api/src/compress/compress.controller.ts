import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { CompressService } from './compress.service';

const ALLOWED_FORMATS = ['mp4', 'avi', 'mkv', 'mov', 'webm'] as const;
const ALLOWED_QUALITIES = ['highest', 'standard', 'low'] as const;
const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024;

@Controller('compress')
export class CompressController {
  constructor(private readonly compressService: CompressService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('video', {
      limits: { fileSize: MAX_VIDEO_SIZE },
      storage: diskStorage({
        destination: './temp_raw',
        filename: (req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const ext = path.extname(file.originalname);
          cb(null, `raw-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('video/')) {
          return cb(
            new BadRequestException('Hanya berkas video yang diperbolehkan!'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async handleVideoCompression(
    @UploadedFile() file: Express.Multer.File,
    @Body('quality') quality: string,
    @Body('format') format: string,
  ) {
    if (!file) {
      throw new BadRequestException('Berkas video wajib diunggah!');
    }

    const normalizedFormat = format?.toLowerCase();
    const normalizedQuality = quality?.toLowerCase() ?? 'standard';

    if (!ALLOWED_FORMATS.includes(normalizedFormat as (typeof ALLOWED_FORMATS)[number])) {
      throw new BadRequestException('Format harus salah satu dari: MP4, AVI, MKV, MOV, WEBM.');
    }

    if (!ALLOWED_QUALITIES.includes(normalizedQuality as (typeof ALLOWED_QUALITIES)[number])) {
      throw new BadRequestException('Kualitas harus highest, standard, atau low.');
    }

    const cloudinaryResult = await this.compressService.compressAndUpload(
      file,
      normalizedQuality,
      normalizedFormat,
    );

    return {
      message: 'Video berhasil dikompresi dan diunggah!',
      data: {
        publicId: cloudinaryResult.public_id,
        downloadUrl: cloudinary.url(cloudinaryResult.public_id, {
          resource_type: 'video',
          format: cloudinaryResult.format,
          version: cloudinaryResult.version,
          flags: 'attachment',
          secure: true,
        }),
        format: cloudinaryResult.format,
        bytes: cloudinaryResult.bytes,
      },
    };
  }
}
