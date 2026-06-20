import { cookies } from 'next/headers';
import { verifyJwt } from './jwt';

export async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  try {
    const payload = await verifyJwt<{ sub: string; username: string }>(token);
    return { id: Number(payload.sub), username: payload.username };
  } catch {
    return null;
  }
}



