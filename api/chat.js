export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: { 
        message: 'Method Not Allowed. Yalnız POST sorğuları qəbul edilir.',
        code: 'method_not_allowed' 
      } 
    });
  }

  const { mode, prompt } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return res.status(400).json({ 
      error: { 
        message: 'Keçərli prompt daxil edilməyib.',
        code: 'invalid_prompt' 
      } 
    });
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    return res.status(500).json({ 
      error: { 
        message: 'GROQ_API_KEY mühit dəyişəni Vercel panelində təyin edilməyib.',
        code: 'missing_api_key' 
      } 
    });
  }

  let systemPrompt = `Sən BTL-SI (Bakı Türk Liseyi Super Intellekt) dost/assistent dəstəyisən. Səmimi, canlı insan kimi danış. Robot ifadələri işlətmə.
QAYDALAR:
1. Hallüsinasiya yaratma. Kənar şəxslər və mövzularda dürüst, real faktlarla cavab ver.
2. QƏTİYYƏN Markdown ("##", "**", "*", "---") işlətmə. Cavabları sadə düz mətn yaz.
3. BTL Bazası yalnız lisey sorğularında istifadə olunur: 1994-də yaradılıb, pulsuzdur, dir. Kadir Bektaşoğlu. Qəbul VI və IX siniflərə iyun ayında imtahanladır.`;

  if (mode === 'search') {
    systemPrompt = `Sən BTL-SI Deep Search sistemisən. Mürəkkəb mövzuları dərindən və ətraflı təhlil et. Markdown ("##", "**") işlətmə, təmiz düz mətn yaz.`;
  } else if (mode === 'psychologist') {
    systemPrompt = `Sən BTL-SI Psixoloq və Dərdləşmə Rejimisən. Özünə təbii, səmimi, qayğıkeş persona seç. Quru yox, canlı, empatiya quran dost kimi söhbət et. Markdown ("##", "**") işlətmə.`;
  }

  const MODEL_NAME = "llama-3.1-8b-instant";

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2048
      })
    });

    const data = await response.json();

    if (response.ok && data.choices && data.choices.length > 0) {
      return res.status(200).json(data);
    } else {
      return res.status(response.status || 500).json({ 
        error: data.error || { message: 'Groq API tərəfindən bilinməyən xəta qaytarıldı.' } 
      });
    }

  } catch (error) {
    return res.status(500).json({ 
      error: { 
        message: 'Server şəbəkə xətası: ' + error.message,
        code: 'network_failure' 
      } 
    });
  }
}
