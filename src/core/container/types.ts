export interface WorkflowContainer {
  resolve<T = any>(key: string | symbol): T;
  register<T = any>(key: string | symbol, value: T | (() => T), options?: RegistrationOptions): void;
  has(key: string | symbol): boolean;
  createScope?(): WorkflowContainer;
  dispose?(): Promise<void>;
}

export interface RegistrationOptions {
  lifetime?: 'singleton' | 'scoped' | 'transient';
  dispose?: (service: any) => void | Promise<void>;
}

export interface ContainerAdapter<TContainer = any> {
  from(container: TContainer): WorkflowContainer;
  create(options?: any): WorkflowContainer;
}