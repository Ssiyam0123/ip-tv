import crypto from 'crypto';
import argon2 from 'argon2';
import { env } from '../../config/env';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface AccessTokenPayload {
  sub: string;
  role: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  tokenFamily: string;
  type: 'refresh';
}

/**
 * HMAC-SHA256 JWT implementation + Argon2id password hashing.
 */
export class AuthService {
  private readonly accessSecret: Buffer;
  private readonly refreshSecret: Buffer;
  private readonly accessExpiresIn: number; // seconds
  private readonly refreshExpiresIn: number; // seconds

  constructor() {
    this.accessSecret = Buffer.from(env.ACCESS_TOKEN_SECRET, 'utf8');
    this.refreshSecret = Buffer.from(env.REFRESH_TOKEN_SECRET, 'utf8');
    this.accessExpiresIn = this.parseDuration(env.ACCESS_TOKEN_EXPIRES_IN);
    this.refreshExpiresIn = this.parseDuration(env.REFRESH_TOKEN_EXPIRES_IN);
  }

  // ─── Password hashing (Argon2id) ─────────────────────────────────────

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19456, // 19 MB
      timeCost: 2,
      parallelism: 1,
    });
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  // ─── Token creation ───────────────────────────────────────────────────

  generateTokenFamily(): string {
    return crypto.randomUUID();
  }

  createAccessToken(userId: string, role: string): string {
    const now = Math.floor(Date.now() / 1000);
    const payload: Record<string, unknown> = {
      sub: userId,
      role,
      type: 'access',
      iat: now,
      exp: now + this.accessExpiresIn,
    };
    return this.encodeToken(payload, this.accessSecret);
  }

  createRefreshToken(
    userId: string,
    tokenFamily: string,
  ): { refreshToken: string; expiresAt: Date } {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = new Date((now + this.refreshExpiresIn) * 1000);
    const payload: Record<string, unknown> = {
      sub: userId,
      tokenFamily,
      type: 'refresh',
      iat: now,
      exp: now + this.refreshExpiresIn,
    };
    return {
      refreshToken: this.encodeToken(payload, this.refreshSecret),
      expiresAt,
    };
  }

  createTokenPair(userId: string, role: string, tokenFamily: string): TokenPair {
    const accessToken = this.createAccessToken(userId, role);
    const { refreshToken, expiresAt } = this.createRefreshToken(userId, tokenFamily);
    return { accessToken, refreshToken, expiresAt };
  }

  // ─── Token verification ───────────────────────────────────────────────

  verifyAccessToken(token: string): AccessTokenPayload | null {
    try {
      const payload = this.decodeToken(token, this.accessSecret) as Record<string, unknown>;
      if (payload?.type !== 'access' || typeof payload.sub !== 'string') return null;
      return { sub: payload.sub, role: String(payload.role ?? 'user'), type: 'access' };
    } catch {
      return null;
    }
  }

  verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      const payload = this.decodeToken(token, this.refreshSecret) as Record<string, unknown>;
      if (payload?.type !== 'refresh' || typeof payload.sub !== 'string') return null;
      return {
        sub: payload.sub,
        tokenFamily: String(payload.tokenFamily ?? ''),
        type: 'refresh',
      };
    } catch {
      return null;
    }
  }

  isTokenExpired(token: string, secret: Buffer): boolean {
    try {
      const payload = this.decodeToken(token, secret) as Record<string, unknown>;
      const exp = Number(payload?.exp ?? 0);
      return Math.floor(Date.now() / 1000) >= exp;
    } catch {
      return true;
    }
  }

  // ─── Internal encoding ────────────────────────────────────────────────

  private encodeToken(payload: Record<string, unknown>, secret: Buffer): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${signature}`;
  }

  private decodeToken(token: string, secret: Buffer): Record<string, unknown> | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, bodyB64, sigB64] = parts;
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${headerB64}.${bodyB64}`)
      .digest('base64url');

    const sigBuf = Buffer.from(sigB64, 'base64url');
    const expectedBuf = Buffer.from(expectedSig, 'base64url');

    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

    // Check expiration
    const body = JSON.parse(Buffer.from(bodyB64, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (body.exp && body.exp < now) return null;

    return body;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)\s*(s|m|h|d)$/);
    if (!match) return 900;
    const value = parseInt(match[1], 10);
    switch (match[2]) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900;
    }
  }
}

export const authService = new AuthService();
