import { NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { createServiceClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';
import { normalizePremiumAppDisplayMode } from '@/lib/premium-app';

export async function GET() {
  const sb = createServiceClient();
  const { data } = await sb.from('settings').select('key, value').in('key', [
    'HOME_TITLE','HOME_SUBTITLE','HOME_POSTERS',
    'GAME_ACCOUNTS_BANNER_URL',
    'NAVBAR_MENU_PRODUCTS','NAVBAR_MENU_MTOPUP','NAVBAR_MENU_CASHCARD','NAVBAR_MENU_SOCIAL','NAVBAR_MENU_CATEGORIES','NAVBAR_MENU_GAMES','NAVBAR_MENU_PREMIUM_APP','NAVBAR_MENU_CONTACT','NAVBAR_MENU_ORDER',
    'NAVBAR_MENU_LABEL_PRODUCTS','NAVBAR_MENU_LABEL_PREMIUM_APP','NAVBAR_MENU_LABEL_SOCIAL','NAVBAR_MENU_LABEL_CONTACT',
    'PAYMENT_METHOD_CODE','PAYMENT_METHOD_QR','PAYMENT_METHOD_SLIP','PAYMENT_METHOD_TRUEWALLET',
    'DISCORD_WEBHOOK_URL',
    'DISCORD_WEBHOOK_PRODUCTS','DISCORD_WEBHOOK_CASHCARD','DISCORD_WEBHOOK_PREMIUM_APP',
    'DISCORD_WEBHOOK_SOCIAL','DISCORD_WEBHOOK_GAME_ACCOUNTS','DISCORD_WEBHOOK_GAMES','DISCORD_WEBHOOK_WALLET',
    'BANK_TRANSFER_ACCOUNTS',
    'TRUEWALLET_PHONE',
    'CONTACT_LINE_ID','CONTACT_PHONE','CONTACT_FACEBOOK','CONTACT_EMAIL',
    'SITE_BRAND_NAME','SITE_TITLE','SITE_META_DESCRIPTION',
    'MAINTENANCE_MODE','REGISTER_ENABLED',
    'RECAPTCHA_SITE_KEY','RECAPTCHA_SECRET_KEY','RECAPTCHA_ENABLED',
    'TERMS_POLICY',
    'FOOTER_LOGO_URL','FOOTER_DESCRIPTION','FOOTER_OPENING_HOURS','FOOTER_FACEBOOK_URL','FOOTER_LINE_URL','FOOTER_INSTAGRAM_URL','FOOTER_PHONE','FOOTER_EMAIL','FOOTER_WORKING_HOURS','FOOTER_COPYRIGHT',
    'PREMIUM_APP_DISPLAY_MODE'
  ]);
  const map: Record<string, string> = {};
  for (const row of data || []) map[row.key as string] = row.value as string;
  
  // Default navbar menu visibility (all enabled by default)
  const getNavbarSetting = (key: string, defaultValue: string = 'true') => {
    const value = map[key];
    return value === 'false' ? false : (value === 'true' ? true : defaultValue === 'true');
  };

  // Get navbar menu order (default order)
  const defaultOrder = ['products', 'mtopup', 'cashcard', 'social', 'categories', 'games', 'premiumApp'];
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
    gameAccountsBannerUrl: map.GAME_ACCOUNTS_BANNER_URL || '',
    navbarMenus: {
      products: getNavbarSetting('NAVBAR_MENU_PRODUCTS', 'true'),
      mtopup: getNavbarSetting('NAVBAR_MENU_MTOPUP', 'true'),
      cashcard: getNavbarSetting('NAVBAR_MENU_CASHCARD', 'true'),
      social: getNavbarSetting('NAVBAR_MENU_SOCIAL', 'true'),
      categories: getNavbarSetting('NAVBAR_MENU_CATEGORIES', 'true'),
      games: getNavbarSetting('NAVBAR_MENU_GAMES', 'true'),
      premiumApp: getNavbarSetting('NAVBAR_MENU_PREMIUM_APP', 'true'),
      contact: getNavbarSetting('NAVBAR_MENU_CONTACT', 'true'),
    },
    navbarMenuOrder: menuOrder,
    navbarMenuLabels: {
      products: map.NAVBAR_MENU_LABEL_PRODUCTS || 'เติมเกม',
      premiumApp: map.NAVBAR_MENU_LABEL_PREMIUM_APP || 'แอพ',
      social: map.NAVBAR_MENU_LABEL_SOCIAL || 'ปั้ม',
      contact: map.NAVBAR_MENU_LABEL_CONTACT || 'ติดต่อเรา',
    },
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
    },
    siteBrandName: map.SITE_BRAND_NAME || '',
    siteTitle: map.SITE_TITLE || '',
    siteMetaDescription: map.SITE_META_DESCRIPTION || '',
    maintenanceMode: map.MAINTENANCE_MODE === 'true',
    registerEnabled: map.REGISTER_ENABLED !== 'false', // default true
    recaptchaSiteKey: map.RECAPTCHA_SITE_KEY || '',
    recaptchaSecretKey: map.RECAPTCHA_SECRET_KEY || '',
    recaptchaEnabled: map.RECAPTCHA_ENABLED === 'true',
    termsPolicy: map.TERMS_POLICY || '',
    footer: {
      logoUrl: map.FOOTER_LOGO_URL || '',
      description: map.FOOTER_DESCRIPTION || '',
      openingHours: map.FOOTER_OPENING_HOURS || '',
      facebookUrl: map.FOOTER_FACEBOOK_URL || '',
      lineUrl: map.FOOTER_LINE_URL || '',
      instagramUrl: map.FOOTER_INSTAGRAM_URL || '',
      phone: map.FOOTER_PHONE || '',
      email: map.FOOTER_EMAIL || '',
      workingHours: map.FOOTER_WORKING_HOURS || '',
      copyright: map.FOOTER_COPYRIGHT || ''
    },
    premiumAppDisplayMode: normalizePremiumAppDisplayMode(map.PREMIUM_APP_DISPLAY_MODE)
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
  const gameAccountsBannerUrl = String(body?.gameAccountsBannerUrl || '').trim();
  const navbarMenus = body?.navbarMenus || {};
  const paymentMethods = body?.paymentMethods || {};
  const truewalletPhone = String(body?.truewalletPhone || '').trim();
  const discordWebhookUrl = String(body?.discordWebhookUrl || '').trim();
  const discordWebhooks = body?.discordWebhooks || {};
  const contact = body?.contact || {};
  const siteBrandName = String(body?.siteBrandName || '').trim();
  const siteTitle = String(body?.siteTitle || '').trim();
  const siteMetaDescription = String(body?.siteMetaDescription || '').trim();
  const maintenanceMode = body?.maintenanceMode === true;
  const registerEnabled = body?.registerEnabled !== false; // default true
  const recaptchaSiteKey = String(body?.recaptchaSiteKey || '').trim();
  const recaptchaSecretKey = String(body?.recaptchaSecretKey || '').trim();
  const recaptchaEnabled = body?.recaptchaEnabled === true;
  const termsPolicy = String(body?.termsPolicy || '').trim();
  const footer = body?.footer || {};
  const premiumAppDisplayMode = normalizePremiumAppDisplayMode(body?.premiumAppDisplayMode);
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
  await sb.from('settings').upsert({ key: 'GAME_ACCOUNTS_BANNER_URL', value: gameAccountsBannerUrl }, { onConflict: 'key' });
  
  // Save navbar menu visibility settings
  await sb.from('settings').upsert({ key: 'NAVBAR_MENU_PRODUCTS', value: navbarMenus.products === false ? 'false' : 'true' }, { onConflict: 'key' });
  if (navbarMenus.mtopup !== undefined) {
    await sb.from('settings').upsert({ key: 'NAVBAR_MENU_MTOPUP', value: navbarMenus.mtopup === false ? 'false' : 'true' }, { onConflict: 'key' });
  }
  await sb.from('settings').upsert({ key: 'NAVBAR_MENU_CASHCARD', value: navbarMenus.cashcard === false ? 'false' : 'true' }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'NAVBAR_MENU_SOCIAL', value: navbarMenus.social === false ? 'false' : 'true' }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'NAVBAR_MENU_CATEGORIES', value: navbarMenus.categories === false ? 'false' : 'true' }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'NAVBAR_MENU_GAMES', value: navbarMenus.games === false ? 'false' : 'true' }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'NAVBAR_MENU_PREMIUM_APP', value: navbarMenus.premiumApp === false ? 'false' : 'true' }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'NAVBAR_MENU_CONTACT', value: navbarMenus.contact === false ? 'false' : 'true' }, { onConflict: 'key' });
  
  // Save navbar menu order
  if (body?.navbarMenuOrder && Array.isArray(body.navbarMenuOrder)) {
    await sb.from('settings').upsert({ key: 'NAVBAR_MENU_ORDER', value: JSON.stringify(body.navbarMenuOrder) }, { onConflict: 'key' });
  }
  
  // Save navbar menu labels
  const navbarMenuLabels = body?.navbarMenuLabels || {};
  if (navbarMenuLabels.products) {
    await sb.from('settings').upsert({ key: 'NAVBAR_MENU_LABEL_PRODUCTS', value: navbarMenuLabels.products }, { onConflict: 'key' });
  }
  if (navbarMenuLabels.premiumApp) {
    await sb.from('settings').upsert({ key: 'NAVBAR_MENU_LABEL_PREMIUM_APP', value: navbarMenuLabels.premiumApp }, { onConflict: 'key' });
  }
  if (navbarMenuLabels.social) {
    await sb.from('settings').upsert({ key: 'NAVBAR_MENU_LABEL_SOCIAL', value: navbarMenuLabels.social }, { onConflict: 'key' });
  }
  if (navbarMenuLabels.contact) {
    await sb.from('settings').upsert({ key: 'NAVBAR_MENU_LABEL_CONTACT', value: navbarMenuLabels.contact }, { onConflict: 'key' });
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
  
  // Save site branding and metadata
  await sb.from('settings').upsert({ key: 'SITE_BRAND_NAME', value: siteBrandName }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'SITE_TITLE', value: siteTitle }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'SITE_META_DESCRIPTION', value: siteMetaDescription }, { onConflict: 'key' });
  
  // Save maintenance mode and register settings
  await sb.from('settings').upsert({ key: 'MAINTENANCE_MODE', value: maintenanceMode ? 'true' : 'false' }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'REGISTER_ENABLED', value: registerEnabled ? 'true' : 'false' }, { onConflict: 'key' });
  
  // Save reCaptcha settings
  await sb.from('settings').upsert({ key: 'RECAPTCHA_SITE_KEY', value: recaptchaSiteKey }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'RECAPTCHA_SECRET_KEY', value: recaptchaSecretKey }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'RECAPTCHA_ENABLED', value: recaptchaEnabled ? 'true' : 'false' }, { onConflict: 'key' });
  
  // Save policy settings
  await sb.from('settings').upsert({ key: 'TERMS_POLICY', value: termsPolicy }, { onConflict: 'key' });
  
  // Save footer settings
  await sb.from('settings').upsert({ key: 'FOOTER_LOGO_URL', value: String(footer.logoUrl || '').trim() }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'FOOTER_DESCRIPTION', value: String(footer.description || '').trim() }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'FOOTER_OPENING_HOURS', value: String(footer.openingHours || '').trim() }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'FOOTER_FACEBOOK_URL', value: String(footer.facebookUrl || '').trim() }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'FOOTER_LINE_URL', value: String(footer.lineUrl || '').trim() }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'FOOTER_INSTAGRAM_URL', value: String(footer.instagramUrl || '').trim() }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'FOOTER_PHONE', value: String(footer.phone || '').trim() }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'FOOTER_EMAIL', value: String(footer.email || '').trim() }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'FOOTER_WORKING_HOURS', value: String(footer.workingHours || '').trim() }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'FOOTER_COPYRIGHT', value: String(footer.copyright || '').trim() }, { onConflict: 'key' });
  await sb.from('settings').upsert({ key: 'PREMIUM_APP_DISPLAY_MODE', value: premiumAppDisplayMode }, { onConflict: 'key' });
  
  // Revalidate public cache for site settings and homepage
  try {
    revalidateTag('site');
    revalidatePath('/');
  } catch {}

  return NextResponse.json({ ok: true });
}


