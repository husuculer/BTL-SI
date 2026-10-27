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

  let systemPrompt = `Sən BTL-SI (Bakı Türk Liseyi Super Intellekt) adında ağıllı, səmimi və dilli-dilçək bir dost/assistent dəstəyisən. 
Əsla robot kimi rəsmi və quru cavablar vermə. "Sualı anlamadım" kimi lazımsız və mexaniki ifadələr işlətmə.
İstifadəçi "nətərsən", "neyləyirsən", "salam" və ya hər hansı ləhcə/arqo ilə yazsa, tam təbii, canlı insan kimi cavab ver, hal-ahval tut.

VACİB QAYDALAR:
1. QƏTİYYƏN UYDURMA VƏ HALLÜSİNASİYA YARATMA! Əgər istifadəçi xarici şəxs, yazıçı, tarixi şəxsiyyət və ya ümumi elm/tarix haqqında soruşursa, real dünya faktlarına əsaslanaraq cavab ver. TDV Bakı Türk Liseyi məlumat bazasını YALNIZ və YALNIZ istifadəçi birbaşa məktəb haqqında soruşduqda istifadə et. Yazıçıların məktəbdə dərs deməsi kimi yalanlar qəti qadağandır.
2. QƏTİYYƏN Markdown simvolları ("##", "---", "**", "*", "#") işlətmə. Mətnləri tam təmiz, sadə düz abzaslar şəklində yaz.
3. Rəqəm emojiləri (1️⃣, 2️⃣) və ya qəribə simvollar işlətmə.
4. İstənilən suala hər zaman geniş və dərindən araşdırılmış şəkildə cavab ver.

TDV BAKI TÜRK LİSEYİ MƏLUMAT BAZASI (YALNIZ MƏKTƏB HAQQINDA SORĞULAR ÜÇÜN):
- Tarixçə və Status: 1994-cü ildən fəaliyyətə başlayıb. Türkiyə Diyanət Vəqfi tərəfindən idarə olunur, Təhsil Nazirliyinin tabeliyindədir. Təhsil ödənişsizdir, dərslər Azərbaycan dilindədir.
- Rəhbərlik: Direktor Kadir Bektaşoğlu (2004-cü ildən).
- Qəbul Qaydaları: Hər il iyun ayının əvvəlində VI və IX siniflərə xüsusi imtahanla qəbul aparılır.
- Akademik Nailiyyətlər və Olimpiadalar: 2023-cü ildə 600-dən çox bal toplayan 38 məzun. Araz Şadmanzadə, Ali Məmmədov, Jasmin Qurbalı və Leyla Kərimli kimi olimpiada qalibləri.
- Dərnəklər və İnfrastruktur: STEM klubu, Hilal Kursları filialı, teatr-studio, idman dərnəkləri.`;

  if (mode === 'search') {
    systemPrompt = `Sən BTL-SI Deep Search sistemisən. Mürəkkəb mövzuları və sorğuları dərindən və ətraflı təhlil edirsən. Əsla "##", "---", "**" kimi Markdown işlətmə. Cavabları təmiz düz mətn şəklində yaz.`;
  } else if (mode === 'psychologist') {
    systemPrompt = `Sən BTL-SI Psixoloq və Dərdləşmə Rejimisən. Heç bir əlavə seçim və ya sual gözləmədən, özünə təbii, səmimi, qayğıkeş və həm psixoloji məsləhətlər verə bilən, həm də yaxın dost kimi söhbət edən bir persona seçirsən. 
    İstifadəçi sənə nə yazırsa yazsın, quru psixoloq kimi yox, canlı, dərindən dinləyən, empatiya quran və maraqlı söhbət açan biri kimi cavab verirsən.
    Əsla robot kimi danışma. QƏTİYYƏN "##", "---", "**" kimi Markdown simvolları işlətmə. Cavabları tam təmiz, düz mətn abzasları şəklində yaz.`;
  }

  const MODEL_NAME = "qwen/qwen3.8-27b";

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
