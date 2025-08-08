import { Request, Response } from 'express';
import { orderWorkflow, CreateOrderRequest } from '../workflows/order.workflow';
import { getContainer } from '../container';

export class OrderController {
  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const createOrderRequest: CreateOrderRequest = req.body;
      
      // Validate request
      if (!createOrderRequest.customerId || !createOrderRequest.productId || 
          !createOrderRequest.quantity || !createOrderRequest.price) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: customerId, productId, quantity, price'
        });
        return;
      }

      // Execute workflow
      const workflow = orderWorkflow();
      const result = await workflow.run({
        input: createOrderRequest,
        container: getContainer(),
      });

      res.status(201).json({
        success: true,
        data: result.result,
      });
    } catch (error) {
      console.error('Order creation failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const container = getContainer();
      const orderService = container.resolve('orderService');
      
      const order = await orderService.getOrder(id);
      
      if (!order) {
        res.status(404).json({
          success: false,
          error: 'Order not found'
        });
        return;
      }

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      console.error('Get order failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}