import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const frontendOrigin = configService.get<string>(
    'FRONTEND_ORIGIN',
    'http://localhost:4200',
  );
  const docsEnabled = configService.get<boolean>('API_DOCS_ENABLED', true);

  app.enableCors({
    origin: frontendOrigin,
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (docsEnabled) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('GreenCraft Marketplace API')
        .setDescription(
          'Sprint 2 foundation for auth, artisan onboarding, and catalog management.',
        )
        .setVersion('0.2.0')
        .addBearerAuth()
        .build(),
    );

    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  await app.listen(port);
}

bootstrap();
