/**
 * End-to-end tests for NestJS integration
 * Tests real-world usage scenarios with TypeDI container
 */

import 'reflect-metadata';
import { Container } from 'typedi';
import { createStep, createWorkflow, StepResponse, WorkflowResponse, typeDIAdapter } from '../../src';

// Simulated NestJS services
class ProductService {
  private products = new Map<string, any>();

  async createProduct(data: any) {
    const product = { id: `prod_${Date.now()}`, ...data, createdAt: new Date() };
    this.products.set(product.id, product);
    return product;
  }

  async deleteProduct(id: string) {
    const deleted = this.products.delete(id);
    if (!deleted) {
      throw new Error(`Product ${id} not found for deletion`);
    }
    return { deleted: true, id };
  }

  async getProduct(id: string) {
    const product = this.products.get(id);
    if (!product) {
      throw new Error(`Product ${id} not found`);
    }
    return product;
  }
}

class InventoryService {
  private inventory = new Map<string, number>();

  async allocateStock(productId: string, quantity: number) {
    const currentStock = this.inventory.get(productId) || 1000; // Default stock
    if (currentStock < quantity) {
      throw new Error(`Insufficient stock for product ${productId}`);
    }
    
    this.inventory.set(productId, currentStock - quantity);
    return { productId, quantity, allocated: true, remainingStock: currentStock - quantity };
  }

  async releaseStock(productId: string, quantity: number) {
    const currentStock = this.inventory.get(productId) || 0;
    this.inventory.set(productId, currentStock + quantity);
    return { productId, quantity, released: true, newStock: currentStock + quantity };
  }

  async getStock(productId: string) {
    return this.inventory.get(productId) || 0;
  }
}

class NotificationService {
  private notifications: any[] = [];

  async sendNotification(type: string, data: any) {
    const notification = {
      id: `notif_${Date.now()}`,
      type,
      data,
      sentAt: new Date()
    };
    this.notifications.push(notification);
    return notification;
  }

  getNotifications() {
    return [...this.notifications];
  }

  clear() {
    this.notifications = [];
  }
}

