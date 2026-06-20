import { createServiceClient } from './supabase';
import { sendTelegramNotification } from './telegram';

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  thumbnail?: {
    url: string;
  };
  image?: {
    url: string;
  };
  footer?: {
    text: string;
    icon_url?: string;
  };
  timestamp?: string;
}

export interface OrderData {
  type: 'product' | 'cashcard' | 'premium-app' | 'social' | 'game-account' | 'game-play';
  username: string;
  userId: number;
  productName: string;
  amount: number;
  transactionId?: string;
  reference?: string;
  status?: string;
  imageUrl?: string | null;
  additionalInfo?: Record<string, any>;
}

export interface TopupData {
  username: string;
  userId: number;
  amount: number;
  method?: 'code' | 'bank-transfer' | 'redeem' | 'slip' | 'truewallet';
  transactionId?: string;
  reference?: string;
}

type ServiceType = 'products' | 'cashcard' | 'premium-app' | 'social' | 'game-account' | 'game-play' | 'wallet';

/**
 * ดึง Discord Webhook URL จาก settings ตามบริการ
 */
async function getDiscordWebhookUrl(serviceType: ServiceType): Promise<string | null> {
  try {
    const sb = createServiceClient();
    
    // Map service type to settings key
    const keyMap: Record<ServiceType, string> = {
      'products': 'DISCORD_WEBHOOK_PRODUCTS',
      'cashcard': 'DISCORD_WEBHOOK_CASHCARD',
      'premium-app': 'DISCORD_WEBHOOK_PREMIUM_APP',
      'social': 'DISCORD_WEBHOOK_SOCIAL',
      'game-account': 'DISCORD_WEBHOOK_GAME_ACCOUNTS',
      'game-play': 'DISCORD_WEBHOOK_GAMES',
      'wallet': 'DISCORD_WEBHOOK_WALLET'
    };
    
    const key = keyMap[serviceType];
    if (!key) return null;
    
    const { data } = await sb
      .from('settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    
    if (!data || !data.value || data.value.trim() === '') {
      return null;
    }
    
    return data.value.trim();
  } catch (error) {
    console.error('Error fetching Discord webhook URL:', error);
    return null;
  }
}

/**
 * ส่ง Discord webhook message
 */
async function sendDiscordWebhook(embeds: DiscordEmbed[], serviceType: ServiceType): Promise<boolean> {
  try {
    const webhookUrl = await getDiscordWebhookUrl(serviceType);
    if (!webhookUrl) {
      return false; // ไม่ error ถ้าไม่ได้ตั้งค่า webhook URL
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds,
      }),
    });

    if (!response.ok) {
      console.error('Discord webhook error:', response.status, await response.text().catch(() => ''));
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending Discord webhook:', error);
    return false; // ไม่ throw error เพื่อไม่ให้ส่งผลกระทบต่อการทำงานหลัก
  }
}

/**
 * สีสำหรับสถานะต่างๆ
 */
function getStatusColor(status?: string): number {
  if (!status) return 0x5865F2; // สีม่วง default
  
  const statusLower = status.toLowerCase();
  if (statusLower === 'completed' || statusLower === 'redeemed' || statusLower === 'success') {
    return 0x57F287; // สีเขียว - สำเร็จ
  }
  if (statusLower === 'pending' || statusLower === 'processing' || statusLower === 'confirming') {
    return 0xFEE75C; // สีเหลือง - รอดำเนินการ
  }
  if (statusLower === 'failed' || statusLower === 'error' || statusLower === 'refunded') {
    return 0xED4245; // สีแดง - ล้มเหลว/คืนเงิน
  }
  return 0x5865F2; // สีม่วง - default
}

/**
 * Format สถานะให้อ่านง่าย
 */
function formatStatus(status?: string): string {
  if (!status) return '-';
  
  const statusMap: Record<string, string> = {
    'completed': '✅ สำเร็จ',
    'redeemed': '✅ รับแล้ว',
    'success': '✅ สำเร็จ',
    'pending': '⏳ รอดำเนินการ',
    'processing': '🔄 กำลังดำเนินการ',
    'confirming': '⏳ กำลังยืนยัน',
    'failed': '❌ ล้มเหลว',
    'error': '❌ เกิดข้อผิดพลาด',
    'refunded': '↩️ คืนเงินแล้ว',
  };
  
  return statusMap[status.toLowerCase()] || status;
}

/**
 * สร้าง Discord embed สำหรับการซื้อสินค้า
 */
