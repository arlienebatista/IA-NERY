// ARQUIVO: supabase/functions/chat-nery/log.ts

export async function logSystemMetrics(
  supabaseClient: any, 
  metrics: { query: string; latency_ms: number; cache_hit: boolean; token_usage: number }
) {
  try {
    // 1. Salva no banco de dados (tabela chat_metrics) para exportação posterior
    await supabaseClient.from('chat_metrics').insert({
      query: metrics.query,
      latency_ms: metrics.latency_ms,
      cache_hit: metrics.cache_hit,
      token_usage: metrics.token_usage
    });

    // 2. Imprime no log nativo da Edge Function para debug em tempo real
    console.log('[METRICS SAVED]', JSON.stringify(metrics));
  } catch (error) {
    console.error('[METRICS ERROR] Falha ao salvar log do sistema:', error);
  }
}
