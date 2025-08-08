# @flowtify/nestjs

NestJS integration for Flowtify workflow engine. Build powerful workflow-driven applications with NestJS's dependency injection.

## Features

- 🚀 **Simple NestJS Integration** - Works seamlessly with NestJS dependency injection
- 📦 **Container Adapter** - Bridge between Flowtify and NestJS DI container
- 💪 **TypeScript Support** - Full TypeScript support with type safety
- 🔧 **Minimal Configuration** - Get started with just one import

## Installation

```bash
npm install @flowtify/nestjs flowtify
# or
yarn add @flowtify/nestjs flowtify  
```

## Quick Start

### 1. Import the Module

```typescript
import { Module } from '@nestjs/common';
import { FlowtifyModule } from '@flowtify/nestjs';

@Module({
  imports: [
    FlowtifyModule.forRoot() // That's it!
  ]
})
export class AppModule {}
```

### 2. Use Flowtify with NestJS Services

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { FLOWTIFY_WORKFLOW_CONTAINER, WorkflowContainer } from '@flowtify/nestjs';
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from 'flowtify';

@Injectable()
export class WorkflowService {
  constructor(
    @Inject(FLOWTIFY_WORKFLOW_CONTAINER) private container: WorkflowContainer
  ) {}

  createOrderWorkflow() {
    return createWorkflow('order-processing', (input: any) => {
      // Create steps that can resolve NestJS services
      const validateStep = createStep('validate', async (data) => {
        const validator = this.container.resolve<ValidatorService>('ValidatorService');
        const result = await validator.validate(data);
        return new StepResponse(result);
      });

      const processStep = createStep('process', async (data) => {
        const processor = this.container.resolve<ProcessorService>('ProcessorService');
        const result = await processor.process(data);
        return new StepResponse(result);
      });

      // Execute steps
      const validated = validateStep(input);
      const processed = processStep(validated);
      
      return new WorkflowResponse(processed);
    });
  }

  async executeOrderWorkflow(input: any) {
    const workflow = this.createOrderWorkflow();
    const { result } = await workflow(this.container).run({ input });
    return result;
  }
}
```

### 3. Register Services for Container Resolution

```typescript
@Module({
  imports: [FlowtifyModule.forRoot()],
  providers: [
    ValidatorService,
    ProcessorService,
    WorkflowService,
    // Register services with string tokens for container resolution
    {
      provide: 'ValidatorService',
      useExisting: ValidatorService
    },
    {
      provide: 'ProcessorService', 
      useExisting: ProcessorService
    }
  ]
})
export class AppModule {}
```

## Configuration Options

### NestJS Module Configuration

```typescript
FlowtifyModule.forRoot({
  enableRequestScoping: false // Enable request-scoped containers
})
```

### Workflow Engine Configuration

Configure the workflow engine for your application size:

```typescript
import { configureWorkflows, getWorkflowConfig } from '@flowtify/nestjs';

// For large applications (default: 10,000 workflows)
configureWorkflows({
  maxWorkflows: 50000,          // Support up to 50k workflows
  enableMemoryOptimization: true,
  enableMetrics: false
});

// For enterprise applications
configureWorkflows({
  maxWorkflows: 1000000,        // Support 1M workflows!
  enableMemoryOptimization: true,
  enableMetrics: true
});

// Check current configuration
const config = getWorkflowConfig();
console.log(`Workflows: ${config.currentWorkflows}/${config.maxWorkflows}`);
```

**Important:** The default limit is 10,000 workflows. For large applications, configure this appropriately to avoid workflow eviction.

### Async Configuration

```typescript
FlowtifyModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    enableRequestScoping: configService.get('ENABLE_REQUEST_SCOPING')
  }),
  inject: [ConfigService]
})
```

## Example

Check out the complete example in the `examples/` directory that demonstrates:

- Order processing workflow with multiple steps
- Service resolution through the container
- Error handling and compensation
- Integration with NestJS controllers

Run the example:

```bash
# From package directory
cd examples && yarn start

# Or from workspace root
yarn example:order-processing
```

## API Reference

### Tokens

- `FLOWTIFY_WORKFLOW_CONTAINER` - Injection token for the workflow container
- `FLOWTIFY_MODULE_OPTIONS` - Injection token for module options

### Interfaces

- `WorkflowContainer` - Container interface for service resolution
- `FlowtifyModuleOptions` - Module configuration options

## License

MIT © Flowtify Team