export function createOrderEmbed(data: OrderData): DiscordEmbed {
  const baseColors: Record<string, number> = {
    product: 0x5865F2, // สีม่วง
    cashcard: 0x5865F2, // สีม่วง
    'premium-app': 0xEB459E, // สีชมพู
    social: 0x57F287, // สีเขียว
    'game-account': 0xFEE75C, // สีเหลือง
    'game-play': 0xED4245, // สีแดง
  };

  const titles: Record<string, string> = {
    product: '🛒 ซื้อสินค้าเกม',
    cashcard: '💳 ซื้อบัตรเติมเงิน',
    'premium-app': '📱 ซื้อแอพพรีเมียม',
    social: '📱 ซื้อบริการโซเชียล',
    'game-account': '🎮 ซื้อไอดีเกม',
    'game-play': '🎰 เล่นเกมสุ่มรางวัล',
  };

  // ใช้สีตามสถานะ ถ้ามีสถานะ, ไม่ก็ใช้สีตามประเภท
  const embedColor = data.status ? getStatusColor(data.status) : (baseColors[data.type] || 0x5865F2);

  const embed: DiscordEmbed = {
    title: titles[data.type] || '💰 ธุรกรรม',
    color: embedColor,
    description: `**${data.productName || '-'}**`,
    fields: [],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'WeXPlus System',
    },
  };

  // ข้อมูลหลัก - แสดงในแถวแรก
  embed.fields?.push(
    {
      name: '👤 ผู้ใช้',
      value: `**${data.username}**`,
      inline: true,
    },
    {
      name: '💎 จำนวนพอยต์',
      value: `**${data.amount.toFixed(2)}** พอยต์`,
      inline: true,
    }
  );

  // สถานะ - แสดงเด่นๆ
  if (data.status) {
    embed.fields?.push({
      name: '📊 สถานะ',
      value: formatStatus(data.status),
      inline: true,
    });
  }

  // Transaction ID หรือ Reference
  if (data.transactionId) {
    embed.fields?.push({
      name: '🆔 Transaction ID',
      value: `\`${data.transactionId}\``,
      inline: false,
    });
  } else if (data.reference) {
    embed.fields?.push({
      name: '🔖 Reference',
      value: `\`${data.reference}\``,
      inline: false,
    });
  }

  // ข้อมูลเพิ่มเติม
  if (data.additionalInfo && Object.keys(data.additionalInfo).length > 0) {
    embed.fields?.push({
      name: '━━━━━━━━━━━━━━━━',
      value: '\u200b', // Zero-width space for visual separator
      inline: false,
    });
    
    for (const [key, value] of Object.entries(data.additionalInfo)) {
      if (value !== null && value !== undefined && value !== '') {
        embed.fields?.push({
          name: key,
          value: String(value),
          inline: key.includes('จำนวน') || key.includes('รอบ') || key.includes('ระยะ') ? true : false,
        });
      }
    }
  }

  // เพิ่มรูปภาพ
  if (data.imageUrl && data.imageUrl.trim() !== '') {
    embed.thumbnail = {
      url: data.imageUrl,
    };
  }

  return embed;
}

/**
 * สร้าง Discord embed สำหรับการเติมพอยต์
 */
export function createTopupEmbed(data: TopupData): DiscordEmbed {
  const methodNames: Record<string, string> = {
    code: '💳 เติมพอยต์ด้วยรหัส',
    'bank-transfer': '🏦 โอนเงินผ่านธนาคาร',
    redeem: '🎫 ใช้โค้ดเติมพอยต์',
  };

  const embed: DiscordEmbed = {
    title: methodNames[data.method || 'code'] || '💰 เติมพอยต์',
    color: 0x57F287, // สีเขียว - สำเร็จ
    description: `ผู้ใช้ **${data.username}** ได้รับพอยต์`,
    fields: [
      {
        name: '💎 จำนวนพอยต์',
        value: `**${data.amount.toFixed(2)}** พอยต์`,
        inline: true,
      },
      {
        name: '✅ สถานะ',
        value: '✅ สำเร็จ',
        inline: true,
      },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'WeXPlus System',
    },
  };

  if (data.transactionId) {
    embed.fields?.push({
      name: '🆔 Transaction ID',
      value: `\`${data.transactionId}\``,
      inline: false,
    });
  }

  if (data.reference) {
    embed.fields?.push({
      name: '🔖 Reference',
      value: `\`${data.reference}\``,
      inline: false,
    });
  }

  return embed;
}

/**
 * สร้าง Discord embed สำหรับการเล่นเกม
 */
