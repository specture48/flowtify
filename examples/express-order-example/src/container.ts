import { awilixAdapter } from 'flowtify';
import { OrderService } from './services/order.service';
import { PaymentService } from './services/payment.service';

// Global container instance
let container: any;

export function setupContainer() {
  container = awilixAdapter.create();
  
  // Register services
  container.register('orderService', new OrderService());
  container.register('paymentService', new PaymentService());
  
  console.log('Container setup complete');
}

export function getContainer() {
  if (!container) {
    throw new Error('Container not initialized. Call setupContainer() first.');
  }
  return container;
}