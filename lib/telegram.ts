import { createServiceClient } from './supabase';

export async function sendTelegramNotification(
  message: string,
  type: 'registration' | 'order' | 'topup' | 'ticket'
) {
  try {
    const sb = createServiceClient();
    const { data } = await sb
      .from('settings')
      .select('key, value')
      .in('key', [
        'TELEGRAM_BOT_TOKEN',
        'TELEGRAM_BOT_TOKEN_REGISTRATION',
        'TELEGRAM_BOT_TOKEN_ORDER',
        'TELEGRAM_BOT_TOKEN_TOPUP',
        'TELEGRAM_BOT_TOKEN_TICKET',
        'TELEGRAM_CHAT_ID_REGISTRATION',
        'TELEGRAM_CHAT_ID_ORDER',
        'TELEGRAM_CHAT_ID_TOPUP',
        'TELEGRAM_CHAT_ID_TICKET',
      ]);

    const settings = data?.reduce((acc, row) => {
      acc[row.key as string] = row.value as string;
      return acc;
    }, {} as Record<string, string>) || {};

    const globalBotToken = settings.TELEGRAM_BOT_TOKEN;

    let botToken = '';
    let chatId = '';

    switch (type) {
      case 'registration':
        botToken = settings.TELEGRAM_BOT_TOKEN_REGISTRATION || globalBotToken;
        chatId = settings.TELEGRAM_CHAT_ID_REGISTRATION;
        break;
      case 'order':
        botToken = settings.TELEGRAM_BOT_TOKEN_ORDER || globalBotToken;
        chatId = settings.TELEGRAM_CHAT_ID_ORDER;
        break;
      case 'topup':
        botToken = settings.TELEGRAM_BOT_TOKEN_TOPUP || globalBotToken;
        chatId = settings.TELEGRAM_CHAT_ID_TOPUP;
        break;
      case 'ticket':
        botToken = settings.TELEGRAM_BOT_TOKEN_TICKET || globalBotToken;
        chatId = settings.TELEGRAM_CHAT_ID_TICKET;
        break;
    }

    if (!botToken || !chatId) return;

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!res.ok) {
      console.error('Failed to send Telegram notification:', await res.text());
    }
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
  }
}
