import { Module } from '@nestjs/common';
import { FlowtifyModule } from 'nestjs-flowtify';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { PaymentService } from './payment.service';
import { OrderWorkflowService } from './workflows/order-workflow.service';

@Module({
  imports: [FlowtifyModule],
  controllers: [OrderController],
  providers: [OrderService, PaymentService, OrderWorkflowService],
})
export class OrderModule {}