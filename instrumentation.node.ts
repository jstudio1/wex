export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const logCrash = async (kind: string, err: unknown) => {
    try {
      const { createServiceClient } = await import('@/lib/supabase');
      const sb = createServiceClient();
      const message =
        err instanceof Error ? `${err.name}: ${err.message}\n${err.stack || ''}` : String(err);
      await sb.from('order_status_logs').insert({
        transaction_id: 'SYSTEM_CRASH_LOG',
        state: kind,
        message: message.slice(0, 4000),
      });
    } catch (logErr) {
      console.error('[instrumentation] failed to persist crash log:', logErr);
    }
    console.error(`[instrumentation] ${kind}:`, err);
  };

  process.on('uncaughtException', (err) => {
    void logCrash('uncaughtException', err);
  });

  process.on('unhandledRejection', (reason) => {
    void logCrash('unhandledRejection', reason);
  });
}
