import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

/**
 * Tokens for customers and admins are signed with JWT_SECRET. The example
 * value is public, so a server running with it lets anyone mint an admin
 * token. Refuse to start in production rather than run like that.
 */
function assertProductionSecrets() {
  if (process.env.NODE_ENV !== 'production') return;
  const secret = process.env.JWT_SECRET ?? '';
  if (secret.length < 32 || secret.startsWith('change-this')) {
    throw new Error('JWT_SECRET must be a random value of at least 32 characters in production (e.g. `openssl rand -base64 48`).');
  }
}

async function bootstrap() {
  assertProductionSecrets();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Behind a front server (Caddy) every request arrives from its address, so
  // rate limits would count all customers as one visitor. TRUST_PROXY=1 reads
  // the visitor's real address from the one proxy in front instead. Leave it
  // unset when the API is reached directly, or anyone could fake an address.
  const trustProxy = Number(process.env.TRUST_PROXY);
  if (trustProxy > 0) app.set('trust proxy', trustProxy);
  app.useStaticAssets(join(__dirname, '..', 'public'), { prefix: '/' });

  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  app.enableCors({
    origin: [
      process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001',
    ],
    credentials: true,
  });

  app.setGlobalPrefix(process.env.API_PREFIX || 'api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Pupbox API')
    .setDescription('Pupbox MVP API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.API_PORT || 4000;
  await app.listen(port);
  console.log(`Pupbox API running on http://localhost:${port}/api/v1`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
