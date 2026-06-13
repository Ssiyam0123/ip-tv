/* eslint-disable @typescript-eslint/no-namespace */
import { v4 as uuidv4 } from 'uuid';
import type { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
    interface Response {
      requestId: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.requestId = requestId;
  res.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}
