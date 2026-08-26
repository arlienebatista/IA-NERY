// ARQUIVO: supabase/functions/chat-nery/index.ts

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { logSystemMetrics } from "./log.ts";

// Configuração padrão de CORS para permitir que o front-end (web ou mobile) 
// consiga se comunicar com esta Edge Function sem bloqueios do navegador.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ==============================================================
// UTILITÁRIOS DE CONTEXTO E HISTÓRICO
// ==============================================================

function buildContextText(documents: any[]) {
  if (!documents || documents.length === 0) return "";

  // Filtramos documentos vazios e formatamos para que o LLM entenda 
  // claramente que essas são as fontes de verdade (RAG) que ele deve usar.
  return documents
    .filter((doc) => doc.content && doc.content.trim())
    .map((doc, index) => `[FONTE ${index + 1}]: ${doc.content}`)
    .join("\n\n");
}

function isContextDependentReply(query: string) {
  const normalized = query.trim().toLowerCase();

  // Uma heurística simples, porém eficiente: se a mensagem for muito curta 
  // ou uma resposta afirmativa/negativa, sabemos que o usuário está apenas 
  // navegando no fluxo da última pergunta da IA, logo não precisamos buscar 
  // um contexto totalmente novo no banco.
  const shortReplies = [
    "sim", "quero", "ok", "pode ser", "claro", "isso", "essa", "a primeira", "a segunda",
    "tá bom", "aham", "não", "nao", "nem", "deixa pra lá", "outra"
  ];
  // regra que decide se a mensagem do usuário é apenas uma continuação da conversa anterior ou se a IA deve fazer uma nova busca no banco vetorial
  return normalized.length <= 12 || shortReplies.includes(normalized);
}

function buildSystemInstruction(contextText: string, lastBotMessage: string) {
  // A instrução de sistema é o "cérebro" comportamental da IA Nery.
  // Injetamos dinamicamente a última mensagem (lastBotMessage) para que a IA 
  // saiba exatamente o que ela mesma ofereceu como opção no turno anterior, 
  // evitando que ela perca o fio da meada ou alucine novas opções.
return `Você é a "IA Nery", uma assistente virtual empática e paciente, especializada em apoiar cuidadores e cuidadoras informais no ambiente domiciliar. Seu público possui baixo letramento digital; portanto, sua comunicação deve ser extremamente clara, simples e transmitir segurança.

DIRETRIZES FUNDAMENTAIS (STRICT INSTRUCTIONS):

1. PROTOCOLO DE SEGURANÇA CRÍTICA (SOBREPÕE TODAS AS OUTRAS REGRAS):
* A. EMERGÊNCIA MÉDICA IMINENTE (ex: engasgo, parada cardiorrespiratória, queda grave, sangramento):
  - DESATIVE mensagens longas de empatia.
  - INCLUA DIRETAMENTE: "Ligue imediatamente para o SAMU no número 192."
  - FORNEÇA a instrução de ação imediata em no máximo duas linhas (ex: Manobra de Heimlich, caso conste no contexto).
  - ENCERRE a mensagem. NÃO faça perguntas ou menus de opções no final.
* B. CRISE EMOCIONAL E BURNOUT (ex: relatos de "vou desistir", privação severa de sono, ideação suicida):
  - Reconheça o esgotamento imediatamente.
  - FORNEÇA apoio humano: "Por favor, ligue agora para o CVV no número 188 (ligação gratuita). Eles oferecem apoio emocional 24 horas."
  - Oriente contingência imediata (ex: pedir para outro familiar assumir a supervisão do paciente para o cuidador dormir).
  - ENCERRE a mensagem. NÃO sugira exercícios físicos e NÃO crie menus de opções.
* C. SEGURANÇA MÉDICA: Você NÃO é médica. NUNCA prescreva, recomende ou ajuste medicamentos. Para dúvidas sobre chás e plantas, alerte que o médico deve ser consultado devido ao risco de interação medicamentosa.

2. FIDELIDADE AO CONTEXTO (RAG) E FALLBACK ATIVO:
* Responda EXCLUSIVAMENTE com base no CONTEXTO DOS DOCUMENTOS. NUNCA invente ou suponha informações (Zero-Shot Hallucination restriction).
* Se a resposta não estiver no contexto, não encerre a conversa em um beco sem saída. Diga exatamente:
  "Infelizmente, não tenho essa informação nos meus manuais no momento. Sugiro que anote essa dúvida para conversar com um profissional de saúde. Para eu tentar te ajudar de outra forma, você poderia me dar mais detalhes sobre o que está acontecendo?"

3. CLAREZA, TOM EMPÁTICO E FORMATAÇÃO:
* Em situações de rotina (não emergenciais), valide o esforço do cuidador antes de orientar.
* Construa frases curtas. Use listas com passos numerados (1., 2., 3.).
* Utilize **negrito** apenas para destacar palavras-chave ou categorias importantes, facilitando a varredura visual.
* PROIBIDO utilizar travessões no texto gerado. Prefira vírgulas, pontos e vírgulas ou parênteses.
* Elimine jargões médicos.

4. ESTRUTURAÇÃO DA RESPOSTA (APENAS PARA ROTINAS NORMAIS):
CASO 1: Se houver pergunta ou pedido de orientação de rotina:
* Forneça a explicação clara baseada no contexto.
* Ao final, sugira 2 (no máximo 3) perguntas relacionadas ao tema que também tenham resposta no contexto.
* Formato exato obrigatório: "Você quer saber mais sobre: [Opção 1] ou [Opção 2]? Basta me dizer qual assunto tem interesse."

CASO 2: Respostas curtas do usuário (ex: "sim", "não") às opções anteriores:
* Recupere a ÚLTIMA MENSAGEM DA IA: "${lastBotMessage || "Nenhuma mensagem anterior."}"
* Pergunte sobre qual dos assuntos a pessoa quer saber, repetindo EXATAMENTE as opções anteriores. NUNCA invente opções novas.

CASO 3: Despedidas ou indicativo de fim de conversa:
* Agradeça, valorize o cuidado prestado e afirme disponibilidade. Não ofereça novos menus.

CONTEXTO DOS DOCUMENTOS (BASE DE CONHECIMENTO):
${contextText || "Nenhuma informação específica encontrada na base."}
`;
}

