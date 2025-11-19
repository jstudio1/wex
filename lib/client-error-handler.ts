import { getErrorMessage } from './error-messages';

/**
 * แปลง error response จาก API เป็น error message ที่เป็นมิตรกับผู้ใช้
 */
export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'object' && error !== null) {
    const err = error as { message?: string; error?: string };
    if (err.message) {
      return err.message;
    }
    if (err.error) {
      return getErrorMessage(err.error);
    }
  }
  
  return getErrorMessage('unexpected');
}

/**
 * ดึง error message จาก API response
 */
export function getApiErrorMessage(response: { message?: string; error?: string }): string {
  if (response.message) {
    return response.message;
  }
  if (response.error) {
    return getErrorMessage(response.error);
  }
  return getErrorMessage('unexpected');
}

