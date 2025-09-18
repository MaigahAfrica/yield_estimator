import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { findUserByUsername } from '../storage';
import { issueToken } from '../middleware/auth';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() });
  }

  const { username, password } = parsed.data;
  const user = await findUserByUsername(username);
  if (!user) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  const token = issueToken({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
  });

  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    },
  });
});

export default router;
