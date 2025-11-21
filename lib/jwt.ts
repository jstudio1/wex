import { SignJWT, jwtVerify } from 'jose';

const encoder = new TextEncoder();

export type JwtPayload = {
  sub: string; // user id as string
  username: string;
};

export async function signJwt(payload: JwtPayload, expiresIn = '7d'): Promise<string> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  // jose library v6 รับ Uint8Array โดยตรงสำหรับ HS256
  const secretKey = encoder.encode(secret);
  // สร้าง SignJWT instance โดยส่ง payload เป็น object
  const jwt = new SignJWT(payload);
  jwt.setProtectedHeader({ alg: 'HS256' });
  jwt.setIssuedAt();
  jwt.setExpirationTime(expiresIn);
  return await jwt.sign(secretKey);
}

export async function verifyJwt<T = JwtPayload>(token: string): Promise<T> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  const secretKey = encoder.encode(secret);
  const { payload } = await jwtVerify(token, secretKey);
  return payload as T;
}



