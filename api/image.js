export const config = {
  maxDuration: 60,
};

// Pulsuz və keyfiyyətli: Cloudflare Workers AI üzərində FLUX.1 schnell
const CF_MODEL = '@cf/black-forest-labs/flux-1-schnell';
const IMAGE_STEPS = Number(process.env.CF_IMAGE_STEPS) || 6; // 4-8 arası. Çox olsa keyfiyyət artır, gündəlik limit azalır
const MAX_PROMPT_CHARS = 500;

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

// Flux ingilis dilini daha yaxşı başa düşür. Azərbaycanca təsviri ingiliscə ətraflı promta çeviririk
async function enhancePrompt(userPrompt, groqKey) {
  if (!groqKey) return userPrompt;
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content:
              "Turn the user's image idea (it may be in Azerbaijani, Turkish, Russian or English) into ONE detailed English prompt for an image generator. Mention the subject, setting, lighting, style and camera look. Under 80 words. Output only the prompt, nothing else.",
          },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    return text ? text.slice(0, 1500) : userPrompt;
  } catch {
    return userPrompt;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: { message: 'Method Not Allowed. Yalnız POST sorğuları qəbul edilir.', code: 'method_not_allowed' },
    });
  }

  const body = parseBody(req);
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, MAX_PROMPT_CHARS) : '';

  if (!prompt) {
    return res.status(400).json({ error: { message: 'Şəkil təsviri boşdur.', code: 'invalid_prompt' } });
  }

  const accountId = process.env.CF_ACCOUNT_ID;
  const token = process.env.CF_API_TOKEN;

  if (!accountId || !token) {
    return res.status(500).json({
      error: {
        message: 'CF_ACCOUNT_ID və CF_API_TOKEN mühit dəyişənləri Vercel panelində təyin edilməyib.',
        code: 'missing_cloudflare_keys',
      },
    });
  }

  const finalPrompt = await enhancePrompt(prompt, process.env.GROQ_API_KEY);

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${CF_MODEL}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: finalPrompt, steps: IMAGE_STEPS }),
        signal: AbortSignal.timeout(45000),
      }
    );

    const contentType = response.headers.get('content-type') || '';

    // Bəzən birbaşa şəkil faylı qayıdır
    if (response.ok && contentType.startsWith('image/')) {
      const buffer = Buffer.from(await response.arrayBuffer());
      return res.status(200).json({ image: buffer.toString('base64'), mime: contentType, prompt: finalPrompt });
    }

    const data = await response.json().catch(() => null);
    const image = data?.result?.image;

    if (response.ok && image) {
      return res.status(200).json({ image, mime: 'image/jpeg', prompt: finalPrompt });
    }

    const cfMessage = data?.errors?.[0]?.message || '';
    const message =
      response.status === 429
        ? 'Bu günlük pulsuz şəkil limiti dolub. Sabah yenidən cəhd et.'
        : response.status === 401 || response.status === 403
        ? 'Cloudflare token-i yanlışdır və ya Workers AI icazəsi yoxdur.'
        : 'Şəkil yaradıla bilmədi.';

    return res.status(response.status || 500).json({
      error: { message, code: 'image_failed', details: cfMessage },
    });
  } catch (error) {
    const timedOut = error.name === 'TimeoutError' || error.name === 'AbortError';
    return res.status(timedOut ? 504 : 500).json({
      error: {
        message: timedOut ? 'Şəkil gec hazırlandı, yenidən cəhd et.' : 'Server şəbəkə xətası.',
        code: timedOut ? 'timeout' : 'network_failure',
        details: error.message,
      },
    });
  }
}
