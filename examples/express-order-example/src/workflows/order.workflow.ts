import { createWorkflow, WorkflowResponse } from 'flowtify';
import { createOrderStep, processPaymentStep } from './order.steps';

export interface CreateOrderRequest {
  customerId: string;
  productId: string;
  quantity: number;
  price: number;
}

export const orderWorkflow = createWorkflow('orderWorkflow', (input: CreateOrderRequest) => {
  // Step 1: Create the order
  const order = createOrderStep(input);
  
  // Step 2: Process payment
  const payment = processPaymentStep(order);
  
  return new WorkflowResponse({ order, payment });
});