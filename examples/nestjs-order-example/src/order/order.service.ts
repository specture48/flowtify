import { Injectable } from '@nestjs/common';

export interface Order {
  id: string;
  customerId: string;
  productId: string;
  quantity: number;
  total: number;
  status: string;
}

@Injectable()
export class OrderService {
  private orders = new Map<string, Order>();

  async createOrder(
    customerId: string,
    productId: string,
    quantity: number,
    price: number,
  ): Promise<Order> {
    const order: Order = {
      id: `order-${Date.now()}`,
      customerId,
      productId,
      quantity,
      total: quantity * price,
      status: 'created',
    };
    this.orders.set(order.id, order);
    console.log(`Created order ${order.id}`);
    return order;
  }

  async cancelOrder(orderId: string): Promise<void> {
    const order = this.orders.get(orderId);
    if (order) {
      order.status = 'cancelled';
      console.log(`Cancelled order ${orderId}`);
    }
  }

  async getOrder(orderId: string): Promise<Order | undefined> {
    return this.orders.get(orderId);
  }
}