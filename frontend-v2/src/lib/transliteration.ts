/**
 * Phonetic Transliteration Utility for Biblical Languages
 * Supports Koine Greek, Biblical Hebrew, and Aramaic.
 */

const GREEK_MAP: Record<string, string> = {
  'α': 'a', 'β': 'b', 'γ': 'g', 'δ': 'd', 'ε': 'e', 'ζ': 'z', 'η': 'ē', 'θ': 'th',
  'ι': 'i', 'κ': 'k', 'λ': 'l', 'μ': 'm', 'ν': 'n', 'ξ': 'x', 'ο': 'o', 'π': 'p',
  'ρ': 'r', 'σ': 's', 'ς': 's', 'τ': 't', 'υ': 'y', 'φ': 'ph', 'χ': 'ch', 'ψ': 'ps',
  'ω': 'ō', 'ά': 'a', 'έ': 'e', 'ή': 'ē', 'ί': 'i', 'ό': 'o', 'ύ': 'y', 'ώ': 'ō',
  'ϊ': 'i', 'ϋ': 'y', 'ΐ': 'i', 'ΰ': 'y'
};

const HEBREW_MAP: Record<string, string> = {
  'א': "'", 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'w', 'ז': 'z', 'ח': 'ch',
  'ט': 't', 'י': 'y', 'כ': 'k', 'ך': 'k', 'ל': 'l', 'מ': 'm', 'ם': 'm', 'נ': 'n',
  'ן': 'n', 'ס': 's', 'ע': '`', 'פ': 'p', 'ף': 'p', 'צ': 'ts', 'ץ': 'ts', 'ק': 'q',
  'ר': 'r', 'ש': 'sh', 'ת': 't'
};

// Vowel mapping (basic phonetic representation)
const HEBREW_VOWELS: Record<string, string> = {
  '\u05B0': 'e', // Sheva
  '\u05B1': 'e', // Hataph Segol
  '\u05B2': 'a', // Hataph Pathah
  '\u05B3': 'o', // Hataph Qamets
  '\u05B4': 'i', // Hireq
  '\u05B5': 'e', // Tsere
  '\u05B6': 'e', // Segol
  '\u05B7': 'a', // Pathah
  '\u05B8': 'a', // Qamets
  '\u05B9': 'o', // Holam
  '\u05BB': 'u', // Qubuts
  '\u05BC': '',  // Dagesh (handled by doubling or ignored for simple)
};

export function transliterateGreek(text: string): string {
  // Transliteração acadêmica simplificada
  return text.toLowerCase().split('').map(char => GREEK_MAP[char] || char).join('');
}

export function transliterateHebrew(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const translit = HEBREW_MAP[char] || HEBREW_VOWELS[char] || char;
    result += translit;
  }
  return result;
}

/**
 * Converte o texto bíblico em som usando um motor de áudio HUMANO REAL ou Neural de Alta Fidelidade.
 */
export function speakWord(text: string, isNT: boolean, strongId?: string) {
  if (typeof window === 'undefined') return;
  
  // Limpeza de diacríticos para o motor TTS não se confundir
  const cleanText = text.replace(/[\u0591-\u05AF]/g, '').trim();
  const lang = isNT ? 'el' : 'he';
  
  // 1. Tentar fonte de áudio HUMANA (Real) baseada em Strong's
  if (strongId) {
    const sId = strongId.replace(/[GH]/, '').padStart(4, '0');
    const type = isNT ? 'greek' : 'hebrew';
    
    // Fontes de áudio humano de alta qualidade (Blue Letter Bible / StepBible)
    const humanSources = [
      `https://audio.blueletterbible.org/strongs/${type}/${sId}.mp3`,
      `https://www.stepbible.org/downloads/audio/${isNT ? 'G' : 'H'}${sId}.mp3`
    ];

    const tryPlay = (index: number) => {
      if (index >= humanSources.length) {
        playNeuralAudio(cleanText, lang, isNT);
        return;
      }

      const audio = new Audio(humanSources[index]);
      audio.play().then(() => {
      }).catch(() => {
        tryPlay(index + 1);
      });
    };

    tryPlay(0);
    return;
  }

  playNeuralAudio(cleanText, lang, isNT);
}

function playNeuralAudio(text: string, lang: string, isNT: boolean) {
  // Motor Neural de Alta Fidelidade (Google Translate TTS via Proxy Obfuscated)
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob&ttsspeed=0.7`;
  const audio = new Audio(url);
  
  // Ajustes para naturalidade
  audio.playbackRate = 0.85; 
  audio.preservesPitch = true;
  
  audio.play().catch(() => {
    // 3. Último recurso: Voz do sistema (macOS tem vozes excelentes se instaladas)
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = isNT ? 'el-GR' : 'he-IL';
    utterance.rate = 0.65; // Mais lento para fins acadêmicos
    utterance.pitch = 1.0;
    
    // Tenta encontrar uma voz premium se disponível
    const voices = window.speechSynthesis.getVoices();
    const premiumVoice = voices.find(v => v.lang.startsWith(lang) && v.name.includes('Premium'));
    if (premiumVoice) utterance.voice = premiumVoice;

    window.speechSynthesis.speak(utterance);
  });
}

export function transliterateBiblical(text: string, isNT: boolean): string {
  if (isNT) return transliterateGreek(text);
  return transliterateHebrew(text);
}
