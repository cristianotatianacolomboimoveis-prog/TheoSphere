/**
 * Augments Express's `Request` with our authenticated user shape.
 *
 * Populated by `JwtAuthGuard` → `JwtStrategy.validate()` returns
 * `{ userId, email }`; the `role` field is added by `RolesGuard` after
 * looking it up against the DB.
 *
 * With this declaration we can drop the `(req as any).user` casts that
 * litter the controllers. Use `req.user?.userId` directly.
 */

import type { Role } from '../auth/roles.decorator';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface User {
      userId: string;
      email: string;
      role?: Role;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
