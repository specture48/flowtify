import { Injectable } from '@nestjs/common';
import { WorkflowService } from 'nestjs-flowtify';
import { OrderService } from '../order.service';
import { PaymentService } from '../payment.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { orderWorkflow } from './order.workflow';

@Injectable()
export class OrderWorkflowService {
  constructor(
    private workflowService: WorkflowService,
    private orderService: OrderService,
    private paymentService: PaymentService,
  ) {
    // Register services in the NestJS-managed container
    this.workflowService.registerService('orderService', this.orderService);
    this.workflowService.registerService('paymentService', this.paymentService);
  }

  async executeOrderWorkflow(createOrderDto: CreateOrderDto) {
    return this.workflowService.execute(orderWorkflow, createOrderDto);
  }
}