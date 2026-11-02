import bcrypt from 'bcryptjs';
import { AppError } from '../../shared/AppError';
import { LOGIN_ENABLED_ROLES, UserRole } from '../../shared/constants';
import type { LoginInput } from './auth.schema';
import { signToken } from './token';
import { User } from './user.model';

const BCRYPT_COST = 12;

export interface PublicUser {
  id: string;
  email: string;
  role: UserRole;
}

const toPublicUser = (u: { _id: unknown; email: string; role: UserRole }): PublicUser => ({
  id: String(u._id),
  email: u.email,
  role: u.role,
});

// Compared against when the email is unknown, so response time does not reveal
// which emails exist (user-enumeration protection).
let dummyHash: string | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hashSync('not-a-real-password', BCRYPT_COST));

export const hashPassword = (plain: string) => bcrypt.hash(plain, BCRYPT_COST);

export async function login({ email, password }: LoginInput) {
  const user = await User.findOne({ email }).select('+passwordHash');

  const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? getDummyHash());
  if (!user || !passwordOk) {
    // Same message for "unknown email" and "wrong password".
    throw AppError.unauthorized('Invalid email or password');
  }

  // Checked AFTER the password so that role status is never revealed to someone
  // who does not know the credentials.
  if (!LOGIN_ENABLED_ROLES.includes(user.role)) {
    throw AppError.forbidden(`The ${user.role} portal is coming soon`, 'ROLE_NOT_ENABLED');
  }

  const token = signToken({ userId: String(user._id), role: user.role });
  return { token, user: toPublicUser(user) };
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await User.findById(userId);
  if (!user) throw AppError.unauthorized('Account no longer exists');
  return toPublicUser(user);
}
