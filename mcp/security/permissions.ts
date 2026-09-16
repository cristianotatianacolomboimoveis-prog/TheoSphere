export const MCP_PERMISSIONS = [
  'PROJECT_READ',
  'PROJECT_WRITE',
  'COMMAND_EXECUTE',
  'TEST_EXECUTE',
  'DATABASE_READ',
  'DATABASE_WRITE',
  'PRODUCTION_READ',
  'PRODUCTION_WRITE',
  'DEPLOY',
  'SECRET_ACCESS',
  'TASK_MANAGE',
  'AUDIT_READ',
  'MEMORY_WRITE',
] as const;

export type McpPermission = (typeof MCP_PERMISSIONS)[number];

/** Default-deny permission check. */
export function hasPermission(granted: readonly string[], required: McpPermission): boolean {
  return granted.includes(required);
}
