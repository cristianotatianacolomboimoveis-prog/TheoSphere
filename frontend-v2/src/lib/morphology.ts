/**
 * Morphology Translation Utility
 * Translates Biblical Hebrew and Greek morphological codes into human-readable Portuguese.
 */

const HEBREW_CODES: Record<string, string> = {
  // Parts of Speech
  'V': 'Verbo',
  'N': 'Substantivo',
  'A': 'Adjetivo',
  'P': 'Pronome',
  'R': 'Preposição',
  'C': 'Conjunção',
  'D': 'Advérbio',
  'T': 'Partícula',
  
  // Verb Stems (Binyanim)
  'Qal': 'Qal (Simples)',
  'Niphal': 'Nifal (Simples Passivo)',
  'Piel': 'Piel (Intensivo Ativo)',
  'Pual': 'Pual (Intensivo Passivo)',
  'Hiphil': 'Hifil (Causativo Ativo)',
  'Hophal': 'Hofal (Causativo Passivo)',
  'Hithpael': 'Hitpael (Reflexivo)',
  
  // Verb Tenses/States
  'Perf': 'Perfeito (Ação Completa)',
  'Imperf': 'Imperfeito (Ação Incompleta)',
  'Wayy': 'Narrativo (Vav Consecutivo)',
  'Impv': 'Imperativo',
  'Inf': 'Infinitivo',
  'Part': 'Particípio',
  
  // Person/Gender/Number
  '1cs': '1ª Pessoa Comum Singular',
  '2ms': '2ª Pessoa Masc. Singular',
  '2fs': '2ª Pessoa Fem. Singular',
  '3ms': '3ª Pessoa Masc. Singular',
  '3fs': '3ª Pessoa Fem. Singular',
  '1cp': '1ª Pessoa Comum Plural',
  '2mp': '2ª Pessoa Masc. Plural',
  '2fp': '2ª Pessoa Fem. Plural',
  '3mp': '3ª Pessoa Masc. Plural',
  '3fp': '3ª Pessoa Fem. Plural',
};

const GREEK_TENSE: Record<string, string> = {
  'P': 'Presente', 'I': 'Imperfeito', 'F': 'Futuro', 'A': 'Aoristo', 'R': 'Perfeito', 'L': 'Mais-que-perfeito'
};

const GREEK_VOICE: Record<string, string> = {
  'A': 'Ativa', 'M': 'Média', 'P': 'Passiva', 'D': 'Depoente'
};

const GREEK_MOOD: Record<string, string> = {
  'I': 'Indicativo', 'S': 'Subjuntivo', 'O': 'Optativo', 'M': 'Imperativo', 'N': 'Infinitivo', 'P': 'Particípio'
};

const GREEK_PERSON: Record<string, string> = { '1': '1ª Pessoa', '2': '2ª Pessoa', '3': '3ª Pessoa' };
const GREEK_NUMBER: Record<string, string> = { 'S': 'Singular', 'P': 'Plural' };
const GREEK_GENDER: Record<string, string> = { 'M': 'Masculino', 'F': 'Feminino', 'N': 'Neutro' };
const GREEK_CASE: Record<string, string> = { 'N': 'Nominativo', 'V': 'Vocativo', 'G': 'Genitivo', 'D': 'Dativo', 'A': 'Acusativo' };

const GREEK_POS: Record<string, string> = {
  'V': 'Verbo', 'N': 'Substantivo', 'A': 'Adjetivo', 'P': 'Pronome', 'R': 'Preposição', 'C': 'Conjunção', 'D': 'Advérbio', 'I': 'Interjeição'
};

export function translateMorphology(code: string, isNT: boolean): string {
  if (!code) return "";
  
  // Se já estiver em um formato amigável, apenas retorna
  if (code.includes(' ')) return code;

  if (isNT) {
    const parts = code.split('-');
    const pos = GREEK_POS[parts[0]] || parts[0];
    
    if (parts[0] === 'V' && parts[1]) {
      // Verbos: V-[Tense][Voice][Mood]-[Person][Number]
      const tvm = parts[1];
      const tense = GREEK_TENSE[tvm[0]] || tvm[0];
      const voice = GREEK_VOICE[tvm[1]] || tvm[1];
      const mood = GREEK_MOOD[tvm[2]] || tvm[2];
      
      let decoded = `${pos}, ${tense}, ${voice}, ${mood}`;
      
      if (parts[2]) {
        const pn = parts[2];
        const person = GREEK_PERSON[pn[0]] || pn[0];
        const number = GREEK_NUMBER[pn[1]] || pn[1];
        decoded += `, ${person}, ${number}`;
      }
      return decoded;
    }

    if ((parts[0] === 'N' || parts[0] === 'A') && parts[1]) {
      // Nomes/Adjetivos: N-[Case][Number][Gender]
      const cng = parts[1];
      const kase = GREEK_CASE[cng[0]] || cng[0];
      const number = GREEK_NUMBER[cng[1]] || cng[1];
      const gender = GREEK_GENDER[cng[2]] || cng[2];
      return `${pos}, ${kase}, ${number}, ${gender}`;
    }

    return parts.map(p => GREEK_POS[p] || p).join(", ");
  } else {
    // Parsing de códigos hebraicos (estilo: V-Qal-Perf-3ms)
    const parts = code.split('-');
    return parts.map(part => HEBREW_CODES[part] || part).join(", ");
  }
}
