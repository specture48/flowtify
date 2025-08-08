import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
  console.log('NestJS + Flowtify app running on http://localhost:3000');
  console.log('Create order: POST http://localhost:3000/orders');
}
bootstrap();