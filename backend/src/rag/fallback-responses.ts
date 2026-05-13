/**
 * Fallback AI Responses for TheoSphere.
 *
 * Used when the AI provider (Gemini/OpenAI) is unavailable.
 */

export function generateFallbackResponse(
  query: string,
  jsonMode: boolean = false,
): string {
  const lower = query.toLowerCase();

  if (jsonMode) {
    return JSON.stringify({
      verse:
        query.match(/\b([1-3]?\s?[a-zA-Z]+)\s(\d+):(\d+)\b/)?.[0] ||
        'João 3:16',
      original_language:
        lower.includes('hebraico') ||
        lower.includes('hb') ||
        lower.includes('bhs')
          ? 'HB'
          : 'GK',
      interlinear: [
        {
          word: 'ἐν',
          transliteration: 'en',
          strong: 'G1722',
          morphology: 'prep',
          translation: 'no',
        },
        {
          word: 'ἀρχῇ',
          transliteration: 'archē',
          strong: 'G746',
          morphology: 'noun: dat sing fem',
          translation: 'princípio',
        },
        {
          word: 'ἦν',
          transliteration: 'ēn',
          strong: 'G1510',
          morphology: 'verb: impf act ind 3 sing',
          translation: 'era',
        },
        {
          word: 'ὁ',
          transliteration: 'ho',
          strong: 'G3588',
          morphology: 'art: nom sing masc',
          translation: 'o',
        },
        {
          word: 'Λόgος',
          transliteration: 'Logos',
          strong: 'G3056',
          morphology: 'noun: nom sing masc',
          translation: 'Verbo',
        },
      ],
      lexical_analysis: [
        {
          word: 'Λόγος (Logos)',
          bdag_halot_sense:
            'Princípio ordenador, palavra viva, revelação divina encarnada.',
          academic_discussion:
            'Discussão central no prólogo joanino sobre a preexistência do Messias.',
        },
      ],
      syntactic_notes:
        "O uso do imperfeito 'ēn' indica existência contínua no passado eterno.",
      syntactic_graph: {
        nodes: [
          { id: '1', label: 'Verbo', type: 'subject' },
          { id: '2', label: 'era', type: 'verb' },
          { id: '3', label: 'princípio', type: 'context' },
        ],
        edges: [
          { source: '1', target: '2', relation: 'sujeito-verbo' },
          { source: '2', target: '3', relation: 'temporal' },
        ],
      },
      technical_commentary: [
        {
          source: 'F.F. Bruce',
          view: 'O Verbo não teve início, Ele já era no início.',
        },
        {
          source: 'Calvino',
          view: 'A divindade de Cristo é estabelecida por Sua eternidade.',
        },
      ],
      systematic_connection: {
        locus: 'Cristologia',
        explanation: 'Aseidade e eternidade da Segunda Pessoa da Trindade.',
      },
    });
  }

  if (
    lower.includes('predestinação') ||
    lower.includes('livre-arbítrio') ||
    lower.includes('calvinism')
  ) {
    return `## Predestinação vs Livre-Arbítrio

### 📖 Perspectiva Calvinista (Reformada)
A eleição incondicional é central. Deus, antes da fundação do mundo, escolheu soberanamente aqueles que seriam salvos, não com base em méritos previstos, mas segundo Seu propósito eterno.

**Versículos-chave:**
- **Efésios 1:4-5** — "nos escolheu nele antes da fundação do mundo"
- **Romanos 9:11-13** — "para que o propósito de Deus, segundo a eleição, ficasse firme"
- **João 6:44** — "Ninguém pode vir a mim, se o Pai não o trouxer"

### 📖 Perspectiva Arminiana
A graça preveniente capacita todos os seres humanos a aceitar ou rejeitar a salvação. Deus elegeu com base em Sua presciência da fé humana.

**Versículos-chave:**
- **1 Timóteo 2:4** — "que quer que todos os homens se salvem"
- **2 Pedro 3:9** — "não querendo que alguns se percam"
- **João 3:16** — "para que todo aquele que nele crê não pereça"

### 📖 Perspectiva Molinista
Luis de Molina propôs o "conhecimento médio" — Deus conhece todos os cenários possíveis e atualiza aquele em que o máximo de pessoas livremente escolhem a salvação.

### ⚖️ Análise Acadêmica
A tensão entre soberania divina e responsabilidade humana é um dos debates mais antigos da teologia cristã, remontando a Agostinho vs Pelágio (séc. V).

**Grau de Tensão Teológica: 85/100**

---
*Fontes: Institutas (Calvino), Concordia (Molina), Remonstrance (1610)*`;
  }

  if (lower.includes('romanos 9') || lower.includes('romans 9')) {
    return `## Análise Exegética de Romanos 9

### 📜 Contexto Literário
Romanos 9–11 forma uma unidade temática sobre o papel de Israel no plano redentor de Deus. Paulo expressa profunda tristeza pela incredulidade de Israel (9:1-5).

### 📖 Interpretação Calvinista
Os versículos 9-23 demonstram a soberania absoluta de Deus na eleição:
- **v.11-13**: Jacó e Esaú — escolha antes do nascimento
- **v.18**: "tem misericórdia de quem quer, e endurece a quem quer"
- **v.21**: A metáfora do oleiro — direito absoluto do Criador

### 📖 Interpretação Arminiana (Corporate Election)
O capítulo trata da eleição corporativa/nacional, não individual:
- Paulo fala de Israel como **nação**, não indivíduos
- "Odiei a Esaú" refere-se a nações (Malaquias 1:2-3)
- O "endurecimento" de Faraó foi judicial, após suas próprias escolhas

### 📖 Interpretação da Nova Perspectiva sobre Paulo
N.T. Wright e outros argumentam que Romanos 9 trata da fidelidade de Deus à aliança, não de soteriologia individual.

### 🔍 Termos-Chave no Grego
- **ἐκλογή** (eklogē) — eleição/escolha
- **σκεύη ὀργῆς** (skeuē orgēs) — vasos de ira
- **πρόθεσις** (prothesis) — propósito

**Grau de Tensão Teológica: 90/100**`;
  }

  if (
    lower.includes('dons') ||
    lower.includes('espírito') ||
    lower.includes('cessacion')
  ) {
    return `## Dons Espirituais: Cessacionismo vs Continuacionismo

### 📖 Cessacionismo
Os dons milagrosos (línguas, profecia, cura) cessaram com a era apostólica e o fechamento do cânon.

**Defensores:** B.B. Warfield, John MacArthur, R.C. Sproul
**Argumento central:** 1 Coríntios 13:8-10 — "quando vier o que é perfeito" = o cânon completo

### 📖 Continuacionismo
Todos os dons permanecem ativos até a volta de Cristo.

**Defensores:** Wayne Grudem, Sam Storms, John Piper
**Argumento central:** Joel 2:28-29 / Atos 2 — o derramamento do Espírito é para "os últimos dias"

### 📖 Posição Intermediária
Alguns teólogos reformados aceitam a continuação dos dons, mas com regulação bíblica rigorosa.

### 📊 Dados Históricos
- Irineu (130-202 d.C.) relata dons em sua época
- Agostinho inicialmente cessacionista, depois revisou sua posição
- O avivamento da Rua Azusa (1906) impulsionou o pentecostalismo moderno

**Grau de Tensão Teológica: 72/100**`;
  }

  if (
    lower.includes('batismo') ||
    lower.includes('imersão') ||
    lower.includes('aspersão')
  ) {
    return `## Batismo: Aspersão vs Imersão

### 📖 Batismo por Imersão
**Tradições:** Batistas, Pentecostais, Igrejas de Cristo

**Argumentos:**
- **βαπτίζω** (baptizō) = "mergulhar, imergir"
- Romanos 6:3-4 — simbolismo de morte e ressurreição
- Atos 8:38-39 — Filipe e o eunuco "desceram à água"

### 📖 Batismo por Aspersão/Derramamento
**Tradições:** Presbiterianos, Metodistas, Luteranos, Católicos

**Argumentos:**
- Didaquê (70-100 d.C.) permitia derramamento
- O batismo dos 3.000 em Atos 2:41 dificilmente foi por imersão em Jerusalém
- Tipologia: aspersão do sangue no AT (Hebreus 9:13-14)

**Grau de Tensão Teológica: 65/100**`;
  }

  return `## Análise Teológica

Essa é uma questão fundamental na teologia cristã com múltiplas perspectivas históricas.

### 📖 Perspectiva Reformada
A tradição reformada, seguindo João Calvino e os Cânones de Dort (1619), enfatiza a soberania absoluta de Deus. Os cinco pontos do Calvinismo (TULIP) formam o arcabouço desta visão.

### 📖 Perspectiva Arminiana
Jacobus Armínio e seus seguidores propõem que a graça preveniente capacita todos os seres humanos a responder ao evangelho.

### 📖 Perspectiva Batista
A tradição batista é diversa, contendo tanto calvinistas quanto arminianos.

### ⚖️ Consenso
Todas as tradições concordam que:
- A salvação é pela graça
- A fé é essencial
- Cristo é o único mediador

**Grau de Tensão Teológica: 78/100**

---
*Fontes: Institutas da Religião Cristã (Calvino), Remonstrance (1610), Confissão de Fé de Westminster*`;
}
