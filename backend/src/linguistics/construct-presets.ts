import { ConstructPreset } from './construct-search.dto';

export const CONSTRUCT_PRESETS: ConstructPreset[] = [
  {
    id: 'granville-sharp-rule',
    title: 'Regra de Granville Sharp (Deidade de Cristo)',
    language: 'greek',
    description:
      'Artigo Definido + Substantivo (Nominativo) + καί + Substantivo (Nominativo sem artigo).',
    significance:
      'Regra clássica da gramática grega onde dois substantivos singulares conectados por καί, o primeiro precedido de artigo e o segundo sem artigo, referem-se à mesma pessoa. Base gramatical inequívoca para a deidade de Cristo em Tito 2:13 ("nosso grande Deus e Salvador Jesus Cristo") e 2 Pedro 1:1 ("nosso Deus e Salvador Jesus Cristo").',
    sampleRef: 'Tt 2:13',
    distance: 'adjacent',
    blocks: [
      {
        id: 'block-1',
        label: 'Artigo Definido (Nom. Masc.)',
        partOfSpeech: 'T',
        grammaticalCase: 'N',
        number: 'S',
        gender: 'M',
        morphPattern: 'T-NSM',
      },
      {
        id: 'block-2',
        label: '1º Substantivo (Nom. Masc.)',
        partOfSpeech: 'N',
        grammaticalCase: 'N',
        number: 'S',
        gender: 'M',
        morphPattern: 'N-NSM',
      },
      {
        id: 'block-3',
        label: 'Conjunção καί (kai)',
        partOfSpeech: 'C',
        strongId: 'G2532',
      },
      {
        id: 'block-4',
        label: '2º Substantivo (Nom. Masc. s/ artigo)',
        partOfSpeech: 'N',
        grammaticalCase: 'N',
        number: 'S',
        gender: 'M',
        morphPattern: 'N-NSM',
      },
    ],
  },
  {
    id: 'genitive-absolute',
    title: 'Genitivo Absoluto no Grego',
    language: 'greek',
    description: 'Substantivo no Genitivo + Verbo no Particípio Genitivo.',
    significance:
      'Construção sintática grega autônoma que funciona como uma oração subordinada adverbial temporal ("estando ele...", "tendo chegado..."), causal ou concessiva, sem conexão gramatical direta com o sujeito da oração principal.',
    sampleRef: 'Mt 1:18',
    distance: 'adjacent',
    blocks: [
      {
        id: 'block-1',
        label: 'Substantivo no Genitivo',
        partOfSpeech: 'N',
        grammaticalCase: 'G',
      },
      {
        id: 'block-2',
        label: 'Particípio no Genitivo',
        partOfSpeech: 'V',
        mood: 'P',
        grammaticalCase: 'G',
      },
    ],
  },
  {
    id: 'hina-subjunctive-purpose',
    title: 'Cláusula de Propósito: Ἵνα (Hina) + Subjuntivo',
    language: 'greek',
    description: 'Conjunção ἵνα seguida por Verbo no Modo Subjuntivo.',
    significance:
      'A principal construção do grego helenístico para expressar desígnio, finalidade teleológica ou propósito divino da redenção (ex: João 3:16 "...a fim de que todo o que nele crê não pereça...").',
    sampleRef: 'Jo 3:16',
    distance: 'within_3',
    blocks: [
      {
        id: 'block-1',
        label: 'Conjunção ἵνα (G2443)',
        partOfSpeech: 'C',
        strongId: 'G2443',
      },
      {
        id: 'block-2',
        label: 'Verbo no Modo Subjuntivo',
        partOfSpeech: 'V',
        mood: 'S',
      },
    ],
  },
  {
    id: 'articular-infinitive',
    title: 'Infinitivo Articular Grego',
    language: 'greek',
    description:
      'Artigo Definido Grego no Genitivo/Acusativo + Verbo no Infinitivo.',
    significance:
      'Substantivação do verbo de ação. Frequentemente acompanhado de preposição (como εἰς, πρός, μετά, διά) para denotar causa ("por causa de..."), tempo ("depois de...") ou propósito firme ("a fim de...").',
    sampleRef: 'Rm 1:11',
    distance: 'adjacent',
    blocks: [
      {
        id: 'block-1',
        label: 'Artigo Definido',
        partOfSpeech: 'T',
      },
      {
        id: 'block-2',
        label: 'Verbo no Modo Infinitivo',
        partOfSpeech: 'V',
        mood: 'N',
      },
    ],
  },
  {
    id: 'aorist-participle-finite-verb',
    title: 'Particípio Aoristo de Ação Prévia + Verbo Finito',
    language: 'greek',
    description: 'Verbo Particípio Aoristo seguido de Verbo Indicativo.',
    significance:
      'Padrão narrativo dinâmico que estabelece a circunstância preliminar concluída antes que a ação primária ocorra ("tendo visto a estrela, alegraram-se").',
    sampleRef: 'Mt 2:10',
    distance: 'within_3',
    blocks: [
      {
        id: 'block-1',
        label: 'Particípio no Aoristo',
        partOfSpeech: 'V',
        tense: 'A',
        mood: 'P',
      },
      {
        id: 'block-2',
        label: 'Verbo no Modo Indicativo',
        partOfSpeech: 'V',
        mood: 'I',
      },
    ],
  },
];