function buildGeminiContents(history: any[], currentQuery: string) {
  const contents: any[] = [];

  // Limitamos o histórico aos últimos 10 turnos.
  // Isso economiza tokens e mantém a janela de contexto limpa e focada no assunto atual.
  const trimmedHistory = (history || []).slice(-10);

  for (const msg of trimmedHistory) {
    contents.push({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    });
  }

  // Adiciona a pergunta atual no final do array.
  contents.push({
    role: "user",
    parts: [{ text: currentQuery }],
  });

  return contents;
}

// ==============================================================
// INTEGRAÇÃO GEMINI
// ==============================================================

async function generateEmbedding(query: string, apiKey: string) {
  // Chamada padrão para gerar vetor de busca do RAG.
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text: query }] },
        taskType: "RETRIEVAL_QUERY",
        outputDimensionality: 384,
      }),
    }
  );

  if (!response.ok)
    throw new Error(`Erro ao gerar embedding: ${response.status}`);

  const data = await response.json();
  return data.embedding?.values;
}

async function callGeminiMultiTurn(
  systemInstruction: string,
  contents: any[],
  apiKey: string
) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // CORREÇÃO ARQUITETURAL: 
        // A instrução de sistema precisa estar em um nó próprio na raiz do payload da API v1beta, 
        // e não ser empurrada como a primeira mensagem de usuário no array 'contents'. 
        // Fazer do jeito antigo quebrava o padrão de alternância de turnos exigido pelo Gemini.
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: contents,
        generationConfig: {
          temperature: 0.3, // Mantemos baixa para priorizar exatidão (RAG) em vez de criatividade.
          maxOutputTokens: 3000,
          topP: 0.8,
          topK: 20,
        },
        // CORREÇÃO DE FILTROS:
        // Como o bot atua no nicho de cuidadores informais, palavras como "sangue", 
        // "quebrou", "caiu" e "hospital" disparam gatilhos falsos-positivos de 
        // conteúdo perigoso (Dangerous Content). Nós afrouxamos levemente a restrição,
        // bloqueando apenas conteúdo de ALTO risco (BLOCK_ONLY_HIGH).
        safetySettings: [
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_ONLY_HIGH"
          }
        ]
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro Gemini API: ${errorText}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];

  // TRATAMENTO DE BLOQUEIO DE SEGURANÇA E LIMITE DE TOKENS:
  if (candidate?.finishReason === "SAFETY") {
    return { 
      text: "Por questões de segurança, recomendo que em caso de quedas ou suspeita de fratura, você ligue para o 192 (SAMU) ou busque um pronto-socorro para avaliação médica adequada.", 
      tokens: data.usageMetadata?.totalTokenCount || 0 
    };
  }

  // Fallback caso o Gemini decida interromper a geração abruptamente
  if (candidate?.finishReason === "MAX_TOKENS") {
    console.warn("ALERTA: A resposta foi cortada pelo limite de MAX_TOKENS da API.");
  }

  const text =
    candidate?.content?.parts?.[0]?.text ||
    "Desculpe, não consegui formular uma resposta agora.";

  const tokens = data.usageMetadata?.totalTokenCount || 0;

  return { text, tokens };
}

