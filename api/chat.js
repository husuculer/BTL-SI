// Vercel-də funksiyanın maksimum işləmə müddəti (uzun cavablar üçün)
export const config = {
  maxDuration: 60,
};

const MODEL_NAME = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const MAX_OUTPUT_TOKENS = 8192;   // bir cavabın maksimum uzunluğu (modelin tavanı 32768-dir)
const MAX_HISTORY_MESSAGES = 20;  // çata göndərilən son mesajların sayı
const MAX_MESSAGE_CHARS = 8000;   // bir mesajın maksimum simvol sayı
const REQUEST_TIMEOUT_MS = 55000; // Groq-a sorğu üçün gözləmə vaxtı

const SYSTEM_PROMPTS = {
  default: `Sən BTL-SI (Bakı Türk Liseyi Super Intellekt) adında yüksək intellektli, hərtərəfli biliklərə sahib (musiqi, kino, tarix, elm, incəsənət və dünya mədəniyyəti üzrə hər şeyi bilən) köməkçisən. Səmimi, canlı insan kimi danış. Robot ifadələri işlətmə.

VACİB QAYDALAR:
1. Ümumi biliklər, musiqiçilər, sənətçilər, tarix və elmi faktlar haqqında soruşulduqda hər zaman dəqiq, geniş və real dünya məlumatlarına əsaslanaraq ətraflı cavab ver. Heç vaxt "bilmirəm" demə, əgər məlumat mövcuddursa dərindən izah et.
2. QƏTİYYƏN Markdown simvolları ("##", "---", "**", "*", "#") işlətmə. Mətnləri tam təmiz, sadə düz abzaslar şəklində yaz.
3. TDV Bakı Türk Liseyi məlumat bazası (YALNIZ məktəb haqqında soruşulduqda): 1994-cü ildən fəaliyyətə başlayıb, Türkiyə Diyanət Vəqfi tərəfindən idarə olunur, təhsil ödənişsizdir, direktoru Kadir Bektaşoğludur, qəbul iyun ayında imtahanladır.
4. Söhbətin əvvəlki mesajlarını nəzərə al, istifadəçi əvvəl dediklərinə istinad edəndə kontekstdən çıx.`,

  search: `Sən BTL-SI Deep Search sistemisən. Mürəkkəb mövzuları, dünya xəbərlərini, sənətçiləri və elmi nəzəriyyələri dərindən, geniş və ətraflı təhlil edirsən. Əsla "##", "---", "**" kimi Markdown işlətmə. Cavabları təmiz düz mətn şəklində yaz. Söhbətin əvvəlki mesajlarını nəzərə al.`,

  psychologist: `Sən BTL-SI Psixoloq və Dərdləşmə Rejimisən. Səmimi, qayğıkeş, dərindən dinləyən və həyat təcrübəsi olan yaxın dost kimi söhbət edirsən. Əsla robot kimi danışma. QƏTİYYƏN Markdown ("##", "**") işlətmə, təmiz düz mətn yaz. Söhbətin əvvəlki mesajlarını nəzərə al.`,
};

function sendError(res, status, message, code) {
  return res.status(status).json({ error: { message, code } });
}

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

// Həm yeni "messages" massivini, həm də köhnə "prompt" formatını qəbul edir
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

  history = history.slice(-MAX_HISTORY_MESSAGES);
  while (history.length && history[0].role !== 'user') history.shift();
  return history;
}

// Model bəzən Markdown yazır, onu təmizləyirik
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method Not Allowed. Yalnız POST sorğuları qəbul edilir.', 'method_not_allowed');
  }

  const body = parseBody(req);
  const history = buildHistory(body);

  if (history.length === 0 || history[history.length - 1].role !== 'user') {
    return sendError(res, 400, 'Keçərli mesaj daxil edilməyib.', 'invalid_prompt');
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return sendError(res, 500, 'GROQ_API_KEY mühit dəyişəni Vercel panelində təyin edilməyib.', 'missing_api_key');
  }

  const systemPrompt =
    body.mode === 'search'
      ? SYSTEM_PROMPTS.search
      : body.mode === 'psychologist'
      ? SYSTEM_PROMPTS.psychologist
      : SYSTEM_PROMPTS.default;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [{ role: 'system', content: systemPrompt }, ...history],
        temperature: 0.7,
        max_tokens: MAX_OUTPUT_TOKENS,
      }),
      signal: controller.signal,
    });

    const data = await response.json();

    if (response.ok && data.choices && data.choices.length > 0) {
      const msg = data.choices[0].message;
      if (msg && typeof msg.content === 'string') {
        msg.content = cleanMarkdown(msg.content);
      }
      return res.status(200).json(data);
    }

    if (response.status === 429) {
      return sendError(
        res,
        429,
        'Groq limiti dolub. Bir neçə saniyə gözləyib yenidən cəhd et.',
        'rate_limit_exceeded'
      );
    }

    return res.status(response.status || 500).json({
      error: data.error || { message: 'Groq API tərəfindən bilinməyən xəta qaytarıldı.' },
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      return sendError(res, 504, 'Cavab çox gec gəldi, yenidən cəhd et.', 'timeout');
    }
    return sendError(res, 500, 'Server şəbəkə xətası: ' + error.message, 'network_failure');
  } finally {
    clearTimeout(timer);
  }
}
