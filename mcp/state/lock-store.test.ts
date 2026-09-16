import { LockStore } from './lock-store';

describe('LockStore', () => {
  it('prevents conflicting ownership and allows the owner to release', () => {
    const store = new LockStore();
    const now = new Date('2026-09-16T10:00:00.000Z');
    store.acquire('backend/src/app.ts', 'claude', 'task-1', 60_000, now);
    expect(() => store.acquire('backend/src/app.ts', 'gemini', 'task-2', 60_000, now)).toThrow('locked by claude');
    expect(() => store.release('backend/src/app.ts', 'gemini')).toThrow('Lock owned by claude');
    store.release('backend/src/app.ts', 'claude');
    expect(store.get('backend/src/app.ts')).toBeUndefined();
  });

  it('expires locks deterministically', () => {
    const store = new LockStore();
    const start = new Date('2026-09-16T10:00:00.000Z');
    store.acquire('file.ts', 'claude', 'task-1', 1_000, start);
    expect(store.get('file.ts')).toBeDefined();
    store.acquire('other.ts', 'gemini', 'task-2', 1_000, new Date(start.getTime() + 2_000));
    expect(store.get('file.ts')).toBeUndefined();
  });
});
