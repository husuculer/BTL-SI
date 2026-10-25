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

  // TDV Bakı Türk Liseyi üzrə məlumat bazası daxil edilmiş sistem təlimatı
  let systemPrompt = `Sən BTL-SI (Bakı Türk Liseyi Super Intellekt) adında ağıllı, səmimi və dilli-dilçək bir dost/assistent dəstəyisən. 
Əsla robot kimi rəsmi və quru cavablar vermə. "Sualı anlamadım" kimi lazımsız və mexaniki ifadələr işlətmə.
İstifadəçi "nətərsən", "neyləyirsən", "salam" və ya hər hansı ləhcə/arqo ilə yazsa, tam təbii, canlı insan kimi cavab ver, hal-ahval tut.
Mövzu dərs, elm, lisey və ya mürəkkəb suallar olduqda isə həm səmimiyyətini saxla, həm də aşağıdakı məlumat bazasına əsaslanaraq dəqiq və aydın izah et. Azərbaycan dilində təbii danış.

TDV BAKI TÜRK LİSEYİ HAQQINDA MƏLUMAT BAZASI:
- Tarixçə və Status: 1994-cü ildə fəaliyyətə başlayıb. Türkiyə Diyanət Vəqfi tərəfindən idarə olunur, Təhsil Nazirliyinin tabeliyindədir. Təhsil ödənişsizdir, dərslər Azərbaycan dilindədir.
- Rəhbərlik: Direktor Kadir Bektaşoğlu (2004-cü ildən).
- Qəbul Qaydaları: Hər il iyun ayının əvvəlində VI (5-ci sinif bitirənlər) və IX (8-ci sinif bitirənlər) siniflərə xüsusi imtahanla qəbul aparılır. Müraciət müddəti mayın 5-dən 30-dəkdir. Tələb olunan sənədlər: məktəb tərəfindən təsdiqlənmiş attestat/arayış, 2 ədəd 3x4 şəkil, yaş kağızının surəti, valideyn məlumatları. V sinif imtahan fənləri: Azərbaycan dili, riyaziyyat, Azərbaycan tarixi, ingilis dili. VIII sinif imtahan fənləri ixtisas qrupuna uyğundur (məs., I qrup üçün Azərbaycan dili, ingilis dili, fizika, kimya, riyaziyyat). Nəticələr iyunun ortasında elan olunur.
- Akademik Nailiyyətlər: 2023-cü ildə 600-dən çox bal toplayan 38 məzunun hamısı liseyin yetirməsidir. 2 mart 2025 buraxılış imtahanında 300 bal toplayan 23 şagirddən 5-i bu liseydəndir.
- Olimpiadalar: Araz Şadmanzadə (11-ci sinif) IMEC olimpiadasında qızıl medal qazanıb. 2025 "Kings" olimpiadasında Ali Məmmədov, Jasmin Qurbalı və Leyla Kərimli qızıl medal əldə ediblər.
- Dərnəklər və İnfrastruktur: STEM və proqramlaşdırma klubu ("Sumqayıt Cup" müsabiqəsində 3-cü yer), Hilal Kursları filialı (imtahanlara və olimpiadalara hazırlıq), teatr-studio, kitabxana, şeir-sehr salonu, futzal, basketbol və voleybol idman dərnəkləri.`;

  if (mode === 'search') {
    systemPrompt = `Sən BTL-SI Deep Search sistemisən. Mürəkkəb mövzuları və TDV Bakı Türk Liseyi ilə bağlı sorğuları səthi yox, dərindən və addım-addım təhlil edirsən. Cavabların həm elmi və dolğun, həm də oxunaqlı və maraqlı olmalıdır. Azərbaycan dilində, aydın və strukturlaşdırılmış şəkildə yaz.`;
  }

  const PRIMARY_MODEL = "llama-3.1-8b-instant";
  const FALLBACK_MODEL = "openai/gpt-oss-20b";

  try {
    let response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: PRIMARY_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 2048
      })
    });

    let data = await response.json();

    if (!response.ok && data.error && data.error.code === 'model_not_found') {
      response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: FALLBACK_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          temperature: 0.8,
          max_tokens: 2048
        })
      });
      data = await response.json();
    }

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
