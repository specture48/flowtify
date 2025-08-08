import { Test, TestingModule } from '@nestjs/testing';
import { ModuleRef } from '@nestjs/core';
import { NestJSWorkflowContainer } from '../src/nestjs-workflow-container';

describe('NestJSWorkflowContainer', () => {
  let container: NestJSWorkflowContainer;
  let moduleRef: ModuleRef;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: []
    }).compile();

    moduleRef = module.get<ModuleRef>(ModuleRef);
    container = new NestJSWorkflowContainer(moduleRef);
  });

  it('should be defined', () => {
    expect(container).toBeDefined();
  });

  it('should resolve services from NestJS container', () => {
    const mockService = { test: 'value' };
    jest.spyOn(moduleRef, 'get').mockReturnValue(mockService);

    const result = container.resolve('TestService');
    
    expect(result).toBe(mockService);
    expect(moduleRef.get).toHaveBeenCalledWith('TestService', { strict: false });
  });

  it('should handle service resolution errors', () => {
    jest.spyOn(moduleRef, 'get').mockImplementation(() => {
      throw new Error('Service not found');
    });

    expect(() => container.resolve('NonExistentService'))
      .toThrow("Failed to resolve service 'NonExistentService' from NestJS container");
  });

  it('should check service existence', () => {
    jest.spyOn(moduleRef, 'get')
      .mockReturnValueOnce({ test: 'value' })
      .mockImplementationOnce(() => { throw new Error('Not found'); });

    expect(container.has('ExistingService')).toBe(true);
    expect(container.has('NonExistentService')).toBe(false);
  });

  it('should create scoped containers', () => {
    const scopedContainer = container.createScope();
    
    expect(scopedContainer).toBeInstanceOf(NestJSWorkflowContainer);
    expect(scopedContainer).not.toBe(container);
  });

  it('should handle service mapping', () => {
    const containerWithMapping = new NestJSWorkflowContainer(moduleRef, {
      serviceMapping: {
        'MAPPED_SERVICE': 'ActualService'
      }
    });

    const mockService = { mapped: true };
    jest.spyOn(moduleRef, 'get').mockReturnValue(mockService);

    containerWithMapping.resolve('MAPPED_SERVICE');
    
    expect(moduleRef.get).toHaveBeenCalledWith('ActualService', { strict: false });
  });

  it('should handle request scoping', () => {
    const containerWithScoping = new NestJSWorkflowContainer(moduleRef, {
      enableRequestScoping: true
    });

    const mockService = { scoped: true };
    jest.spyOn(moduleRef, 'get').mockReturnValue(mockService);

    containerWithScoping.resolve('ScopedService');
    
    expect(moduleRef.get).toHaveBeenCalledWith('ScopedService', { strict: false });
  });
});