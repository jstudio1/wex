import { SignJWT, jwtVerify } from 'jose';

const encoder = new TextEncoder();

export type JwtPayload = {
  sub: string; // user id as string
  username: string;
};

export async function signJwt(payload: JwtPayload, expiresIn = '7d'): Promise<string> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(encoder.encode(secret));
}

export async function verifyJwt<T = JwtPayload>(token: string): Promise<T> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  const { payload } = await jwtVerify(token, encoder.encode(secret));
  return payload as T;
}



