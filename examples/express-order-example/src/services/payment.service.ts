export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  status: string;
}

export interface Refund {
  refundId: string;
  amount: number;
}

export class PaymentService {
  private payments = new Map<string, Payment>();

  async processPayment(orderId: string, amount: number): Promise<Payment> {
    const payment: Payment = {
      id: `payment-${Date.now()}`,
      orderId,
      amount,
      status: 'completed',
    };
    this.payments.set(payment.id, payment);
    console.log(`Processed payment ${payment.id} for $${amount}`);
    return payment;
  }

  async refundPayment(paymentId: string, amount: number): Promise<Refund> {
    console.log(`Refunded payment ${paymentId} for $${amount}`);
    return { 
      refundId: `refund-${Date.now()}`, 
      amount 
    };
  }

  async getPayment(paymentId: string): Promise<Payment | undefined> {
    return this.payments.get(paymentId);
  }
}