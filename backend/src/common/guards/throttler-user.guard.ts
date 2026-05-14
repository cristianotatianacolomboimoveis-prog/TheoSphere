import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ThrottlerUserGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // If user is authenticated, use their ID as the tracker key.
    // This reduces false positives in corporate NAT scenarios (SEC-008).
    if (req.user && req.user.id) {
      return `user:${req.user.id}`;
    }
    
    // Fallback to IP address for anonymous users.
    return req.ip;
  }
}