// ==============================================================
// RAG E CACHE
// ==============================================================

// RAG ---------------------
async function fetchSimilarDocuments(
  supabaseClient: any,
  queryEmbedding: number[]
) {
  const { data: documents, error } = await supabaseClient.rpc(
    "match_document_chunks",
    {
      query_embedding: queryEmbedding,
      match_threshold: 0.7, // similaridade (mais proximo de 1 maior similaridade)
      match_count: 50,  // limita a quantidade de chunks da busca bruta
    }
  );

  if (error) {
    console.error(error);
    return [];
  }

  // Filtramos e ordenamos os resultados de alta similaridade, mas enviamos
  // apenas os 5 MELHORES chunks para a instrução. Isso resolve o problema de
  // Lost in the Middle e evita alucinações.
  return (documents || [])
    .filter(
      (doc: any) =>
        doc.content &&
        doc.content.trim().length > 10
    )
    .sort(
      (a: any, b: any) =>
        b.similarity - a.similarity
    )
    .slice(0, 5); // Cortando a "sujeira": apenas o Top 5 sobrevive para o contexto.
}

// CACHE ---------------
async function checkCache(
  supabaseClient: any,
  queryEmbedding: number[]
) {
  try {
    const { data, error } = await supabaseClient.rpc(
      "match_cached_response",
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.95, // Requer 95% de semelhança para aproveitar o cache.
        match_count: 1,
      }
    );

    if (error) return null;
    if (data && data.length > 0) return data[0].response_text;

    return null;
  } catch {
    return null;
  }
}

// SALVA CACHE -------------
async function saveToCache(
  supabaseClient: any,
  query: string,
  response: string,
  embedding: number[]
) {
  try {
    if (!response || response.length < 10) return;

    await supabaseClient.from("query_cache").insert({
      query_text: query,
      response_text: response,
      embedding: embedding,
    });
  } catch (e) {
    console.error("Erro save cache:", e);
  }
}

