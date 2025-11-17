import puppeteer from 'puppeteer';

export interface RedeemVoucherResult {
  success: boolean;
  amount?: number;
  message?: string;
  error?: string;
}

/**
 * แลกซองอั่งเปา TrueWallet
 * @param voucherCode รหัสซอง (ไม่รวม URL prefix)
 * @param phoneNumber เบอร์โทรศัพท์ TrueWallet (10 หลัก)
 * @returns ผลลัพธ์การแลกซอง
 */
export async function redeemTrueWalletVoucher(
  voucherCode: string,
  phoneNumber: string
): Promise<RedeemVoucherResult> {
  let browser;

  try {
    // Validate inputs
    if (!voucherCode || typeof voucherCode !== 'string') {
      return {
        success: false,
        error: 'รหัสซองไม่ถูกต้อง',
      };
    }

    if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.length !== 10) {
      return {
        success: false,
        error: 'เบอร์โทรศัพท์ไม่ถูกต้อง (ต้องเป็น 10 หลัก)',
      };
    }

    // Sanitize voucher code (remove special characters except alphanumeric)
    const sanitizedCode = voucherCode.replace(/[^a-zA-Z0-9]/g, '');
    
    if (!sanitizedCode) {
      return {
        success: false,
        error: 'รหัสซองต้องมีเฉพาะตัวอักษรภาษาอังกฤษและตัวเลขเท่านั้น',
      };
    }

    console.log('🎁 Starting TrueWallet voucher redemption:', {
      voucherCode: sanitizedCode,
      phoneNumber: phoneNumber.substring(0, 3) + 'xxxxx' + phoneNumber.substring(8),
    });

    // Launch browser with Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    
    // Set user agent to look like a real browser
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Navigate to TrueWallet voucher page
    const url = `https://gift.truemoney.com/campaign/?v=${sanitizedCode}`;
    
    console.log('🌐 Navigating to TrueWallet page...');
    
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait a bit for page to settle (using Promise instead of deprecated waitForTimeout)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Execute voucher redemption in browser context
    console.log('🔄 Attempting to redeem voucher...');
    
    const result = await page.evaluate(
      async (voucher: string, phone: string) => {
        try {
          // Find the redeem API endpoint
          const redeemUrl = 'https://gift.truemoney.com/campaign/vouchers/' + voucher + '/redeem';
          
          // Make POST request to redeem voucher
          const response = await fetch(redeemUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              mobile: phone,
              voucher_hash: voucher,
            }),
          });

          if (!response.ok) {
            return {
              success: false,
              error: 'ไม่สามารถเชื่อมต่อกับ TrueWallet ได้',
            };
          }

          const data = await response.json();
          
          // Check response status
          if (data.status && data.status.code === 'SUCCESS') {
            const amount = parseFloat(data.data?.voucher?.redeemed_amount_baht || '0');
            
            return {
              success: true,
              amount: amount,
              message: `แลกซองสำเร็จ! ได้รับ ${amount} บาท`,
            };
          } else {
            // Handle different error cases
            const errorMessage = data.status?.message || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ';
            
            if (errorMessage.includes('already') || errorMessage.includes('used')) {
              return {
                success: false,
                error: 'ซองถูกใช้ไปแล้ว',
              };
            } else if (errorMessage.includes('expire')) {
              return {
                success: false,
                error: 'ซองหมดอายุแล้ว',
              };
            } else if (errorMessage.includes('not found') || errorMessage.includes('invalid')) {
              return {
                success: false,
                error: 'รหัสซองไม่ถูกต้อง',
              };
            } else {
              return {
                success: false,
                error: errorMessage,
              };
            }
          }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการแลกซอง',
          };
        }
      },
      sanitizedCode,
      phoneNumber
    );

    await browser.close();
    
    console.log('✅ Voucher redemption result:', result);
    
    return result;

  } catch (error) {
    console.error('❌ TrueWallet voucher redemption error:', error);
    
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการแลกซอง';
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Extract voucher code from TrueWallet URL or code
 * @param input URL หรือรหัสซอง
 * @returns รหัสซองที่สะอาด
 */
export function extractVoucherCode(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();
  
  // Check if input is a URL
  if (trimmed.includes('gift.truemoney.com') || trimmed.includes('http')) {
    try {
      const url = new URL(trimmed);
      const code = url.searchParams.get('v');
      return code ? code.replace(/[^a-zA-Z0-9]/g, '') : null;
    } catch {
      return null;
    }
  }
  
  // Otherwise, treat as direct code
  const sanitized = trimmed.replace(/[^a-zA-Z0-9]/g, '');
  return sanitized || null;
}

