import { createServiceClient } from './supabase';

// Cache สำหรับ API keys (cache 5 นาที)
let apiKeysCache: Record<string, { value: string; timestamp: number }> = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 นาที

/**
 * ดึง API key จาก database
 * @param keyName ชื่อ API key (เช่น 'API_KEY_24PAY', 'SOCIAL_API_KEY')
 * @returns API key value หรือ null ถ้าไม่พบ
 */
export async function getApiKey(keyName: string): Promise<string | null> {
  // ตรวจสอบ cache
  const cached = apiKeysCache[keyName];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.value;
  }

  try {
    const sb = createServiceClient();
    const { data, error } = await sb
      .from('api_keys')
      .select('key_value')
      .eq('key_name', keyName)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching API key ${keyName}:`, error);
      // ถ้า error ให้ใช้ env variable เป็น fallback
      return process.env[keyName] || null;
    }

    if (!data) {
      // ถ้าไม่พบใน database ให้ใช้ env variable เป็น fallback
      const envValue = process.env[keyName];
      if (envValue) {
        return envValue;
      }
      return null;
    }

    // เก็บใน cache
    apiKeysCache[keyName] = {
      value: data.key_value,
      timestamp: Date.now()
    };

    return data.key_value;
  } catch (error) {
    console.error(`Error fetching API key ${keyName}:`, error);
    // ถ้า error ให้ใช้ env variable เป็น fallback
    return process.env[keyName] || null;
  }
}

/**
 * Clear cache ของ API keys (ใช้เมื่อมีการอัพเดท API key ในหลังบ้าน)
 */
export function clearApiKeysCache() {
  apiKeysCache = {};
}

