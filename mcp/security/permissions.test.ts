import { hasPermission } from './permissions';

describe('MCP permissions', () => {
  it('denies by default', () => {
    expect(hasPermission([], 'PROJECT_READ')).toBe(false);
    expect(hasPermission([], 'PRODUCTION_WRITE')).toBe(false);
  });

  it('grants only explicitly listed permissions', () => {
    expect(hasPermission(['PROJECT_READ'], 'PROJECT_READ')).toBe(true);
    expect(hasPermission(['PROJECT_READ'], 'PROJECT_WRITE')).toBe(false);
  });
});
