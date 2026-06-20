import { AccountValidationResult } from '@/lib/types/slip';

export function validateBankAccount(
  userAccount: string,
  apiAccountPattern: string
): boolean {
  try {
    if (!userAccount || !apiAccountPattern) {
      console.log('🔍 Validation failed: Missing account data');
      return false;
    }

    // Remove non-numeric characters from user account
    const userNumbers = userAccount.replace(/[^0-9]/g, '');
    // Remove only dashes from API pattern
    const apiPattern = apiAccountPattern.replace(/-/g, '');

    if (!userNumbers || !apiPattern) {
      console.log('🔍 Validation failed: No data found');
      return false;
    }

    console.log('🔍 Pattern Matching:', {
      userAccount,
      userNumbers,
      apiPattern,
      userLength: userNumbers.length,
      patternLength: apiPattern.length,
    });

    // If lengths don't match, use substring matching
    if (userNumbers.length !== apiPattern.length) {
      console.log('🔄 Length mismatch, using substring matching');
      const apiNumbers = apiPattern.replace(/[^0-9]/g, '');
      console.log('🔄 Substring matching:', {
        userNumbers,
        apiNumbers,
        userLength: userNumbers.length,
        apiLength: apiNumbers.length,
        includes: userNumbers.includes(apiNumbers),
      });
      
      // ถ้า apiNumbers มีตัวเลข ให้ตรวจสอบว่า userNumbers มี apiNumbers อยู่หรือไม่
      if (apiNumbers && apiNumbers.length > 0) {
        return userNumbers.includes(apiNumbers);
      }
      
      // ถ้าไม่มีตัวเลขใน pattern ให้ return false
      return false;
    }

    // Position-by-position pattern matching
    console.log('🎯 Starting position-by-position matching');

    for (let i = 0; i < apiPattern.length; i++) {
      const userChar = userNumbers[i];
      const patternChar = apiPattern[i];

      // Skip hidden positions (x or X)
      if (patternChar === 'x' || patternChar === 'X') {
        continue;
      }

      // Check if it's a digit
      if (/\d/.test(patternChar)) {
        if (userChar !== patternChar) {
          console.log(
            `❌ Mismatch at position ${i}: ${userChar} vs ${patternChar}`
          );
          return false;
        }
      }
    }

    console.log('✅ Pattern matching successful');
    return true;
    
  } catch (error) {
    console.error('Error in pattern matching:', error);
    return false;
  }
}