export function createGamePlayEmbed(data: OrderData & { gameName?: string; prizeName?: string; prizeValue?: string; prizeImageUrl?: string | null }): DiscordEmbed {
  const statusColor = data.status ? getStatusColor(data.status) : 0xFEE75C; // สีเหลือง default
  
  const embed: DiscordEmbed = {
    title: '🎰 เล่นเกมสุ่มรางวัล',
    color: statusColor,
    description: `**${data.gameName || '-'}**`,
    fields: [
      {
        name: '👤 ผู้ใช้',
        value: `**${data.username}**`,
        inline: true,
      },
      {
        name: '💎 ค่าใช้จ่าย',
        value: `**${data.amount.toFixed(2)}** พอยต์`,
        inline: true,
      },
      {
        name: '🎁 รางวัลที่ได้รับ',
        value: `**${data.prizeName || '-'}**`,
        inline: true,
      },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'WeXPlus System',
    },
  };

  // สถานะ
  if (data.status) {
    embed.fields?.push({
      name: '📊 สถานะ',
      value: formatStatus(data.status),
      inline: true,
    });
  }

  if (data.prizeValue) {
    embed.fields?.push({
      name: '💰 ค่ารางวัล',
      value: `**${data.prizeValue}**`,
      inline: true,
    });
  }

  if (data.transactionId) {
    embed.fields?.push({
      name: '🆔 Transaction ID',
      value: `\`${data.transactionId}\``,
      inline: false,
    });
  }

  // ข้อมูลเพิ่มเติม
  if (data.additionalInfo && Object.keys(data.additionalInfo).length > 0) {
    embed.fields?.push({
      name: '━━━━━━━━━━━━━━━━',
      value: '\u200b',
      inline: false,
    });
    
    for (const [key, value] of Object.entries(data.additionalInfo)) {
      if (value !== null && value !== undefined && value !== '') {
        embed.fields?.push({
          name: key,
          value: String(value),
          inline: key.includes('ประเภท') ? false : true,
        });
      }
    }
  }

  // ใช้รูปภาพรางวัล ถ้ามี
  if (data.prizeImageUrl && data.prizeImageUrl.trim() !== '') {
    embed.thumbnail = {
      url: data.prizeImageUrl,
    };
  } else if (data.imageUrl && data.imageUrl.trim() !== '') {
    embed.thumbnail = {
      url: data.imageUrl,
    };
  }

  return embed;
}

/**
 * Map OrderData.type to ServiceType
 */
function mapOrderTypeToServiceType(orderType: OrderData['type']): ServiceType {
  const typeMap: Record<OrderData['type'], ServiceType> = {
    'product': 'products',
    'cashcard': 'cashcard',
    'premium-app': 'premium-app',
    'social': 'social',
    'game-account': 'game-account',
    'game-play': 'game-play',
  };
  return typeMap[orderType] || 'products';
}

/**
 * Log การซื้อสินค้าไปยัง Discord
 */
export async function logOrderToDiscord(data: OrderData): Promise<void> {
  try {
    const embed = createOrderEmbed(data);
    const serviceType = mapOrderTypeToServiceType(data.type);
    await sendDiscordWebhook([embed], serviceType);
    
    // Send Telegram Notification
    let detailStr = '';
    if (data.additionalInfo) {
      for (const [key, value] of Object.entries(data.additionalInfo)) {
        if (value) detailStr += `\n<b>${key}:</b> ${value}`;
      }
    }
    const message = `🛍 <b>สั่งซื้อบริการ:</b> ${data.productName}\n<b>ผู้ใช้:</b> ${data.username}\n<b>พอยต์:</b> ${data.amount.toFixed(2)}${data.status ? `\n<b>สถานะ:</b> ${data.status}` : ''}${detailStr}`;
    await sendTelegramNotification(message, 'order');
  } catch (error) {
    console.error('Error logging order:', error);
    // ไม่ throw error
  }
}

/**
 * Log การเติมพอยต์ไปยัง Discord
 */
export async function logTopupToDiscord(data: TopupData): Promise<void> {
  try {
    const embed = createTopupEmbed(data);
    await sendDiscordWebhook([embed], 'wallet');
    
    // Send Telegram Notification
    const message = `💰 <b>เติมเงิน (${data.method || 'code'})</b>\n<b>ผู้ใช้:</b> ${data.username}\n<b>จำนวน:</b> ${data.amount.toFixed(2)} พอยต์\n<b>สถานะ:</b> สำเร็จ`;
    await sendTelegramNotification(message, 'topup');
  } catch (error) {
    console.error('Error logging topup:', error);
    // ไม่ throw error
  }
}

/**
 * Log การเล่นเกมไปยัง Discord
 */
export async function logGamePlayToDiscord(data: OrderData & { gameName?: string; prizeName?: string; prizeValue?: string; prizeImageUrl?: string | null }): Promise<void> {
  try {
    const embed = createGamePlayEmbed(data);
    await sendDiscordWebhook([embed], 'game-play');
    
    // Send Telegram Notification
    let detailStr = '';
    if (data.additionalInfo) {
      for (const [key, value] of Object.entries(data.additionalInfo)) {
        if (value) detailStr += `\n<b>${key}:</b> ${value}`;
      }
    }
    const message = `🎰 <b>เล่นเกมสุ่มรางวัล:</b> ${data.gameName || '-'}\n<b>ผู้ใช้:</b> ${data.username}\n<b>ค่าใช้จ่าย:</b> ${data.amount.toFixed(2)} พอยต์\n<b>รางวัล:</b> ${data.prizeName || '-'}${data.status ? `\n<b>สถานะ:</b> ${data.status}` : ''}${detailStr}`;
    await sendTelegramNotification(message, 'order');
  } catch (error) {
    console.error('Error logging game play:', error);
    // ไม่ throw error
  }
}

