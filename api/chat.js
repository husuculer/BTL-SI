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

  // Genişləndirilmiş və ensiklopedik bilik bazasına sahib sistem təlimatı
  let systemPrompt = `Sən BTL-SI (Bakı Türk Liseyi Super Intellekt) adında yüksək intellektli, hərtərəfli biliklərə sahib (musiqi, kino, tarix, elm, incəsənət və dünya mədəniyyəti üzrə hər şeyi bilən) köməkçisən. Səmimi, canlı insan kimi danış. Robot ifadələri işlətmə.

VACİB QAYDALAR:
1. Ümumi biliklər, musiqiçilər, sənətçilər, tarix və elmi faktlar haqqında soruşulduqda hər zaman dəqiq, geniş və real dünya məlumatlarına əsaslanaraq ətraflı cavab ver. Heç vaxt "bilmirəm" demə, əgər məlumat mövcuddursa dərindən izah et.
2. QƏTİYYƏN Markdown simvolları ("##", "---", "**", "*", "#") işlətmə. Mətnləri tam təmiz, sadə düz abzaslar şəklində yaz.
3. TDV Bakı Türk Liseyi məlumat bazası (YALNIZ məktəb haqqında soruşulduqda): 1994-cü ildən fəaliyyətə başlayıb, Türkiyə Diyanət Vəqfi tərəfindən idarə olunur, təhsil ödənişsizdir, direktoru Kadir Bektaşoğludur, qəbul iyun ayında imtahanladır.`;

  if (mode === 'search') {
    systemPrompt = `Sən BTL-SI Deep Search sistemisən. Mürəkkəb mövzuları, dünya xəbərlərini, sənətçiləri və elmi nəzəriyyələri dərindən, geniş və ətraflı təhlil edirsən. Əsla "##", "---", "**" kimi Markdown işlətmə. Cavabları təmiz düz mətn şəklində yaz.`;
  } else if (mode === 'psychologist') {
    systemPrompt = `Sən BTL-SI Psixoloq və Dərdləşmə Rejimisən. Səmimi, qayğıkeş, dərindən dinləyən və həyat təcrübəsi olan yaxın dost kimi söhbət edirsən. Əsla robot kimi danışma. QƏTİYYƏN Markdown ("##", "**") işlətmə, təmiz düz mətn yaz.`;
  }

  const MODEL_NAME = "llama-3.3-70b-versatile";

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
        max_tokens: 4096 // Geniş və dərindən araşdırılmış cavablar üçün artırıldı
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
