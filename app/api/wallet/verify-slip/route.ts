import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { 
  verifySlipWithRDCW, 
  verifySlipWithSlipOK,
  normalizeSlipOKResponse,
} from '@/lib/utils/slip-api';
import { validateBankAccount } from '@/lib/utils/slip-validation';
import {
  SlipVerificationError,
  ErrorCodes,
  type VerifySlipRequest,
  type VerifySlipResponse,
  type RDCWApiResponse,
  type SlipOKApiResponse,
} from '@/lib/types/slip';

// Validation Schema
const verifySlipSchema = z.object({
  qrPayload: z.string().min(1, 'QR Payload is required'),
});

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const wantsDebug =
    url.searchParams.get('debug') === 'true' ||
    request.headers.get('x-slip-debug') === 'true';
  const isDebugMode =
    wantsDebug ||
    process.env.SLIP_DEBUG === 'true' ||
    process.env.NODE_ENV !== 'production';
  let debugContext: VerifySlipResponse['debug'] | undefined;

  try {

    // 1. Check Authentication
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json<VerifySlipResponse>(
        {
          success: false,
          error: 'กรุณาเข้าสู่ระบบ',
        },
        { status: 401 }
      );
    }

    const userId = user.id;
    if (isDebugMode) {
      debugContext = { details: { userId } };
    }

    // 2. Parse and Validate Request
    const body: VerifySlipRequest = await request.json();
    const validatedData = verifySlipSchema.parse(body);
    const { qrPayload } = validatedData;

    console.log('🔍 Starting slip verification for user:', userId);

    const sb = createServiceClient();
    const insertHistory = async (entry: {
      user_id: number;
      transaction_id: string | null;
      amount: number;
      points_added: number;
      qr_payload: string;
      status: 'success' | 'failed';
      error_message?: string | null;
      rdcw_response?: RDCWApiResponse | SlipOKApiResponse | null;
    }) => {
      const { error: historyError } = await sb.from('slip_history').insert({
        ...entry,
        error_message: entry.error_message ?? null,
        rdcw_response: entry.rdcw_response ?? null,
      });

      if (historyError) {
        console.error('Error inserting slip history:', historyError);

        if (historyError.code === '23505') {
          throw new SlipVerificationError(
            'สลิปนี้เคยใช้แล้ว',
            ErrorCodes.DUPLICATE_SLIP,
            400,
            historyError
          );
        }

        throw new SlipVerificationError(
          'ไม่สามารถบันทึกประวัติสลิปได้',
          ErrorCodes.DATABASE_ERROR,
          500,
          historyError
        );
      }
    };

    // 3. Get Slip Verification Settings
    const { data: settings, error: settingsError } = await sb
      .from('slip_verification_settings')
      .select('*')
      .maybeSingle();

    if (settingsError || !settings) {
      throw new SlipVerificationError(
        'ยังไม่ได้ตั้งค่าระบบตรวจสอบสลิป กรุณาติดต่อผู้ดูแลระบบ',
        ErrorCodes.DATABASE_ERROR,
        500
      );
    }

    const provider = settings.provider || 'rdcw';

    // 4. Verify Slip with selected API provider
    let apiResult: RDCWApiResponse | SlipOKApiResponse;
    let slipData: {
      transRef?: string;
      ref1?: string;
      amount: number;
      sender: {
        account: {
          value: string;
        };
        name?: string;
      };
      receiver: {
        account: {
          value: string;
        };
        name?: string;
      };
      transactionDate?: string;
      transactionTime?: string;
    };

    try {
      if (provider === 'slipok') {
        // Verify with SlipOK API
        if (!settings.slipok_branch_id || !settings.slipok_api_key) {
          throw new SlipVerificationError(
            'ยังไม่ได้ตั้งค่า SlipOK API กรุณาติดต่อผู้ดูแลระบบ',
            ErrorCodes.API_ERROR,
            500,
            { settings }
          );
        }

        apiResult = await verifySlipWithSlipOK(
          qrPayload,
          settings.slipok_branch_id,
          settings.slipok_api_key
        );

        if (isDebugMode) {
          console.log('🧾 SlipOK API Result:', JSON.stringify(apiResult, null, 2));
        }

        // Handle SlipOK error codes
        const errorCode = apiResult.code;
        
        // Error codes ที่มี data กลับมา - ให้ตรวจสอบเอง (เหมือน RDCW)
        // 1014 = บัญชีไม่ตรง (SlipOK ตรวจสอบกับบัญชีหลักใน SlipOK แล้ว แต่เราต้องการตรวจสอบกับบัญชีในระบบของเราเอง)
        // 1013 = ยอดไม่ตรง (SlipOK ตรวจสอบเอง แต่เราต้องการตรวจสอบเองด้วย)
        // **หมายเหตุ**: SlipOK จะตรวจสอบบัญชีกับบัญชีหลักที่ตั้งค่าไว้ใน SlipOK (ผ่าน branch_id)
        // แต่เรายังต้องการให้ตรวจสอบกับบัญชีที่ตั้งค่าไว้ในระบบของเราเองด้วย
        
        // ถ้ามี error code 1014 หรือ 1013 แต่มี data กลับมา ให้ข้ามการ throw error และไปตรวจสอบเอง
        const shouldSkipSlipOKValidation = (errorCode === 1014 || errorCode === 1013) && apiResult.data;
        
        // Error codes ที่ต้อง throw error ทันที (ไม่มี data หรือ error code อื่นๆ)
        // 1012 = สลิปซ้ำ (ต้อง throw ทันที)
        // 1010 = ธนาคารล่าช้า (ต้อง throw ทันที)
        if (!shouldSkipSlipOKValidation && (!apiResult.success || !apiResult.data)) {
          let errorMessage = apiResult.message || 'สลิปไม่ถูกต้องหรือไม่สามารถอ่านได้';

          // Map SlipOK error codes to user-friendly messages
          if (errorCode === 1012) {
            errorMessage = 'สลิปซ้ำ สลิปนี้เคยใช้แล้ว';
          } else if (errorCode === 1010) {
            errorMessage = apiResult.message || 'กรุณารอสักครู่แล้วลองใหม่อีกครั้ง';
          }

          await insertHistory({
            user_id: userId,
            transaction_id: null,
            amount: 0,
            points_added: 0,
            qr_payload: qrPayload,
            status: 'failed',
            error_message: errorMessage,
            rdcw_response: apiResult,
          });

          throw new SlipVerificationError(
            errorMessage,
            ErrorCodes.INVALID_QR,
            400,
            apiResult
          );
        }

        // ถ้ามี data กลับมา (ไม่ว่าจะมี error code หรือไม่) ให้ normalize และตรวจสอบเอง
        if (apiResult.data) {
          // Normalize SlipOK response to common format
          slipData = normalizeSlipOKResponse(apiResult.data);
          
          if (shouldSkipSlipOKValidation) {
            console.log('⚠️ SlipOK returned error code', errorCode, 'but has data. Will validate ourselves.');
          }
        } else {
          // ไม่มี data กลับมา - throw error
          throw new SlipVerificationError(
            apiResult.message || 'สลิปไม่ถูกต้องหรือไม่สามารถอ่านได้',
            ErrorCodes.INVALID_QR,
            400,
            apiResult
          );
        }
      } else {
        // Verify with RDCW API (default)
        if (!settings.rdcw_client_id || !settings.rdcw_client_secret || !settings.rdcw_endpoint) {
          throw new SlipVerificationError(
            'ยังไม่ได้ตั้งค่า RDCW API กรุณาติดต่อผู้ดูแลระบบ',
            ErrorCodes.API_ERROR,
            500,
            { settings }
          );
        }

        apiResult = await verifySlipWithRDCW(
          qrPayload,
          settings.rdcw_endpoint,
          settings.rdcw_client_id,
          settings.rdcw_client_secret
        );

        if (isDebugMode) {
          console.log('🧾 RDCW API Result:', JSON.stringify(apiResult, null, 2));
        }

        if (!apiResult.valid || !apiResult.data) {
          await insertHistory({
            user_id: userId,
            transaction_id: null,
            amount: 0,
            points_added: 0,
            qr_payload: qrPayload,
            status: 'failed',
            error_message: apiResult.error || 'สลิปไม่ถูกต้องหรือไม่สามารถอ่านได้',
            rdcw_response: apiResult,
          });

          throw new SlipVerificationError(
            apiResult.error || 'สลิปไม่ถูกต้องหรือไม่สามารถอ่านได้',
            ErrorCodes.INVALID_QR,
            400,
            apiResult
          );
        }

        slipData = apiResult.data;
      }

      if (isDebugMode) {
        debugContext = {
          ...debugContext,
          apiResult,
          settings: {
            minimumAmount: Number(settings.minimum_topup_amount) || 49,
          },
        };
      }
    } catch (error) {
      if (error instanceof SlipVerificationError) {
        throw error;
      }
      console.error(`${provider.toUpperCase()} API Error:`, error);
      throw new SlipVerificationError(
        `ไม่สามารถเชื่อมต่อกับ ${provider.toUpperCase()} API ได้`,
        ErrorCodes.API_ERROR,
        500,
        error
      );
    }

    // 5. Validate Amount
    const amount = slipData.amount;
    
    if (amount <= 0) {
      await insertHistory({
        user_id: userId,
        transaction_id: slipData.transRef || slipData.ref1 || null,
        amount: 0,
        points_added: 0,
        qr_payload: qrPayload,
        status: 'failed',
        error_message: 'ไม่สามารถอ่านจำนวนเงินจากสลิปได้',
        rdcw_response: apiResult,
      });

      throw new SlipVerificationError(
        'ไม่สามารถอ่านจำนวนเงินจากสลิปได้',
        ErrorCodes.INVALID_AMOUNT,
        400,
        { apiResult }
      );
    }

    const minimumAmount = Number(settings.minimum_topup_amount) || 49;

    if (amount < minimumAmount) {
      await insertHistory({
        user_id: userId,
        transaction_id: slipData.transRef || slipData.ref1 || null,
        amount: amount,
        points_added: 0,
        qr_payload: qrPayload,
        status: 'failed',
        error_message: `จำนวนเงินต้องไม่น้อยกว่า ${minimumAmount.toFixed(2)} บาท`,
        rdcw_response: apiResult,
      });

      throw new SlipVerificationError(
        `จำนวนเงินต้องไม่น้อยกว่า ${minimumAmount.toFixed(2)} บาท (ปัจจุบัน: ${amount.toFixed(2)} บาท)`,
        ErrorCodes.INVALID_AMOUNT,
        400,
        { amount, minimumAmount }
      );
    }

    // 6. Validate Receiver Account (ใช้เลขที่บัญชีจาก bankAccounts)
    const { data: bankAccountsSetting } = await sb
      .from('settings')
      .select('value')
      .eq('key', 'BANK_TRANSFER_ACCOUNTS')
      .maybeSingle();

    if (bankAccountsSetting?.value) {
      try {
        const bankAccounts = JSON.parse(bankAccountsSetting.value);
        if (Array.isArray(bankAccounts) && bankAccounts.length > 0) {
          const receiverAccount = slipData.receiver.account.value;
          let accountMatched = false;

          console.log('🔍 Validating receiver account:', {
            receiverAccount,
            bankAccounts: bankAccounts.map(a => a.accountNumber),
          });

          // ตรวจสอบกับทุกบัญชีที่ตั้งค่าไว้
          for (const account of bankAccounts) {
            if (account.accountNumber) {
              const isValid = validateBankAccount(account.accountNumber, receiverAccount);
              console.log('🔍 Account validation result:', {
                userAccount: account.accountNumber,
                apiAccount: receiverAccount,
                isValid,
              });
              
              if (isValid) {
                accountMatched = true;
                break;
              }
            }
          }

          if (!accountMatched) {
            console.log('❌ Account validation failed:', {
              receiverAccount,
              expectedAccounts: bankAccounts.map(a => a.accountNumber),
            });

            await insertHistory({
              user_id: userId,
              transaction_id: slipData.transRef || slipData.ref1 || null,
              amount: amount,
              points_added: 0,
              qr_payload: qrPayload,
              status: 'failed',
              error_message: 'บัญชีผู้รับเงินไม่ถูกต้อง',
              rdcw_response: apiResult,
            });

            throw new SlipVerificationError(
              'บัญชีผู้รับเงินไม่ถูกต้อง กรุณาโอนเข้าบัญชีที่ระบุไว้',
              ErrorCodes.INVALID_ACCOUNT,
              400,
              { actual: receiverAccount, expectedAccounts: bankAccounts.map(a => a.accountNumber) }
            );
          }

          console.log('✅ Account validation passed');
        }
      } catch (parseError) {
        console.error('Error parsing bank accounts:', parseError);
        // ถ้า parse ไม่ได้ ให้ข้ามการตรวจสอบบัญชี
      }
    }

    // 7. Check Duplicate Slip
    const transactionId = slipData.transRef || slipData.ref1 || '';
    
    // Check duplicate by transaction_id (if available)
    if (transactionId) {
      const { data: existingSlip } = await sb
        .from('slip_history')
        .select('id')
        .eq('transaction_id', transactionId)
        .eq('status', 'success')
        .maybeSingle();
      
      if (existingSlip) {
        await insertHistory({
          user_id: userId,
          transaction_id: transactionId,
          amount: amount,
          points_added: 0,
          qr_payload: qrPayload,
          status: 'failed',
          error_message: 'สลิปนี้เคยใช้แล้ว',
          rdcw_response: apiResult,
        });

        throw new SlipVerificationError(
          'สลิปนี้เคยใช้แล้ว',
          ErrorCodes.DUPLICATE_SLIP,
          400,
          { transactionId, duplicateBy: 'transaction_id' }
        );
      }
    }

    // Also check duplicate by qr_payload (for cases where transaction_id is not available)
    const { data: existingSlipByPayload } = await sb
      .from('slip_history')
      .select('id')
      .eq('qr_payload', qrPayload)
      .eq('status', 'success')
      .maybeSingle();
    
    if (existingSlipByPayload) {
      await insertHistory({
        user_id: userId,
        transaction_id: transactionId || null,
        amount: amount,
        points_added: 0,
        qr_payload: qrPayload,
        status: 'failed',
        error_message: 'สลิปนี้เคยใช้แล้ว',
        rdcw_response: apiResult,
      });

      throw new SlipVerificationError(
        'สลิปนี้เคยใช้แล้ว',
        ErrorCodes.DUPLICATE_SLIP,
        400,
        { duplicateBy: 'qr_payload' }
      );
    }

    // 8. Process Transaction - Add Points (1 บาท = 1 พ้อยต์)
    const pointsToAdd = amount;
    
    // Get current user points
    const { data: currentUser, error: getUserError } = await sb
      .from('users')
      .select('points')
      .eq('id', userId)
      .single();

    if (getUserError || !currentUser) {
      console.error('Error getting user points:', getUserError);
      throw new SlipVerificationError(
        'ไม่สามารถดึงข้อมูลผู้ใช้ได้',
        ErrorCodes.DATABASE_ERROR,
        500
      );
    }

    const newPoints = Number(currentUser.points) + pointsToAdd;

    // Update user points
    const { data: updatedUser, error: updateError } = await sb
      .from('users')
      .update({ points: newPoints })
      .eq('id', userId)
      .select('points')
      .single();

    if (updateError || !updatedUser) {
      console.error('Error updating user points:', updateError);
      throw new SlipVerificationError(
        'ไม่สามารถอัปเดตแต้มได้',
        ErrorCodes.DATABASE_ERROR,
        500
      );
    }
    
    // Save successful slip history
    await insertHistory({
      user_id: userId,
      transaction_id: transactionId || null,
      amount: amount,
      points_added: pointsToAdd,
      qr_payload: qrPayload,
      status: 'success',
      error_message: null,
      rdcw_response: apiResult, // เก็บ response จาก API ที่ใช้
    });

    console.log('✅ Slip verification successful');

    // 9. Return Success Response
    return NextResponse.json<VerifySlipResponse>({
      success: true,
      data: {
        message: `เติมเงินสำเร็จ! จำนวน ${amount.toFixed(2)} บาท ได้รับ ${pointsToAdd.toFixed(0)} แต้ม`,
        pointsAdded: pointsToAdd,
        currentPoints: Number(updatedUser.points),
        transactionAmount: amount,
        minimumAmount: minimumAmount,
      },
      debug: isDebugMode
        ? {
            ...debugContext,
            transactionId: transactionId || null,
            amount,
            pointsAdded: pointsToAdd,
          }
        : undefined,
    });

  } catch (error) {
    console.error('❌ Slip verification error:', error);

    // Handle SlipVerificationError
    if (error instanceof SlipVerificationError) {
      return NextResponse.json<VerifySlipResponse>(
        {
          success: false,
          error: error.message,
          debug: isDebugMode
            ? {
                ...debugContext,
                errorCode: error.code,
                details: error.debugData,
              }
            : undefined,
        },
        { status: error.statusCode }
      );
    }

    // Handle Zod Validation Error
    if (error instanceof z.ZodError) {
      const firstIssueMessage = error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง';

      return NextResponse.json<VerifySlipResponse>(
        {
          success: false,
          error: firstIssueMessage,
          debug: isDebugMode
            ? {
                ...debugContext,
                errorCode: 'VALIDATION_ERROR',
                details: error.issues,
              }
            : undefined,
        },
        { status: 400 }
      );
    }

    // Handle Unknown Error
    return NextResponse.json<VerifySlipResponse>(
      {
        success: false,
        error: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง',
        debug: isDebugMode
          ? {
              ...debugContext,
              errorCode: 'UNKNOWN_ERROR',
              details: error,
            }
          : undefined,
      },
      { status: 500 }
    );
  }
}

