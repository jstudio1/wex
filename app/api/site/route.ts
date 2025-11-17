import { NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { createServiceClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';

export async function GET() {
  const sb = createServiceClient();
  const { data } = await sb.from('settings').select('key, value').in('key', [
    'HOME_TITLE','HOME_SUBTITLE','HOME_POSTERS','FLASHSALE_START','FLASHSALE_END',
    'NAVBAR_MENU_PRODUCTS','NAVBAR_MENU_SOCIAL','NAVBAR_MENU_CATEGORIES','NAVBAR_MENU_GAMES','NAVBAR_MENU_PREMIUM_APP','NAVBAR_MENU_CASHCARD','NAVBAR_MENU_ORDER',
    'PAYMENT_METHOD_CODE','PAYMENT_METHOD_QR','PAYMENT_METHOD_SLIP','PAYMENT_METHOD_TRUEWALLET',
    'DISCORD_WEBHOOK_URL',
    'DISCORD_WEBHOOK_PRODUCTS','DISCORD_WEBHOOK_CASHCARD','DISCORD_WEBHOOK_PREMIUM_APP',
    'DISCORD_WEBHOOK_SOCIAL','DISCORD_WEBHOOK_GAME_ACCOUNTS','DISCORD_WEBHOOK_GAMES','DISCORD_WEBHOOK_WALLET',
    'BANK_TRANSFER_ACCOUNTS',
    'TRUEWALLET_PHONE',
    'CONTACT_LINE_ID','CONTACT_PHONE','CONTACT_FACEBOOK','CONTACT_EMAIL'
  ]);
  const map: Record<string, string> = {};
  for (const row of data || []) map[row.key as string] = row.value as string;
  
  // Default navbar menu visibility (all enabled by default)
  const getNavbarSetting = (key: string, defaultValue: string = 'true') => {
    const value = map[key];
    return value === 'false' ? false : (value === 'true' ? true : defaultValue === 'true');
  };

  // Get navbar menu order (default order)
  const defaultOrder = ['products', 'social', 'categories', 'games', 'premiumApp', 'cashcard'];
  let menuOrder: string[] = defaultOrder;
  try {
    const orderValue = map.NAVBAR_MENU_ORDER;
    if (orderValue) {
      menuOrder = JSON.parse(orderValue);
      // Validate order array
      if (!Array.isArray(menuOrder)) {
        menuOrder = defaultOrder;
      }
    }
  } catch {
    menuOrder = defaultOrder;
  }

  let bankAccounts: Array<{ bankName: string; accountName: string; accountNumber: string; branch?: string }> = [];
  const truewalletPhone = map.TRUEWALLET_PHONE || '';
  try {
    const bankValue = map.BANK_TRANSFER_ACCOUNTS;
    if (bankValue) {
      const parsed = JSON.parse(bankValue);
      if (Array.isArray(parsed)) {
        bankAccounts = parsed
          .map((item) => {
            const bankName = typeof item?.bankName === 'string' ? item.bankName.trim() : '';
            const accountName = typeof item?.accountName === 'string' ? item.accountName.trim() : '';
            const accountNumber = typeof item?.accountNumber === 'string' ? item.accountNumber.trim() : '';
            const branch = typeof item?.branch === 'string' ? item.branch.trim() : '';
            if (!bankName || !accountName || !accountNumber) return null;
            return branch ? { bankName, accountName, accountNumber, branch } : { bankName, accountName, accountNumber };
          })
          .filter(Boolean) as Array<{ bankName: string; accountName: string; accountNumber: string; branch?: string }>;
      }
    }
  } catch {
    bankAccounts = [];
  }

  return NextResponse.json(
    {
    title: map.HOME_TITLE || 'เติมเกม ง่าย รวดเร็ว',
    subtitle: map.HOME_SUBTITLE || 'เลือกเกมยอดนิยมและเริ่มสั่งซื้อได้ทันที',
    posters: (() => { try { return JSON.parse(map.HOME_POSTERS || '[]'); } catch { return []; } })(),
    flashStart: map.FLASHSALE_START || null,
    flashEnd: map.FLASHSALE_END || null,
    navbarMenus: {
      products: getNavbarSetting('NAVBAR_MENU_PRODUCTS', 'true'),
      social: getNavbarSetting('NAVBAR_MENU_SOCIAL', 'true'),
      categories: getNavbarSetting('NAVBAR_MENU_CATEGORIES', 'true'),
      games: getNavbarSetting('NAVBAR_MENU_GAMES', 'true'),
      premiumApp: getNavbarSetting('NAVBAR_MENU_PREMIUM_APP', 'true'),
      cashcard: getNavbarSetting('NAVBAR_MENU_CASHCARD', 'true'),
    },
    navbarMenuOrder: menuOrder,
    paymentMethods: {
      code: getNavbarSetting('PAYMENT_METHOD_CODE', 'true'),
      qr: getNavbarSetting('PAYMENT_METHOD_QR', 'true'),
      slip: getNavbarSetting('PAYMENT_METHOD_SLIP', 'true'),
      truewallet: getNavbarSetting('PAYMENT_METHOD_TRUEWALLET', 'true'),
    },
    bankAccounts,
    truewalletPhone,
    discordWebhookUrl: map.DISCORD_WEBHOOK_URL || '',
    discordWebhooks: {
      products: map.DISCORD_WEBHOOK_PRODUCTS || '',
      cashcard: map.DISCORD_WEBHOOK_CASHCARD || '',
      premiumApp: map.DISCORD_WEBHOOK_PREMIUM_APP || '',
      social: map.DISCORD_WEBHOOK_SOCIAL || '',
      gameAccounts: map.DISCORD_WEBHOOK_GAME_ACCOUNTS || '',
      games: map.DISCORD_WEBHOOK_GAMES || '',
      wallet: map.DISCORD_WEBHOOK_WALLET || ''
    },
    contact: {
      lineId: map.CONTACT_LINE_ID || '',
      phone: map.CONTACT_PHONE || '',
      facebook: map.CONTACT_FACEBOOK || '',
      email: map.CONTACT_EMAIL || ''
    }
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const title = String(body?.title || '');
  const subtitle = String(body?.subtitle || '');
  const posters = Array.isArray(body?.posters) ? body.posters : [];
  const flashStart = body?.flashStart ? String(body.flashStart) : '';
  const flashEnd = body?.flashEnd ? String(body.flashEnd) : '';
  const navbarMenus = body?.navbarMenus || {};
  const paymentMethods = body?.paymentMethods || {};
  const truewalletPhone = String(body?.truewalletPhone || '').trim();
  const discordWebhookUrl = String(body?.discordWebhookUrl || '').trim();
  const discordWebhooks = body?.discordWebhooks || {};
  const contact = body?.contact || {};
  const bankAccountsInput = Array.isArray(body?.bankAccounts) ? body.bankAccounts : [];
  const bankAccounts = bankAccountsInput
    .map((item: unknown) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const bankName = typeof record.bankName === 'string' ? record.bankName.trim() : '';
      const accountName = typeof record.accountName === 'string' ? record.accountName.trim() : '';
      const accountNumber = typeof record.accountNumber === 'string' ? record.accountNumber.trim() : '';
      const branch = typeof record.branch === 'string' ? record.branch.trim() : '';
      if (!bankName || !accountName || !accountNumber) return null;
      return branch ? { bankName, accountName, accountNumber, branch } : { bankName, accountName, accountNumber };
    })
    .filter(Boolean);
  
  const sb = createServiceClient();
  await sb.from('settings').upsert({ key: 'HOME_TITLE', value: title }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'HOME_SUBTITLE', value: subtitle }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'HOME_POSTERS', value: JSON.stringify(posters) }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'FLASHSALE_START', value: flashStart }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'FLASHSALE_END', value: flashEnd }, { onConflict: 'key' });
  
  // Save navbar menu visibility settings
  await sb.from('settings').upsert({ key: 'NAVBAR_MENU_PRODUCTS', value: navbarMenus.products === false ? 'false' : 'true' }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'NAVBAR_MENU_SOCIAL', value: navbarMenus.social === false ? 'false' : 'true' }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'NAVBAR_MENU_CATEGORIES', value: navbarMenus.categories === false ? 'false' : 'true' }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'NAVBAR_MENU_GAMES', value: navbarMenus.games === false ? 'false' : 'true' }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'NAVBAR_MENU_PREMIUM_APP', value: navbarMenus.premiumApp === false ? 'false' : 'true' }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'NAVBAR_MENU_CASHCARD', value: navbarMenus.cashcard === false ? 'false' : 'true' }, { onConflict: 'key' });
  
  // Save navbar menu order
  if (body?.navbarMenuOrder && Array.isArray(body.navbarMenuOrder)) {
    await sb.from('settings').upsert({ key: 'NAVBAR_MENU_ORDER', value: JSON.stringify(body.navbarMenuOrder) }, { onConflict: 'key' });
  }
  
  // Save payment method settings
  await sb.from('settings').upsert({ key: 'PAYMENT_METHOD_CODE', value: paymentMethods.code === false ? 'false' : 'true' }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'PAYMENT_METHOD_QR', value: paymentMethods.qr === false ? 'false' : 'true' }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'PAYMENT_METHOD_SLIP', value: paymentMethods.slip === false ? 'false' : 'true' }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'PAYMENT_METHOD_TRUEWALLET', value: paymentMethods.truewallet === false ? 'false' : 'true' }, { onConflict: 'key' });
  
  // Save Discord webhook URL (legacy)
  await sb.from('settings').upsert({ key: 'DISCORD_WEBHOOK_URL', value: discordWebhookUrl }, { onConflict: 'key' });
  
  // Save Discord webhook URLs for each service
  await sb.from('settings').upsert({ key: 'DISCORD_WEBHOOK_PRODUCTS', value: String(discordWebhooks.products || '').trim() }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'DISCORD_WEBHOOK_CASHCARD', value: String(discordWebhooks.cashcard || '').trim() }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'DISCORD_WEBHOOK_PREMIUM_APP', value: String(discordWebhooks.premiumApp || '').trim() }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'DISCORD_WEBHOOK_SOCIAL', value: String(discordWebhooks.social || '').trim() }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'DISCORD_WEBHOOK_GAME_ACCOUNTS', value: String(discordWebhooks.gameAccounts || '').trim() }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'DISCORD_WEBHOOK_GAMES', value: String(discordWebhooks.games || '').trim() }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'DISCORD_WEBHOOK_WALLET', value: String(discordWebhooks.wallet || '').trim() }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'BANK_TRANSFER_ACCOUNTS', value: JSON.stringify(bankAccounts) }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'TRUEWALLET_PHONE', value: truewalletPhone }, { onConflict: 'key' });
  
  // Save contact information
  await sb.from('settings').upsert({ key: 'CONTACT_LINE_ID', value: String(contact.lineId || '').trim() }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'CONTACT_PHONE', value: String(contact.phone || '').trim() }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'CONTACT_FACEBOOK', value: String(contact.facebook || '').trim() }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'CONTACT_EMAIL', value: String(contact.email || '').trim() }, { onConflict: 'key' });
  
  // Revalidate public cache for site settings and homepage
  try {
    revalidateTag('site');
    revalidatePath('/');
  } catch {}

  return NextResponse.json({ ok: true });
}


