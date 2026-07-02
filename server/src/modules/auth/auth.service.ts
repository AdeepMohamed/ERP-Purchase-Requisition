import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { LoginInput } from '../../utils/validate';
import { UnauthorizedError } from '../../utils/errors';

const prisma = new PrismaClient();

export async function loginService(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Use the same error for "user not found" and "wrong password" to prevent user enumeration attacks
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');

  // Embed only non-sensitive identity fields in the token — never include passwordHash
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      department: user.department,
      isDeptHead: user.isDeptHead,
    },
    secret,
    { expiresIn: (process.env.JWT_EXPIRES_IN ?? '8h') as any }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      isDeptHead: user.isDeptHead,
    },
  };
}
