export const config = {
  maxDuration: 60,
};

const PRIMARY_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const FALLBACK_MODEL = 'llama-3.1-8b-instant';

// Cavabın maksimum uzunluğu. Pulsuz planda dəqiqəlik token limiti kiçikdir,
// ona görə 4096 təhlükəsiz səviyyədir. Artırmaq üçün Vercel-də GROQ_MAX_TOKENS təyin et.
const MAX_OUTPUT_TOKENS = Number(process.env.GROQ_MAX_TOKENS) || 4096;
const SAFE_OUTPUT_TOKENS = 1500;

const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 6000;
const HISTORY_CHAR_BUDGET = 14000;
const SAFE_HISTORY_CHAR_BUDGET = 6000;
const TOTAL_DEADLINE_MS = 55000;

const SYSTEM_PROMPTS = {
  default: `Sən BTL-SI (Bakı Türk Liseyi Super Intellekt) adında yüksək intellektli, hərtərəfli biliklərə sahib (musiqi, kino, tarix, elm, incəsənət və dünya mədəniyyəti üzrə hər şeyi bilən) köməkçisən. Səmimi, canlı insan kimi danış. Robot ifadələri işlətmə.

VACİB QAYDALAR:
1. Ümumi biliklər, musiqiçilər, sənətçilər, tarix və elmi faktlar haqqında soruşulduqda hər zaman dəqiq, geniş və real dünya məlumatlarına əsaslanaraq ətraflı cavab ver. Heç vaxt "bilmirəm" demə, əgər məlumat mövcuddursa dərindən izah et.
2. QƏTİYYƏN Markdown simvolları ("##", "---", "**", "*", "#") işlətmə. Mətnləri tam təmiz, sadə düz abzaslar şəklində yaz.
3. TDV Bakı Türk Liseyi məlumat bazası (YALNIZ məktəb haqqında soruşulduqda): 1994-cü ildən fəaliyyətə başlayıb, Türkiyə Diyanət Vəqfi tərəfindən idarə olunur, təhsil ödənişsizdir, direktoru Kadir Bektaşoğludur, qəbul iyun ayında imtahanladır.
4. Söhbətin əvvəlki mesajlarını nəzərə al, istifadəçi əvvəl dediklərinə istinad edəndə kontekstdən çıx.
5. Şəkil çəkmək istəsələr, sol aşağıdakı "+" düyməsindən "Şəkil Yarat" rejimini seçməyi de. "Bu modeldə mümkün deyil" kimi cavab vermə.`,

  search: `Sən BTL-SI Deep Search sistemisən. Mürəkkəb mövzuları, dünya xəbərlərini, sənətçiləri və elmi nəzəriyyələri dərindən, geniş və ətraflı təhlil edirsən. Əsla "##", "---", "**" kimi Markdown işlətmə. Cavabları təmiz düz mətn şəklində yaz. Söhbətin əvvəlki mesajlarını nəzərə al.`,

  psychologist: `Sən BTL-SI Psixoloq və Dərdləşmə Rejimisən. Səmimi, qayğıkeş, dərindən dinləyən və həyat təcrübəsi olan yaxın dost kimi söhbət edirsən. Əsla robot kimi danışma. QƏTİYYƏN Markdown ("##", "**") işlətmə, təmiz düz mətn yaz. Söhbətin əvvəlki mesajlarını nəzərə al.`,
};

function parseBody(req) {
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body || {};
}

function buildHistory({ messages, prompt }) {
  let history = [];

  if (Array.isArray(messages)) {
    history = messages
      .filter(
        (m) =>
          m &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.trim() !== ''
      )
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }));
  } else if (typeof prompt === 'string' && prompt.trim() !== '') {
    history = [{ role: 'user', content: prompt.slice(0, MAX_MESSAGE_CHARS) }];
  }

  return history.slice(-MAX_HISTORY_MESSAGES);
}

// Köhnə mesajları atır ki, sorğu token limitini aşmasın
function trimToBudget(history, charBudget) {
  const out = [...history];
  let total = out.reduce((sum, m) => sum + m.content.length, 0);
  while (out.length > 1 && total > charBudget) {
    total -= out.shift().content.length;
  }
  while (out.length > 1 && out[0].role !== 'user') out.shift();
  return out;
}