describe('NestJS Integration E2E Tests', () => {
  let container: any;
  let productService: ProductService;
  let inventoryService: InventoryService;
  let notificationService: NotificationService;

  beforeEach(() => {
    // Reset TypeDI container
    Container.reset();
    
    // Create service instances
    productService = new ProductService();
    inventoryService = new InventoryService();
    notificationService = new NotificationService();

    // Register services in TypeDI (simulating NestJS DI)
    Container.set('ProductService', productService);
    Container.set('InventoryService', inventoryService);
    Container.set('NotificationService', notificationService);

    // Create workflow container
    container = typeDIAdapter.from(Container);
  });

  afterEach(() => {
    Container.reset();
  });

  describe('Complete Product Lifecycle Workflows', () => {
    test('should handle successful product creation workflow', async () => {
      // Define workflow steps
      const createProductStep = createStep(
        'create-product',
        async (productData: any, { container }) => {
          const productService = container.resolve<ProductService>('ProductService');
          const product = await productService.createProduct(productData);
          return new StepResponse(product, { productId: product.id });
        },
        async (compensateData, { container }) => {
          const productService = container.resolve<ProductService>('ProductService');
          await productService.deleteProduct(compensateData.productId);
        }
      );

      const allocateInventoryStep = createStep(
        'allocate-inventory',
        async (input: { product: any; quantity: number }, { container }) => {
          const inventoryService = container.resolve<InventoryService>('InventoryService');
          const allocation = await inventoryService.allocateStock(input.product.id, input.quantity);
          return new StepResponse(allocation, allocation);
        },
        async (allocation, { container }) => {
          const inventoryService = container.resolve<InventoryService>('InventoryService');
          await inventoryService.releaseStock(allocation.productId, allocation.quantity);
        }
      );

      const sendNotificationStep = createStep(
        'send-notification',
        async (input: { product: any; inventory: any }, { container }) => {
          const notificationService = container.resolve<NotificationService>('NotificationService');
          const notification = await notificationService.sendNotification('product_created', {
            productId: input.product.id,
            productName: input.product.name,
            allocatedQuantity: input.inventory.quantity
          });
          return new StepResponse(notification);
        }
      );

      // Define the workflow
      const createProductWorkflow = createWorkflow(
        'create-product-workflow',
        function(input: any) {
          const product = createProductStep(input);
          const inventory = allocateInventoryStep({
            product,
            quantity: input.quantity || 100
          });
          const notification = sendNotificationStep({
            product,
            inventory
          });
          
          return new WorkflowResponse({
            product,
            inventory,
            notification
          });
        }
      );

      // Execute workflow
      const { result } = await createProductWorkflow(container).run({
        input: {
          name: 'Test Product',
          price: 99.99,
          category: 'Electronics',
          quantity: 50
        }
      });

      // Verify results
      expect(result.product).toMatchObject({
        name: 'Test Product',
        price: 99.99,
        category: 'Electronics'
      });
      expect(result.product.id).toMatch(/^prod_/);

      expect(result.inventory).toMatchObject({
        productId: result.product.id,
        quantity: 50,
        allocated: true
      });

      expect(result.notification).toMatchObject({
        type: 'product_created',
        data: {
          productId: result.product.id,
          productName: 'Test Product',
          allocatedQuantity: 50
        }
      });

      // Verify services were called correctly
      const createdProduct = await productService.getProduct(result.product.id);
      expect(createdProduct).toEqual(result.product);

      const stock = await inventoryService.getStock(result.product.id);
      expect(stock).toBe(950); // 1000 - 50

      const notifications = notificationService.getNotifications();
      expect(notifications).toHaveLength(1);
    });

    test('should handle workflow failure with proper compensation', async () => {
      const createProductStep = createStep(
        'create-product',
        async (productData: any, { container }) => {
          const productService = container.resolve<ProductService>('ProductService');
          const product = await productService.createProduct(productData);
          return new StepResponse(product, { productId: product.id });
        },
        async (compensateData, { container }) => {
          const productService = container.resolve<ProductService>('ProductService');
          await productService.deleteProduct(compensateData.productId);
        }
      );

      const allocateInventoryStep = createStep(
        'allocate-inventory',
        async (input: { product: any; quantity: number }, { container }) => {
          const inventoryService = container.resolve<InventoryService>('InventoryService');
          const allocation = await inventoryService.allocateStock(input.product.id, input.quantity);
          return new StepResponse(allocation, allocation);
        },
        async (allocation, { container }) => {
          const inventoryService = container.resolve<InventoryService>('InventoryService');
          await inventoryService.releaseStock(allocation.productId, allocation.quantity);
        }
      );

      const failingNotificationStep = createStep(
        'failing-notification',
        async (input: any, { container }) => {
          throw new Error('Notification service is down');
        }
      );

      const createProductWorkflow = createWorkflow(
        'failing-product-workflow',
        function(input: any) {
          const product = createProductStep(input);
          const inventory = allocateInventoryStep({
            product,
            quantity: input.quantity || 100
          });
          const notification = failingNotificationStep({
            product,
            inventory
          });
          
          return new WorkflowResponse({
            product,
            inventory,
            notification
          });
        }
      );

      // Execute workflow and expect failure
      await expect(createProductWorkflow(container).run({
        input: {
          name: 'Test Product',
          price: 99.99,
          quantity: 50
        }
      })).rejects.toThrow('Notification service is down');

      // Verify compensations were executed
      // Product should not exist (compensated)
      const productId = Object.keys((productService as any).products)[0];
      if (productId) {
        await expect(productService.getProduct(productId)).rejects.toThrow('not found');
      }

      // Inventory should be restored (compensated)
      if (productId) {
        const stock = await inventoryService.getStock(productId);
        expect(stock).toBe(1000); // Should be restored to original
      }

      // No notifications should be sent
      const notifications = notificationService.getNotifications();
      expect(notifications).toHaveLength(0);
    });
  });

  describe('Complex Multi-Service Workflows', () => {
    test('should handle complex order processing workflow', async () => {
      // Pre-populate some products
      const existingProduct = await productService.createProduct({
        name: 'Existing Product',
        price: 199.99,
        category: 'Electronics'
      });

      const validateProductStep = createStep(
        'validate-product',
        async (input: { productId: string; quantity: number }, { container }) => {
          const productService = container.resolve<ProductService>('ProductService');
          const product = await productService.getProduct(input.productId);
          
          if (!product) {
            throw new Error(`Product ${input.productId} not found`);
          }
          
          return new StepResponse({ product, requestedQuantity: input.quantity });
        }
      );

      const checkInventoryStep = createStep(
        'check-inventory',
        async (input: { product: any; requestedQuantity: number }, { container }) => {
          const inventoryService = container.resolve<InventoryService>('InventoryService');
          const currentStock = await inventoryService.getStock(input.product.id);
          
          if (currentStock < input.requestedQuantity) {
            throw new Error(`Insufficient stock: ${currentStock} available, ${input.requestedQuantity} requested`);
          }
          
          return new StepResponse({
            product: input.product,
            availableStock: currentStock,
            requestedQuantity: input.requestedQuantity
          });
        }
      );

      const reserveInventoryStep = createStep(
        'reserve-inventory',
        async (input: any, { container }) => {
          const inventoryService = container.resolve<InventoryService>('InventoryService');
          const allocation = await inventoryService.allocateStock(
            input.product.id, 
            input.requestedQuantity
          );
          return new StepResponse(allocation, allocation);
        },
        async (allocation, { container }) => {
          const inventoryService = container.resolve<InventoryService>('InventoryService');
          await inventoryService.releaseStock(allocation.productId, allocation.quantity);
        }
      );

      const calculateTotalStep = createStep(
        'calculate-total',
        async (input: { product: any; quantity: number }, { container }) => {
          const total = input.product.price * input.quantity;
          const tax = total * 0.1; // 10% tax
          const grandTotal = total + tax;
          
          return new StepResponse({
            subtotal: total,
            tax,
            grandTotal,
            product: input.product,
            quantity: input.quantity
          });
        }
      );

      const sendOrderConfirmationStep = createStep(
        'send-order-confirmation',
        async (input: any, { container }) => {
          const notificationService = container.resolve<NotificationService>('NotificationService');
          const notification = await notificationService.sendNotification('order_confirmed', {
            orderId: `order_${Date.now()}`,
            product: input.product,
            quantity: input.quantity,
            total: input.grandTotal
          });
          return new StepResponse(notification);
        }
      );

      const orderProcessingWorkflow = createWorkflow(
        'order-processing-workflow',
        function(input: { productId: string; quantity: number }) {
          const validation = validateProductStep(input);
          const inventoryCheck = checkInventoryStep(validation);
          const reservation = reserveInventoryStep(inventoryCheck);
          const pricing = calculateTotalStep({
            product: validation.product,
            quantity: validation.requestedQuantity
          });
          const confirmation = sendOrderConfirmationStep({
            product: validation.product,
            quantity: input.quantity,
            grandTotal: pricing.grandTotal
          });
          
          return new WorkflowResponse({
            order: {
              product: validation.product,
              quantity: input.quantity,
              pricing,
              reservation,
              confirmation
            }
          });
        }
      );

      // Execute the complex workflow
      const { result } = await orderProcessingWorkflow(container).run({
        input: {
          productId: existingProduct.id,
          quantity: 3
        }
      });

      // Verify the complete order result
      expect(result.order.product).toEqual(existingProduct);
      expect(result.order.quantity).toBe(3);
      expect(result.order.pricing.subtotal).toBe(599.97); // 199.99 * 3
      expect(result.order.pricing.tax).toBe(59.997); // 10% of subtotal
      expect(result.order.pricing.grandTotal).toBe(659.967); // subtotal + tax
      
      expect(result.order.reservation).toMatchObject({
        productId: existingProduct.id,
        quantity: 3,
        allocated: true
      });

      expect(result.order.confirmation.type).toBe('order_confirmed');

      // Verify services state
      const remainingStock = await inventoryService.getStock(existingProduct.id);
      expect(remainingStock).toBe(997); // 1000 - 3

      const notifications = notificationService.getNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('order_confirmed');
    });
  });
});