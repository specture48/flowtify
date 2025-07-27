import 'reflect-metadata';
import { Container } from 'typedi';
import { createStep, createWorkflow, StepResponse, WorkflowResponse, typeDIAdapter } from '../src';

// Example of NestJS integration with TypeDI
// This shows how you would integrate with NestJS's dependency injection

// Simulated NestJS service (would normally have @Injectable decorator)
class ProductService {
  async createProduct(data: any) {
    return { id: '123', ...data, createdAt: new Date() };
  }

  async deleteProduct(id: string) {
    console.log(`Deleting product ${id}`);
  }
}

class InventoryService {
  async allocateStock(productId: string, quantity: number) {
    return { productId, quantity, allocated: true };
  }

  async releaseStock(productId: string, quantity: number) {
    console.log(`Releasing ${quantity} units for product ${productId}`);
  }
}

// In NestJS, you would get these from the NestJS container
// For this example, we'll register them in TypeDI
Container.set('productService', new ProductService());
Container.set('inventoryService', new InventoryService());

// Convert to WorkflowContainer
const container = typeDIAdapter.from(Container);

// Define workflow steps using Medusa pattern
const createProductStep = createStep(
  'create-product',
  async (productData: any, { container }) => {
    const productService = container.resolve<ProductService>('productService');
    const product = await productService.createProduct(productData);
    console.log('Product created:', product.id);
    return new StepResponse(product, { productId: product.id });
  },
  async (compensateData, { container }) => {
    const productService = container.resolve<ProductService>('productService');
    await productService.deleteProduct(compensateData.productId);
    console.log('Product creation compensated');
  }
);

const allocateInventoryStep = createStep(
  'allocate-inventory',
  async (input: { product: any; quantity: number }, { container }) => {
    const inventoryService = container.resolve<InventoryService>('inventoryService');
    const allocation = await inventoryService.allocateStock(input.product.id, input.quantity);
    console.log('Inventory allocated:', allocation);
    return new StepResponse(allocation, allocation);
  },
  async (allocation, { container }) => {
    const inventoryService = container.resolve<InventoryService>('inventoryService');
    await inventoryService.releaseStock(allocation.productId, allocation.quantity);
    console.log('Inventory allocation compensated');
  }
);

// Example workflow using Medusa pattern
export const createProductWorkflow = createWorkflow(
  'create-product-workflow',
  function(input: any) {
    const product = createProductStep(input);
    const inventory = allocateInventoryStep({
      product,
      quantity: input.quantity || 100
    });
    
    return new WorkflowResponse({
      product,
      inventory
    });
  }
);

// Run example
async function runExample() {
  try {
    const { result } = await createProductWorkflow(container).run({
      input: {
        name: 'Test Product',
        price: 99.99,
        quantity: 50
      }
    });
    console.log('Workflow completed successfully:', result);
  } catch (error) {
    console.error('Workflow failed (compensations ran):', error);
  }
}

runExample();