function cleanMarkdown(text) {
  return text
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    .replace(/\*\*(.+?)\*\*/gs, '$1')
    .replace(/^\*\s+/gm, '- ')
    .replace(/`{1,3}/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function callGroq({ model, maxTokens }, apiKey, systemPrompt, history, timeoutMs) {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...history],
        temperature: 0.7,
        max_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = await response.json().catch(() => ({}));
    const ok = response.ok && Array.isArray(data.choices) && data.choices.length > 0;
    return { ok, status: response.status, data };
  } catch (error) {
    const timedOut = error.name === 'TimeoutError' || error.name === 'AbortError';
    return {
      ok: false,
      status: timedOut ? 504 : 500,
      data: { error: { code: timedOut ? 'timeout' : 'network_failure', message: error.message } },
    };
  }
}

// Limit dolduqda və ya model problemi olduqda növbəti variantı yoxlamaq üçün
function isRetryable(result) {
  const text = JSON.stringify(result.data?.error || {}).toLowerCase();
  return (
    [404, 413, 429, 504].includes(result.status) ||
    /model|rate_limit|too large|tokens per|timeout/.test(text)
  );
}

function friendlyMessage(status, code) {
  if (status === 429 || code === 'rate_limit_exceeded') {
    return 'Groq limiti müvəqqəti dolub. Bir neçə saniyə gözləyib yenidən yaz.';
  }
  if (status === 413) return 'Söhbət çox uzanıb. "Yeni söhbət" açıb davam et.';
  if (status === 504) return 'Cavab çox gec gəldi, yenidən cəhd et.';
  if (status === 401) return 'GROQ_API_KEY yanlışdır və ya köhnəlib.';
  return 'Groq tərəfində xəta baş verdi.';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: { message: 'Method Not Allowed. Yalnız POST sorğuları qəbul edilir.', code: 'method_not_allowed' },
    });
  }

  const body = parseBody(req);
  const history = buildHistory(body);

  if (history.length === 0 || history[history.length - 1].role !== 'user') {
    return res.status(400).json({ error: { message: 'Keçərli mesaj daxil edilməyib.', code: 'invalid_prompt' } });
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return res.status(500).json({
      error: { message: 'GROQ_API_KEY mühit dəyişəni Vercel panelində təyin edilməyib.', code: 'missing_api_key' },
    });
  }

  const systemPrompt =
    body.mode === 'search'
      ? SYSTEM_PROMPTS.search
      : body.mode === 'psychologist'
      ? SYSTEM_PROMPTS.psychologist
      : SYSTEM_PROMPTS.default;

  // Birinci cəhd uğursuz olsa, daha kiçik sorğu və ehtiyat modellə yenidən yoxlanır
  const attempts = [
    { model: PRIMARY_MODEL, maxTokens: MAX_OUTPUT_TOKENS, charBudget: HISTORY_CHAR_BUDGET },
    { model: PRIMARY_MODEL, maxTokens: SAFE_OUTPUT_TOKENS, charBudget: SAFE_HISTORY_CHAR_BUDGET },
    { model: FALLBACK_MODEL, maxTokens: SAFE_OUTPUT_TOKENS, charBudget: SAFE_HISTORY_CHAR_BUDGET },
  ];

  const deadline = Date.now() + TOTAL_DEADLINE_MS;
  let last = null;

  for (const attempt of attempts) {
    const remaining = deadline - Date.now();
    if (remaining < 3000) break;

    const result = await callGroq(
      attempt,
      GROQ_API_KEY,
      systemPrompt,
      trimToBudget(history, attempt.charBudget),
      Math.min(25000, remaining)
    );

    if (result.ok) {
      const msg = result.data.choices[0].message;
      if (msg && typeof msg.content === 'string') {
        msg.content = cleanMarkdown(msg.content);
      }
      return res.status(200).json(result.data);
    }

    last = result;
    if (!isRetryable(result)) break;
  }

  const err = last?.data?.error || {};
  const status = last?.status || 500;
  return res.status(status).json({
    error: {
      message: friendlyMessage(status, err.code),
      code: err.code || 'groq_error',
      details: err.message || '',
    },
  });
}
