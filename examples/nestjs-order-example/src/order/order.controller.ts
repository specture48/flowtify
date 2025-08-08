import { Controller, Post, Body } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderWorkflowService } from './workflows/order-workflow.service';

@Controller('orders')
export class OrderController {
  constructor(private orderWorkflowService: OrderWorkflowService) {}

  @Post()
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    try {
      const result = await this.orderWorkflowService.executeOrderWorkflow(createOrderDto);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      // If workflow fails, compensation will run automatically
      return {
        success: false,
        error: error.message,
      };
    }
  }
}