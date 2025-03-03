import { createContainer, asFunction, AwilixContainer } from 'awilix';

// Mock logger to track step execution and compensation
export class MockLogger {
    log: string[] = [];

    record(message: string) {
        this.log.push(message);
    }
}