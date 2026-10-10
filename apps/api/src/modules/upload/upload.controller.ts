import { Controller, Post, UploadedFile, UseInterceptors, UseGuards, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { AdminPerms } from '../admin-auth/admin-permissions';

const ALLOWED = ['.jpg', '.jpeg', '.png', '.svg', '.webp'];

// The same folder main.ts serves at /uploads. A path relative to the working
// directory only matched in development; in the container files were saved
// to /app/public/uploads and served from /app/apps/api/public, so every
// uploaded image was a broken link.
const UPLOAD_DIR = join(__dirname, '..', '..', '..', 'public', 'uploads');

@ApiTags('Upload')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@AdminPerms({ read: ['cms.edit', 'products.edit', 'products.create'], write: ['cms.edit', 'products.edit', 'products.create'] })
@Controller('admin/upload')
export class UploadController {
  @Post('image')
  @ApiOperation({ summary: 'Upload an image file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
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