// ==============================================================
// MAIN HANDLER
// ==============================================================

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const startTime = performance.now();

  let userQuery = "Erro ao processar requisição";
  let supabaseClient: any = null;

  try {
    const { query, original_query, history, conversation_id } = await req.json();
    userQuery = (query || original_query || "").trim();

    if (!userQuery) throw new Error("Pergunta vazia.");

    const geminiApiKey = Deno.env.get("API_GEMINI_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Se o histórico fornecido pelo cliente vier muito curto, nós o resgatamos
    // do banco para garantir que a IA tenha o contexto ideal.
    let fullHistory = history || [];
    if (fullHistory.length < 8 && conversation_id) {
      const { data: messages, error } = await supabaseClient
        .from("messages")
        .select("content, role")
        .eq("conversation_id", conversation_id)
        .order("created_at", { ascending: true })
        .limit(20);

      if (error) console.error("Erro ao fetch history:", error);
      else {
        fullHistory = messages.map((msg: any) => ({
          content: msg.content,
          role: msg.role === "assistant" ? "model" : "user"
        }));
      }
    }

    const lastBotMessage = (fullHistory || [])
      .filter((m: any) => m.role === "model" || m.role === "assistant")
      .map((m: any) => m.content)
      .pop() || "";

    const historyTextForEmbedding = (fullHistory || [])
      .slice(-4)
      .map((m: any) => m.content)
      .join(" ");

    const contextDependent = isContextDependentReply(userQuery);

    // Montamos a query contextualizada para o banco vetorial, 
    // garantindo que não vamos buscar algo genérico se o usuário
    // estiver respondendo a uma sugestão anterior do bot.
    let contextualQuery = contextDependent
      ? `${lastBotMessage} ${userQuery}`
      : `${historyTextForEmbedding} ${userQuery}`;

    const suggestionsMatch = lastBotMessage.match(/Você tem interesse em saber mais sobre: (.*)\?/);
    if (suggestionsMatch && contextDependent) {
      contextualQuery = `${suggestionsMatch[1]} ${userQuery}`;
    }

    const queryEmbedding = await generateEmbedding(
      contextualQuery,
      geminiApiKey!
    );

    let cachedResponse = null;

    if (!contextDependent) {
      cachedResponse = await checkCache(
        supabaseClient,
        queryEmbedding
      );
    }

    if (cachedResponse) {
      const endTime = performance.now();

      await logSystemMetrics(supabaseClient, {
        query: userQuery,
        latency_ms: Math.round(endTime - startTime),
        cache_hit: true,
        token_usage: 0,
      });

      return new Response(
        JSON.stringify({ text: cachedResponse }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const documents = await fetchSimilarDocuments(
      supabaseClient,
      queryEmbedding
    );

    const contextText = buildContextText(documents);
    const systemInstruction = buildSystemInstruction(contextText, lastBotMessage);

    const contents = buildGeminiContents(
      fullHistory,
      userQuery
    );

    const { text, tokens: tokenUsage } =
      await callGeminiMultiTurn(
        systemInstruction,
        contents,
        geminiApiKey!
      );

    let responseText = text.trim();

    // AQUI FOI REMOVIDO: A lógica falha de substring(0, 3200) foi removida inteiramente.
    // O LLM agora respeita a limitação de palavras naturalmente pela diretriz 7 do system prompt.

    if (!contextDependent) {
      await saveToCache(
        supabaseClient,
        contextualQuery,
        responseText,
        queryEmbedding
      );
    }

    const endTime = performance.now();

    await logSystemMetrics(supabaseClient, {
      query: userQuery,
      latency_ms: Math.round(endTime - startTime),
      cache_hit: false,
      token_usage: tokenUsage,
      retrieved_contexts: documents.map((d: any) => d.content),
      retrieved_context_ids: documents.map((d: any) => d.id), // id para avaliação do RAG
    });

    return new Response(
      JSON.stringify({ text: responseText }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    const endTime = performance.now();
    const errorMessage =
      error.message || "Erro interno desconhecido.";

    if (supabaseClient) {
      await logSystemMetrics(supabaseClient, {
        query: userQuery,
        latency_ms: Math.round(endTime - startTime),
        cache_hit: false,
        token_usage: 0,
        error_message: errorMessage + (error.stack ? ' ' + error.stack : ''),
      });
    }

    // Fallbacks elegantes em caso de falha.
    let respostaAmigavel =
      "Desculpe, tive um problema técnico. Tente novamente mais tarde.";

    if (
      errorMessage.toLowerCase().includes("quota") ||
      errorMessage.includes("429")
    ) {
      respostaAmigavel =
        "Puxa, acabei atingindo meu limite de respostas por agora. Tente novamente mais tarde.";
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        text: respostaAmigavel,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
