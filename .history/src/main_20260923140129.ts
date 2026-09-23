import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman) or any origin (e.g. sv7api.cheykimrith.online)
      callback(null, true);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Support Private Network Access (PNA) for Chrome/Edge when calling localhost
  app.use((req: any, res: any, next: any) => {
    res.header('Access-Control-Allow-Private-Network', 'true');
    if (req.method === 'OPTIONS') {
      res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || '*');
      return res.sendStatus(204);
    }
    next();
  });

  // Serve Static Assets from uploads directory (with CORS headers)
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
    setHeaders: (res) => {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
    },
  });

  // Set Global Prefix
  app.setGlobalPrefix('api/v1');

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('E-Commerce & Bakong KHQR API')
    .setDescription(
      'REST API Documentation for E-Commerce Mobile App with Bakong KHQR Payments Integration & File Upload Support',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addServer('https://sv7api.cheykimrith.online', 'Production Server')
    .addServer(`http://localhost:${process.env.PORT || 3300}`, 'Local Development Server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Fallback redirects for root and /login
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/', (_req: any, res: any) => res.redirect('/api/docs'));
  expressApp.get('/login', (_req: any, res: any) => res.redirect('/api/docs'));
  expressApp.post('/login', (_req: any, res: any) => res.redirect(307, '/api/v1/auth/login'));

  const port = process.env.PORT || 3300;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}/api/v1`);
  console.log(`🌐 Production Domain: https://sv7api.cheykimrith.online`);
  console.log(`📚 Swagger documentation available at http://localhost:${port}/api/docs or https://sv7api.cheykimrith.online/api/docs`);
  console.log(`📁 File uploads directory served at http://localhost:${port}/uploads/`);
}
bootstrap();
