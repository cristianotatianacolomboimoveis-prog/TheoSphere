import { TaskStore } from './task-store';
import { Task } from '../schemas/task';

const task = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'MCP lifecycle',
  description: 'Validate the control-plane lifecycle',
  priority: 'HIGH',
  status: 'CREATED',
  files: [],
  tests: [],
  auditResults: [],
  createdAt: '2026-09-16T10:00:00.000Z',
  updatedAt: '2026-09-16T10:00:00.000Z',
  ...overrides,
});

describe('TaskStore', () => {
  it('enforces the declared lifecycle', () => {
    const store = new TaskStore();
    store.create(task());
    store.transition('task-1', 'PLANNED');
    store.transition('task-1', 'LOCKED');
    store.transition('task-1', 'IN_PROGRESS');
    store.transition('task-1', 'IMPLEMENTED');
    store.transition('task-1', 'TESTING');
    store.transition('task-1', 'AUDITING');
    const verified = store.transition('task-1', 'VERIFIED');
    expect(verified.status).toBe('VERIFIED');
  });

  it('rejects invalid transitions', () => {
    const store = new TaskStore();
    store.create(task());
    expect(() => store.transition('task-1', 'VERIFIED')).toThrow('Invalid task transition');
  });

  it('supports failure and rework without bypassing testing', () => {
    const store = new TaskStore();
    store.create(task({ status: 'IN_PROGRESS' }));
    store.transition('task-1', 'FAILED');
    store.transition('task-1', 'REWORK');
    expect(() => store.transition('task-1', 'VERIFIED')).toThrow('Invalid task transition');
    expect(store.transition('task-1', 'TESTING').status).toBe('TESTING');
  });
});
