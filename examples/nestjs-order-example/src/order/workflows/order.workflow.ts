import { createWorkflow, WorkflowResponse } from 'flowtify';
import { CreateOrderDto } from '../dto/create-order.dto';
import { createOrderStep, processPaymentStep } from './order.steps';

export const orderWorkflow = createWorkflow('orderWorkflow', (input: CreateOrderDto) => {
  // Step 1: Create the order
  const order = createOrderStep(input);
  
  // Step 2: Process payment
  const payment = processPaymentStep(order);
  
  return new WorkflowResponse({ order, payment });
});