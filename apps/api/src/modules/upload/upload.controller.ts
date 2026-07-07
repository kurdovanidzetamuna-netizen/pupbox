import { Controller, Post, UploadedFile, UseInterceptors, UseGuards, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';

const ALLOWED = ['.jpg', '.jpeg', '.png', '.svg', '.webp'];

@ApiTags('Upload')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/upload')
export class UploadController {
  @Post('image')
  @ApiOperation({ summary: 'Upload an image file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './public/uploads',
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
          cb(null, `${unique}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (!ALLOWED.includes(ext)) {
          return cb(new BadRequestException(`Only ${ALLOWED.join(', ')} files are allowed`), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000';
    return { url: `${baseUrl}/uploads/${file.filename}` };
  }
}
