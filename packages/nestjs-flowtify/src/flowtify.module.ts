import { Module, DynamicModule, Provider, Global } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WorkflowContainer } from './interfaces';
import { NestJSWorkflowContainer } from './nestjs-workflow-container';
import { 
  FLOWTIFY_MODULE_OPTIONS, 
  FLOWTIFY_WORKFLOW_CONTAINER,
  FlowtifyModuleOptions,
  FlowtifyModuleAsyncOptions
} from './interfaces';

/**
 * Simple NestJS module that provides a Flowtify WorkflowContainer
 * integrated with NestJS dependency injection
 */
@Global()
@Module({})
export class FlowtifyModule {
  /**
   * Register Flowtify module synchronously
   */
  static forRoot(options: FlowtifyModuleOptions = {}): DynamicModule {
    const providers: Provider[] = [
      {
        provide: FLOWTIFY_MODULE_OPTIONS,
        useValue: options,
      },
      {
        provide: FLOWTIFY_WORKFLOW_CONTAINER,
        useFactory: (moduleRef: ModuleRef) => {
          return new NestJSWorkflowContainer(moduleRef, options);
        },
        inject: [ModuleRef],
      },
    ];

    return {
      module: FlowtifyModule,
      providers,
      exports: [FLOWTIFY_WORKFLOW_CONTAINER],
    };
  }

  /**
   * Register Flowtify module asynchronously
   */
  static forRootAsync(options: FlowtifyModuleAsyncOptions): DynamicModule {
    const providers: Provider[] = [
      ...this.createAsyncProviders(options),
      {
        provide: FLOWTIFY_WORKFLOW_CONTAINER,
        useFactory: (moduleRef: ModuleRef, moduleOptions: FlowtifyModuleOptions) => {
          return new NestJSWorkflowContainer(moduleRef, moduleOptions);
        },
        inject: [ModuleRef, FLOWTIFY_MODULE_OPTIONS],
      },
    ];

    return {
      module: FlowtifyModule,
      imports: options.imports || [],
      providers,
      exports: [FLOWTIFY_WORKFLOW_CONTAINER],
    };
  }

  private static createAsyncProviders(options: FlowtifyModuleAsyncOptions): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }

    if (options.useClass) {
      return [
        this.createAsyncOptionsProvider(options),
        {
          provide: options.useClass,
          useClass: options.useClass,
        },
      ];
    }

    return [];
  }

  private static createAsyncOptionsProvider(options: FlowtifyModuleAsyncOptions): Provider {
    if (options.useFactory) {
      return {
        provide: FLOWTIFY_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    return {
      provide: FLOWTIFY_MODULE_OPTIONS,
      useFactory: async (optionsFactory: any) =>
        await optionsFactory.createFlowtifyOptions(),
      inject: [options.useExisting || options.useClass!],
    };
  }
}