import { Module } from '@nestjs/common';
import { FlowtifyModule } from 'nestjs-flowtify';
import { OrderModule } from './order/order.module';

@Module({
  imports: [
    FlowtifyModule.forRoot(),
    OrderModule,
  ],
})
export class AppModule {}