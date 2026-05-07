import { SetMetadata } from '@nestjs/common';

export type Role = 'USER' | 'MODERATOR' | 'ADMIN';

export const ROLES_KEY = 'roles';

/**
 * Restrict a route handler to one of the listed roles.
 *
 * Pair with `RolesGuard` and `JwtAuthGuard`. Example:
 *
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles('ADMIN')
 *   @Delete('users/:id')
 *   delete(...) {}
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
