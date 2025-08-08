import { createStep, StepResponse } from 'flowtify';
import { OrderService } from '../services/order.service';
import { PaymentService } from '../services/payment.service';

export const createOrderStep = createStep('createOrder',
  async (input: { customerId: string; productId: string; quantity: number; price: number }, context) => {
    const orderService = context.container.resolve('orderService') as OrderService;
    const order = await orderService.createOrder(
      input.customerId,
      input.productId,
      input.quantity,
      input.price
    );
    return new StepResponse(order, { orderId: order.id });
  },
  async (compensateInput: { orderId: string }, context) => {
    const orderService = context.container.resolve('orderService') as OrderService;
    await orderService.cancelOrder(compensateInput.orderId);
  }
);

export const processPaymentStep = createStep('processPayment',
  async (order: any, context) => {
    const paymentService = context.container.resolve('paymentService') as PaymentService;
    const payment = await paymentService.processPayment(order.id, order.total);
    return new StepResponse(payment, { 
      paymentId: payment.id, 
      amount: payment.amount 
    });
  },
  async (compensateInput: { paymentId: string; amount: number }, context) => {
    const paymentService = context.container.resolve('paymentService') as PaymentService;
    await paymentService.refundPayment(compensateInput.paymentId, compensateInput.amount);
  }
);