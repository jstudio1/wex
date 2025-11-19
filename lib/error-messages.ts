// Error messages ที่เป็นมิตรกับผู้ใช้
export const ERROR_MESSAGES: Record<string, string> = {
  invalid_payload: 'กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง',
  invalid_credentials: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง',
  invalid_password: 'รหัสผ่านไม่ถูกต้อง',
  invalid_amount: 'จำนวนเงินไม่ถูกต้อง',
  invalid_file_type: 'ประเภทไฟล์ไม่ถูกต้อง',
  invalid_id: 'ข้อมูลไม่ถูกต้อง',
  invalid_order_ids: 'ข้อมูลคำสั่งซื้อไม่ถูกต้อง',
  invalid_transaction_ids: 'ข้อมูลธุรกรรมไม่ถูกต้อง',
  invalid_date_range: 'ช่วงวันที่ไม่ถูกต้อง',
  invalid_rate: 'อัตราไม่ถูกต้อง',
  invalid_probability: 'ค่าความน่าจะเป็นไม่ถูกต้อง',
  invalid_prize_type: 'ประเภทรางวัลไม่ถูกต้อง',
  invalid_order_status: 'สถานะคำสั่งซื้อไม่ถูกต้อง',
  invalid_product_id: 'รหัสสินค้าไม่ถูกต้อง',
  invalid_price_id: 'รหัสราคาไม่ถูกต้อง',
  invalid_item_id: 'รหัสรายการไม่ถูกต้อง',
  invalid_url: 'URL ไม่ถูกต้อง',
  invalid_qr: 'QR Code ไม่ถูกต้อง',
  invalid_account: 'บัญชีไม่ถูกต้อง',
  file_too_large: 'ไฟล์ใหญ่เกินไป',
  upload_failed: 'ไม่สามารถอัปโหลดไฟล์ได้',
  update_failed: 'ไม่สามารถอัปเดตข้อมูลได้',
  db_error: 'เกิดข้อผิดพลาดจากฐานข้อมูล',
  unauthorized: 'กรุณาเข้าสู่ระบบ',
  unexpected: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
  username_taken: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว',
  email_taken: 'อีเมลนี้ถูกใช้งานแล้ว',
  registration_disabled: 'การสมัครสมาชิกถูกปิดใช้งาน',
  recaptcha_failed: 'reCaptcha ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง',
  account_disabled: 'บัญชีของคุณถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ',
};

export function getErrorMessage(error: string, defaultMessage?: string): string {
  return ERROR_MESSAGES[error] || defaultMessage || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
}

