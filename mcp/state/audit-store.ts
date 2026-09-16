import { AuditEvent } from '../schemas/audit';

export class AuditStore {
  private readonly events: AuditEvent[] = [];

  append(event: AuditEvent): AuditEvent {
    if (this.events.some((existing) => existing.id === event.id)) {
      throw new Error(`Audit event already exists: ${event.id}`);
    }
    this.events.push(structuredClone(event));
    return structuredClone(event);
  }

  list(): AuditEvent[] {
    return this.events.map((event) => structuredClone(event));
  }

  findByTask(taskId: string): AuditEvent[] {
    return this.events.filter((event) => event.taskId === taskId).map((event) => structuredClone(event));
  }
}
