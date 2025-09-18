import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../types';

export const JWT_SECRET = process.env.JWT_SECRET || 'yield-estimator-secret';

export interface AuthenticatedUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

interface TokenPayload extends AuthenticatedUser {
  iat: number;
  exp: number;
}

export function authenticate(requiredRoles?: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const header = req.headers['authorization'];
    if (!header) {
      return res.status(401).json({ message: 'Authorization header missing' });
    }

    const [, token] = header.split(' ');
    if (!token) {
      return res.status(401).json({ message: 'Invalid Authorization header format' });
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
      req.user = {
        id: payload.id,
        username: payload.username,
        fullName: payload.fullName,
        role: payload.role,
      };

      if (requiredRoles && !requiredRoles.includes(payload.role)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  };
}

export function issueToken(user: AuthenticatedUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '12h' });
}
