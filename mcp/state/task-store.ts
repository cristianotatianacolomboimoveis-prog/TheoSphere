import { Task, TaskStatus, canTransition } from '../schemas/task';

export class TaskStore {
  private readonly tasks = new Map<string, Task>();

  create(task: Task): Task {
    if (this.tasks.has(task.id)) throw new Error(`Task already exists: ${task.id}`);
    this.tasks.set(task.id, structuredClone(task));
    return this.get(task.id);
  }

  get(id: string): Task {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task not found: ${id}`);
    return structuredClone(task);
  }

  list(): Task[] {
    return [...this.tasks.values()].map((task) => structuredClone(task));
  }

  transition(id: string, to: TaskStatus, now = new Date().toISOString()): Task {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task not found: ${id}`);
    if (!canTransition(task.status, to)) {
      throw new Error(`Invalid task transition: ${task.status} -> ${to}`);
    }
    task.status = to;
    task.updatedAt = now;
    return structuredClone(task);
  }

  update(id: string, patch: Partial<Omit<Task, 'id' | 'status' | 'createdAt' | 'updatedAt'>>): Task {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task not found: ${id}`);
    Object.assign(task, patch, { updatedAt: new Date().toISOString() });
    return structuredClone(task);
  }
}
