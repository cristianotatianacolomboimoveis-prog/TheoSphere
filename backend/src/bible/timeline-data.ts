/**
 * timeline-data.ts — Catálogo Histórico-Cronológico e Exegético da Bíblia (Padrão Accordance/Logos).
 *
 * Mapeia eventos cruciais, monarquia de Judá vs Israel, profetas, impérios contemporâneos
 * e conexões arqueológicas canônicas, cobrindo de ~2000 a.C. até 100 d.C.
 */

export type TimelineEraKey =
  | 'creation_patriarchs'
  | 'exodus_conquest'
  | 'united_kingdom'
  | 'divided_kingdom'
  | 'babylonian_exile'
  | 'post_exilic_restoration'
  | 'intertestamental'
  | 'life_of_christ'
  | 'apostolic_church';

export type TimelineCategory =
  | 'biblical_event'
  | 'king_judah'
  | 'king_israel'
  | 'prophet'
  | 'world_empire'
  | 'archaeology';

export interface TimelinePassageRef {
  bookId: number;
  bookName: string;
  chapter: number;
  startVerse?: number;
  endVerse?: number;
  display: string;
}

export interface TimelineEventItem {
  id: string;
  title: string;
  year: number; // Negativo = a.C., Positivo = d.C.
  yearDisplay: string;
  era: TimelineEraKey;
  eraTitle: string;
  category: TimelineCategory;
  categoryLabel: string;
  summary: string;
  description: string;
  passages: TimelinePassageRef[];
  contemporaryFigures?: string[];
  archaeologicalNotes?: string;
  spiritualAssessment?: 'faithful' | 'unfaithful' | 'neutral';
}

export interface TimelineEraDefinition {
  key: TimelineEraKey;
  title: string;
  periodDisplay: string;
  startYear: number;
  endYear: number;
  description: string;
}

export const TIMELINE_ERAS: TimelineEraDefinition[] = [
  {
    key: 'creation_patriarchs',
    title: 'Criação e Era dos Patriarcas',
    periodDisplay: '~2100 – 1800 a.C.',
    startYear: -2100,
    endYear: -1800,
    description: 'A chamada de Abraão, Isaque, Jacó e José no Egito.',
  },
  {
    key: 'exodus_conquest',
    title: 'Êxodo, Deserto e Conquista de Canaã',
    periodDisplay: '~1446 / 1250 – 1050 a.C.',
    startYear: -1446,
    endYear: -1050,
    description:
      'A libertação do Egito por Moisés, a Lei no Sinai, Josué e a época dos Juízes.',
  },
  {
    key: 'united_kingdom',
    title: 'Reino Unido de Israel',
    periodDisplay: '~1050 – 930 a.C.',
    startYear: -1050,
    endYear: -930,
    description:
      'O início da monarquia sob Saul, a dinastia de Davi e a glória do Templo de Salomão.',
  },
  {
    key: 'divided_kingdom',
    title: 'Monarquia Dividida e os Grandes Profetas',
    periodDisplay: '930 – 586 a.C.',
    startYear: -930,
    endYear: -586,
    description:
      'Reino do Sul (Judá) e Reino do Norte (Israel), ascensão da Assíria e Babilônia.',
  },
  {
    key: 'babylonian_exile',
    title: 'O Exílio Babilônico',
    periodDisplay: '586 – 538 a.C.',
    startYear: -586,
    endYear: -538,
    description:
      'A queda de Jerusalém, destruição do Templo e os ministérios de Daniel e Ezequiel na Babilônia.',
  },
  {
    key: 'post_exilic_restoration',
    title: 'Restauração Pós-Exílica e Segundo Templo',
    periodDisplay: '538 – 400 a.C.',
    startYear: -538,
    endYear: -400,
    description:
      'O Decreto de Ciro, reconstrução do Templo por Zorobabel, reformas de Esdras e Neemias.',
  },
  {
    key: 'intertestamental',
    title: 'Período Intertestamentário',
    periodDisplay: '400 – 4 a.C.',
    startYear: -400,
    endYear: -4,
    description:
      'Domínio Persa, Conquista Grega por Alexandre, Revolta Macabeia e Ocupação Romana.',
  },
  {
    key: 'life_of_christ',
    title: 'Vida e Ministério de Jesus Cristo',
    periodDisplay: '~4 a.C. – 30/33 d.C.',
    startYear: -4,
    endYear: 33,
    description:
      'Encarnação, ministério público, morte vicária, ressurreição e ascensão do Messias.',
  },
  {
    key: 'apostolic_church',
    title: 'A Igreja Apostólica e Expansão Primitiva',
    periodDisplay: '30 – 100 d.C.',
    startYear: 30,
    endYear: 100,
    description:
      'Pentecostes, viagens missionárias de Paulo, cartas apostólicas e a queda de Jerusalém em 70 d.C.',
  },
];

export const TIMELINE_EVENTS: TimelineEventItem[] = [
  // ── 1. Patriarcas ──
  {
    id: 'abraham-call',
    title: 'O Chamado de Abraão e a Aliança Abraâmica',
    year: -2091,
    yearDisplay: 'c. 2091 a.C.',
    era: 'creation_patriarchs',
    eraTitle: 'Criação e Era dos Patriarcas',
    category: 'biblical_event',
    categoryLabel: 'Evento Bíblico',
    summary:
      'Deus chama Abrão para sair de Ur dos Caldeus rumo a Canaã com promessa de descendência e bênção a todas as famílias da terra.',
    description:
      'O marco fundamental da história da redenção. Deus sela a aliança incondicional de que em sua descendência todas as nações seriam abençoadas (Gn 12:1-3; 15:1-18).',
    passages: [
      {
        bookId: 1,
        bookName: 'Gênesis',
        chapter: 12,
        startVerse: 1,
        endVerse: 9,
        display: 'Gn 12:1-9',
      },
      {
        bookId: 1,
        bookName: 'Gênesis',
        chapter: 15,
        startVerse: 1,
        endVerse: 21,
        display: 'Gn 15:1-21',
      },
      {
        bookId: 48,
        bookName: 'Gálatas',
        chapter: 3,
        startVerse: 6,
        endVerse: 9,
        display: 'Gl 3:6-9',
      },
    ],
    contemporaryFigures: ['Sara', 'Ló', 'Melquisedeque'],
    archaeologicalNotes:
      'Escavações de Ur na Mesopotâmia por Leonard Woolley confirmaram a alta sofisticação urbana da civilização suméria contemporânea a Abraão.',
  },
  {
    id: 'joseph-in-egypt',
    title: 'José Governa no Egito e a Descida de Jacó',
    year: -1876,
    yearDisplay: 'c. 1876 a.C.',
    era: 'creation_patriarchs',
    eraTitle: 'Criação e Era dos Patriarcas',
    category: 'biblical_event',
    categoryLabel: 'Evento Bíblico',
    summary:
      'Vendido como escravo, José é elevado a grão-vizir do Egito e preserva a família da aliança durante a grande fome.',
    description:
      'Providência soberana de Deus: "Vós, na verdade, intentastes o mal contra mim; porém Deus o tornou em bem, para fazer como se vê neste dia" (Gn 50:20).',
    passages: [
      {
        bookId: 1,
        bookName: 'Gênesis',
        chapter: 37,
        startVerse: 1,
        endVerse: 36,
        display: 'Gn 37:1-36',
      },
      {
        bookId: 1,
        bookName: 'Gênesis',
        chapter: 41,
        startVerse: 37,
        endVerse: 57,
        display: 'Gn 41:37-57',
      },
      {
        bookId: 1,
        bookName: 'Gênesis',
        chapter: 50,
        startVerse: 15,
        endVerse: 26,
        display: 'Gn 50:15-26',
      },
    ],
    contemporaryFigures: ['Faraó', 'Jacó / Israel', 'Judá'],
  },

  // ── 2. Êxodo e Conquista ──
  {
    id: 'the-exodus',
    title: 'O Êxodo do Egito e a Instituição da Páscoa',
    year: -1446,
    yearDisplay: 'c. 1446 a.C.',
    era: 'exodus_conquest',
    eraTitle: 'Êxodo, Deserto e Conquista de Canaã',
    category: 'biblical_event',
    categoryLabel: 'Evento Bíblico',
    summary:
      'Libertação sobrenatural de Israel por meio de Moisés após as dez pragas e abertura do Mar Vermelho.',
    description:
      'O maior ato redentor do Antigo Testamento, tipológico da redenção em Cristo. Instituição da Páscoa judaica e a entrega da Aliança Mosaica e dos Dez Mandamentos no Monte Sinai.',
    passages: [
      {
        bookId: 2,
        bookName: 'Êxodo',
        chapter: 12,
        startVerse: 1,
        endVerse: 36,
        display: 'Êx 12:1-36',
      },
      {
        bookId: 2,
        bookName: 'Êxodo',
        chapter: 14,
        startVerse: 10,
        endVerse: 31,
        display: 'Êx 14:10-31',
      },
      {
        bookId: 2,
        bookName: 'Êxodo',
        chapter: 20,
        startVerse: 1,
        endVerse: 17,
        display: 'Êx 20:1-17',
      },
    ],
    contemporaryFigures: ['Moisés', 'Arão', 'Miriã', 'Josué'],
  },
  {
    id: 'conquest-of-canaan',
    title: 'Josué e a Conquista de Jericó e Canaã',
    year: -1406,
    yearDisplay: 'c. 1406 a.C.',
    era: 'exodus_conquest',
    eraTitle: 'Êxodo, Deserto e Conquista de Canaã',
    category: 'biblical_event',
    categoryLabel: 'Evento Bíblico',
    summary:
      'A travessia do Jordão a seco, queda das muralhas de Jericó e divisão da terra prometida entre as doze tribos.',
    description:
      'Cumprimento da promessa de posse territorial sob a liderança de Josué: "Sê forte e corajoso; não temas, nem te espantes" (Js 1:9).',
    passages: [
      {
        bookId: 6,
        bookName: 'Josué',
        chapter: 3,
        startVerse: 1,
        endVerse: 17,
        display: 'Js 3:1-17',
      },
      {
        bookId: 6,
        bookName: 'Josué',
        chapter: 6,
        startVerse: 1,
        endVerse: 27,
        display: 'Js 6:1-27',
      },
      {
        bookId: 6,
        bookName: 'Josué',
        chapter: 24,
        startVerse: 14,
        endVerse: 28,
        display: 'Js 24:14-28',
      },
    ],
    contemporaryFigures: ['Josué', 'Calebe', 'Raabe'],
    archaeologicalNotes:
      'Muralhas de Jericó (Tell es-Sultan) e a Estela de Merneptá (c. 1208 a.C.), a mais antiga menção extrabíblica explícita ao povo de "Israel" em Canaã.',
  },

  // ── 3. Reino Unido ──
  {
    id: 'reign-of-david',
    title: 'Reinado do Rei Davi e a Aliança Davídica',
    year: -1010,
    yearDisplay: 'c. 1010 – 970 a.C.',
    era: 'united_kingdom',
    eraTitle: 'Reino Unido de Israel',
    category: 'king_judah',
    categoryLabel: 'Monarquia Unida',
    spiritualAssessment: 'faithful',
    summary:
      'Davi unifica as doze tribos, conquista Jerusalém tornando-a capital e recebe a promessa de um trono eterno.',
    description:
      'O homem segundo o coração de Deus. Deus estabelece a Aliança Davídica (2 Sm 7): a linhagem de Davi reinará eternamente, culminando no Messias Jesus.',
    passages: [
      {
        bookId: 10,
        bookName: '2 Samuel',
        chapter: 5,
        startVerse: 1,
        endVerse: 10,
        display: '2 Sm 5:1-10',
      },
      {
        bookId: 10,
        bookName: '2 Samuel',
        chapter: 7,
        startVerse: 8,
        endVerse: 16,
        display: '2 Sm 7:8-16',
      },
      {
        bookId: 19,
        bookName: 'Salmos',
        chapter: 23,
        startVerse: 1,
        endVerse: 6,
        display: 'Sl 23:1-6',
      },
    ],
    contemporaryFigures: ['Natã', 'Gade', 'Joabe', 'Bate-Seba'],
    archaeologicalNotes:
      'A Estela de Tel Dã (século IX a.C.) registra a vitória arameia sobre um rei da "Casa de Davi" (Byt Dwd), corroborando a historicidade da dinastia davídica.',
  },
  {
    id: 'solomon-temple',
    title: 'Salomão Dedica o Primeiro Templo de Jerusalém',
    year: -966,
    yearDisplay: 'c. 966 – 959 a.C.',
    era: 'united_kingdom',
    eraTitle: 'Reino Unido de Israel',
    category: 'biblical_event',
    categoryLabel: 'Evento Bíblico',
    summary:
      'Construção e consagração do suntuoso Templo no Monte Moriá com a glória do Senhor enchendo a casa.',
    description:
      'Salomão lidera Israel na era de ouro de sabedoria, riqueza e paz. Dedicação da Casa de Deus: o fogo do céu desce e a glória de Yahweh enche o templo (1 Rs 8; 2 Cr 7).',
    passages: [
      {
        bookId: 11,
        bookName: '1 Reis',
        chapter: 6,
        startVerse: 1,
        endVerse: 38,
        display: '1 Rs 6:1-38',
      },
      {
        bookId: 11,
        bookName: '1 Reis',
        chapter: 8,
        startVerse: 22,
        endVerse: 53,
        display: '1 Rs 8:22-53',
      },
      {
        bookId: 14,
        bookName: '2 Crônicas',
        chapter: 7,
        startVerse: 1,
        endVerse: 3,
        display: '2 Cr 7:1-3',
      },
    ],
    contemporaryFigures: ['Salomão', 'Hirão de Tiro', 'Rainha de Sabá'],
  },

  // ── 4. Monarquia Dividida (Judá × Israel) & Profetas ──
  {
    id: 'kingdom-division',
    title: 'A Divisão do Reino: Judá (Roboão) × Israel (Jeroboão I)',
    year: -930,
    yearDisplay: '930 a.C.',
    era: 'divided_kingdom',
    eraTitle: 'Monarquia Dividida e os Grandes Profetas',
    category: 'biblical_event',
    categoryLabel: 'Evento Bíblico',
    summary:
      'Após a morte de Salomão e a intransigência de Roboão, as dez tribos do norte se separam sob Jeroboão I.',
    description:
      'Início da era dos dois reinos: Reino do Sul (Judá e Benjamim, capital Jerusalém) e Reino do Norte (10 tribos, capital Samaria). Jeroboão introduz os bezerros de ouro em Dã e Betel, estabelecendo o pecado que condenou o norte.',
    passages: [
      {
        bookId: 11,
        bookName: '1 Reis',
        chapter: 12,
        startVerse: 1,
        endVerse: 33,
        display: '1 Rs 12:1-33',
      },
      {
        bookId: 14,
        bookName: '2 Crônicas',
        chapter: 10,
        startVerse: 1,
        endVerse: 19,
        display: '2 Cr 10:1-19',
      },
    ],
    contemporaryFigures: ['Roboão', 'Jeroboão I', 'Aías de Siló'],
  },
  {
    id: 'elias-mount-carmel',
    title: 'Elias Desafia os Profetas de Baal no Monte Carmelo',
    year: -860,
    yearDisplay: 'c. 860 a.C.',
    era: 'divided_kingdom',
    eraTitle: 'Monarquia Dividida e os Grandes Profetas',
    category: 'prophet',
    categoryLabel: 'Profeta',
    spiritualAssessment: 'faithful',
    summary:
      'O fogo do Senhor consome o holocausto encharcado provando que "O Senhor é Deus!" perante o rei Acabe e Jezabel.',
    description:
      'No auge da apostasia de Israel sob o rei Acabe e a rainha sidônia Jezabel, Elias confronta 450 profetas de Baal. Fogo desce do céu e o povo se prostra.',
    passages: [
      {
        bookId: 11,
        bookName: '1 Reis',
        chapter: 18,
        startVerse: 17,
        endVerse: 40,
        display: '1 Rs 18:17-40',
      },
      {
        bookId: 11,
        bookName: '1 Reis',
        chapter: 19,
        startVerse: 1,
        endVerse: 18,
        display: '1 Rs 19:1-18',
      },
    ],
    contemporaryFigures: [
      'Acabe (Rei de Israel)',
      'Jezabel',
      'Obadias',
      'Eliseu',
    ],
  },
  {
    id: 'king-ahab-israel',
    title: 'Rei Acabe e Jezabel em Israel',
    year: -874,
    yearDisplay: '874 – 853 a.C.',
    era: 'divided_kingdom',
    eraTitle: 'Monarquia Dividida e os Grandes Profetas',
    category: 'king_israel',
    categoryLabel: 'Rei de Israel (Norte)',
    spiritualAssessment: 'unfaithful',
    summary:
      'Governante militarmente forte, mas teologicamente apóstata, promovendo o culto a Baal.',
    description:
      'Pior rei de Israel até então: "Acabe fez o que era mau perante o Senhor mais do que todos os que foram antes dele" (1 Rs 16:30).',
    passages: [
      {
        bookId: 11,
        bookName: '1 Reis',
        chapter: 16,
        startVerse: 29,
        endVerse: 34,
        display: '1 Rs 16:29-34',
      },
      {
        bookId: 11,
        bookName: '1 Reis',
        chapter: 21,
        startVerse: 1,
        endVerse: 29,
        display: '1 Rs 21:1-29',
      },
    ],
    contemporaryFigures: ['Josafá (Rei de Judá)', 'Elias', 'Jezabel'],
    archaeologicalNotes:
      'O Monólito de Curque (Salmaneser III da Assíria, 853 a.C.) cita "Acabe o israelita" enviando 2.000 carros de guerra na Batalha de Carcar.',
  },
  {
    id: 'king-jehoshaphat-judah',
    title: 'Rei Josafá de Judá e a Reforma Judicial',
    year: -872,
    yearDisplay: '872 – 848 a.C.',
    era: 'divided_kingdom',
    eraTitle: 'Monarquia Dividida e os Grandes Profetas',
    category: 'king_judah',
    categoryLabel: 'Rei de Judá (Sul)',
    spiritualAssessment: 'faithful',
    summary:
      'Rei piedoso que enviou mestres da Lei por todas as cidades e confiou no louvor para vencer a grande coalizão inimiga.',
    description:
      'Destaque para sua oração em 2 Cr 20:12: "Porque em nós não há força perante esta grande multidão... porém os nossos olhos estão postos em ti".',
    passages: [
      {
        bookId: 11,
        bookName: '1 Reis',
        chapter: 22,
        startVerse: 41,
        endVerse: 50,
        display: '1 Rs 22:41-50',
      },
      {
        bookId: 14,
        bookName: '2 Crônicas',
        chapter: 19,
        startVerse: 4,
        endVerse: 11,
        display: '2 Cr 19:4-11',
      },
      {
        bookId: 14,
        bookName: '2 Crônicas',
        chapter: 20,
        startVerse: 1,
        endVerse: 30,
        display: '2 Cr 20:1-30',
      },
    ],
    contemporaryFigures: ['Acabe', 'Acazias', 'Jorão de Israel'],
  },
  {
    id: 'fall-of-samaria',
    title: 'A Queda de Samaria e o Fim do Reino do Norte',
    year: -722,
    yearDisplay: '722 a.C.',
    era: 'divided_kingdom',
    eraTitle: 'Monarquia Dividida e os Grandes Profetas',
    category: 'world_empire',
    categoryLabel: 'Império Mundial (Assíria)',
    summary:
      'A Assíria sob Sargão II conquista Samaria após 3 anos de cerco e deporta as 10 tribos de Israel.',
    description:
      'Juízo divino sobre a persistente idolatria do Reino do Norte desde Jeroboão I. As dez tribos são espalhadas pelo império assírio e gentios são assentados em Samaria (origem dos samaritanos).',
    passages: [
      {
        bookId: 12,
        bookName: '2 Reis',
        chapter: 17,
        startVerse: 1,
        endVerse: 23,
        display: '2 Rs 17:1-23',
      },
      {
        bookId: 28,
        bookName: 'Oseias',
        chapter: 13,
        startVerse: 1,
        endVerse: 16,
        display: 'Os 13:1-16',
      },
    ],
    contemporaryFigures: [
      'Oseias (Último Rei de Israel)',
      'Sargão II (Assíria)',
      'Ezequias (Judá)',
    ],
    archaeologicalNotes:
      'Inscrições no Palácio de Corsabade de Sargão II confirmam a captura de Samaria e deportação de 27.290 habitantes.',
  },
  {
    id: 'king-hezekiah-and-isaiah',
    title:
      'Rei Ezequias, Isaías e a Libertação de Jerusalém do Cerco de Senaqueribe',
    year: -701,
    yearDisplay: '701 a.C.',
    era: 'divided_kingdom',
    eraTitle: 'Monarquia Dividida e os Grandes Profetas',
    category: 'king_judah',
    categoryLabel: 'Rei de Judá (Sul)',
    spiritualAssessment: 'faithful',
    summary:
      'Ezequias purifica o culto, confia na palavra do profeta Isaías e o Anjo do Senhor aniquila 185.000 soldados assírios.',
    description:
      'Momento decisivo da história de Judá. O rei assírio Senaqueribe sitia Jerusalém e zomba de Yahweh. Ezequias estende a carta ameaçadora no Templo; o profeta Isaías profetiza a salvação da cidade.',
    passages: [
      {
        bookId: 12,
        bookName: '2 Reis',
        chapter: 18,
        startVerse: 1,
        endVerse: 37,
        display: '2 Rs 18:1-37',
      },
      {
        bookId: 12,
        bookName: '2 Reis',
        chapter: 19,
        startVerse: 14,
        endVerse: 37,
        display: '2 Rs 19:14-37',
      },
      {
        bookId: 23,
        bookName: 'Isaías',
        chapter: 37,
        startVerse: 1,
        endVerse: 38,
        display: 'Is 37:1-38',
      },
    ],
    contemporaryFigures: ['Ezequias', 'Isaías', 'Senaqueribe', 'Rabsaqué'],
    archaeologicalNotes:
      'O Prisma de Senaqueribe (Taylor Prism) declara: "Quanto a Ezequias o judeu, tranquei-o em Jerusalém como um pássaro na gaiola", admitindo implicitamente que não conseguiu conquistar a cidade. O Túnel de Siloé (inscrição hebraica de Ezequias) ainda pode ser percorrido em Jerusalém.',
  },
  {
    id: 'prophet-isaiah',
    title: 'O Ministério Messiânico do Profeta Isaías',
    year: -740,
    yearDisplay: 'c. 740 – 681 a.C.',
    era: 'divided_kingdom',
    eraTitle: 'Monarquia Dividida e os Grandes Profetas',
    category: 'prophet',
    categoryLabel: 'Profeta',
    spiritualAssessment: 'faithful',
    summary:
      'O "Quinto Evangelista": profecias da concepção virginal de Emanuel e do Servo Sofredor.',
    description:
      'Visão da santidade de Deus no Templo (Is 6). Previsão explícita do nascimento virginal do Emanuel (Is 7:14; 9:6) e da expiação vicária de Cristo no Calvário (Is 53).',
    passages: [
      {
        bookId: 23,
        bookName: 'Isaías',
        chapter: 6,
        startVerse: 1,
        endVerse: 13,
        display: 'Is 6:1-13',
      },
      {
        bookId: 23,
        bookName: 'Isaías',
        chapter: 9,
        startVerse: 1,
        endVerse: 7,
        display: 'Is 9:1-7',
      },
      {
        bookId: 23,
        bookName: 'Isaías',
        chapter: 53,
        startVerse: 1,
        endVerse: 12,
        display: 'Is 53:1-12',
      },
    ],
    contemporaryFigures: ['Uzias', 'Jotão', 'Acaz', 'Ezequias', 'Miqueias'],
    archaeologicalNotes:
      'O Grande Rolo de Isaías (1QIsa) encontrado em Qumran (Mar Morto), datado do séc. II a.C., contém os 66 capítulos idênticos ao texto massorético.',
  },
  {
    id: 'king-josiah-reformation',
    title: 'Rei Josias e a Descoberta do Livro da Lei no Templo',
    year: -622,
    yearDisplay: '622 a.C.',
    era: 'divided_kingdom',
    eraTitle: 'Monarquia Dividida e os Grandes Profetas',
    category: 'king_judah',
    categoryLabel: 'Rei de Judá (Sul)',
    spiritualAssessment: 'faithful',
    summary:
      'A última grande reforma e celebração da Páscoa após o sumo sacerdote Hilquias achar o rolo da Lei.',
    description:
      'Josias rasga as vestes em arrependimento e destrói todos os altares idólatras em Judá e Betel. O profeta Jeremias inicia seu ministério no reinado de Josias.',
    passages: [
      {
        bookId: 12,
        bookName: '2 Reis',
        chapter: 22,
        startVerse: 1,
        endVerse: 20,
        display: '2 Rs 22:1-20',
      },
      {
        bookId: 12,
        bookName: '2 Reis',
        chapter: 23,
        startVerse: 1,
        endVerse: 25,
        display: '2 Rs 23:1-25',
      },
      {
        bookId: 24,
        bookName: 'Jeremias',
        chapter: 1,
        startVerse: 1,
        endVerse: 3,
        display: 'Jr 1:1-3',
      },
    ],
    contemporaryFigures: ['Hilquias', 'Safã', 'Hulda', 'Jeremias', 'Sofonias'],
  },

  // ── 5. Exílio Babilônico ──
  {
    id: 'fall-of-jerusalem',
    title:
      'A Queda de Jerusalém e Destruição do Primeiro Templo por Nabucodonosor',
    year: -586,
    yearDisplay: '586 a.C.',
    era: 'babylonian_exile',
    eraTitle: 'O Exílio Babilônico',
    category: 'world_empire',
    categoryLabel: 'Império Mundial (Babilônia)',
    summary:
      'Cerco babilônico, queima do Templo de Salomão, destruição das muralhas e exílio de Judá para a Babilônia.',
    description:
      'O dia mais doloroso da história judaica até então. O profeta Jeremias chora a desolação em Lamentações. Fim da monarquia davídica terrena em Jerusalém.',
    passages: [
      {
        bookId: 12,
        bookName: '2 Reis',
        chapter: 25,
        startVerse: 1,
        endVerse: 21,
        display: '2 Rs 25:1-21',
      },
      {
        bookId: 24,
        bookName: 'Jeremias',
        chapter: 39,
        startVerse: 1,
        endVerse: 10,
        display: 'Jr 39:1-10',
      },
      {
        bookId: 25,
        bookName: 'Lamentações',
        chapter: 1,
        startVerse: 1,
        endVerse: 6,
        display: 'Lm 1:1-6',
      },
    ],
    contemporaryFigures: [
      'Zedequias (Último Rei de Judá)',
      'Nabucodonosor II',
      'Jeremias',
      'Nebuzaradã',
    ],
    archaeologicalNotes:
      'Camada de cinzas de queimada babilônica e pontas de flechas encontradas na Cidade de Davi em Jerusalém.',
  },
  {
    id: 'daniel-in-babylon',
    title: 'Daniel e a Visão das Quatro Feras e dos Quatro Impérios',
    year: -553,
    yearDisplay: 'c. 605 – 536 a.C.',
    era: 'babylonian_exile',
    eraTitle: 'O Exílio Babilônico',
    category: 'prophet',
    categoryLabel: 'Profeta',
    spiritualAssessment: 'faithful',
    summary:
      'Daniel interpreta o sonho da estátua e profetiza a sucessão de Babilônia, Pérsia, Grécia e Roma até o Reino Messiânico.',
    description:
      'Fidelidade irredutível na corte pagã (cova dos leões, fornalha de fogo). Revelação detalhada do plano escatológico e dos tempos dos gentios.',
    passages: [
      {
        bookId: 27,
        bookName: 'Daniel',
        chapter: 2,
        startVerse: 31,
        endVerse: 45,
        display: 'Dn 2:31-45',
      },
      {
        bookId: 27,
        bookName: 'Daniel',
        chapter: 7,
        startVerse: 1,
        endVerse: 14,
        display: 'Dn 7:1-14',
      },
      {
        bookId: 27,
        bookName: 'Daniel',
        chapter: 9,
        startVerse: 24,
        endVerse: 27,
        display: 'Dn 9:24-27',
      },
    ],
    contemporaryFigures: [
      'Nabucodonosor',
      'Belsazar',
      'Dario o Medo',
      'Ciro o Grande',
    ],
  },

  // ── 6. Restauração Pós-Exílica ──
  {
    id: 'cyrus-decree',
    title: 'O Decreto de Ciro o Grande e o Retorno dos Exilados',
    year: -538,
    yearDisplay: '538 a.C.',
    era: 'post_exilic_restoration',
    eraTitle: 'Restauração Pós-Exílica e Segundo Templo',
    category: 'world_empire',
    categoryLabel: 'Império Mundial (Pérsia)',
    summary:
      'Ciro, rei da Pérsia, autoriza o regresso dos judeus a Jerusalém e ordena a reconstrução da Casa de Deus.',
    description:
      'Cumprimento exato da profecia de Jeremias (70 anos de exílio) e de Isaías (que chamou Ciro por nome 150 anos antes em Is 44:28; 45:1). Zorobabel lidera a primeira leva com 42.360 judeus.',
    passages: [
      {
        bookId: 15,
        bookName: 'Esdras',
        chapter: 1,
        startVerse: 1,
        endVerse: 11,
        display: 'Ed 1:1-11',
      },
      {
        bookId: 14,
        bookName: '2 Crônicas',
        chapter: 36,
        startVerse: 22,
        endVerse: 23,
        display: '2 Cr 36:22-23',
      },
    ],
    contemporaryFigures: [
      'Ciro o Grande',
      'Zorobabel',
      'Jesua / Josué (Sumo Sacerdote)',
    ],
    archaeologicalNotes:
      'O Cilindro de Ciro (Museu Britânico, argila cuneiforme babilônica de 539 a.C.) registra a política de Ciro de libertar povos subjugados e devolver suas divindades aos seus santuários originais.',
  },
  {
    id: 'second-temple-dedicated',
    title: 'Dedicação do Segundo Templo sob Ageu e Zacarias',
    year: -516,
    yearDisplay: '516 a.C.',
    era: 'post_exilic_restoration',
    eraTitle: 'Restauração Pós-Exílica e Segundo Templo',
    category: 'biblical_event',
    categoryLabel: 'Evento Bíblico',
    summary:
      'Após o desânimo e a oposição dos samaritanos, os profetas Ageu e Zacarias motivam a conclusão da Casa de Deus.',
    description:
      'Exatamente 70 anos após a destruição do Templo de Salomão (586-516 a.C.). Ageu profetiza: "A glória desta última casa será maior do que a da primeira" (Ag 2:9), pois o próprio Messias entraria nela.',
    passages: [
      {
        bookId: 15,
        bookName: 'Esdras',
        chapter: 6,
        startVerse: 13,
        endVerse: 22,
        display: 'Ed 6:13-22',
      },
      {
        bookId: 37,
        bookName: 'Ageu',
        chapter: 2,
        startVerse: 1,
        endVerse: 9,
        display: 'Ag 2:1-9',
      },
      {
        bookId: 38,
        bookName: 'Zacarias',
        chapter: 4,
        startVerse: 6,
        endVerse: 10,
        display: 'Zc 4:6-10',
      },
    ],
    contemporaryFigures: ['Dario I', 'Zorobabel', 'Josué', 'Ageu', 'Zacarias'],
  },
  {
    id: 'ezra-and-nehemiah',
    title: 'Neemias Reconstrói os Muros de Jerusalém e Esdras Lê a Lei',
    year: -445,
    yearDisplay: '445 a.C.',
    era: 'post_exilic_restoration',
    eraTitle: 'Restauração Pós-Exílica e Segundo Templo',
    category: 'biblical_event',
    categoryLabel: 'Evento Bíblico',
    spiritualAssessment: 'faithful',
    summary:
      'Em apenas 52 dias os muros de Jerusalém são reerguidos perante intensa oposição de Sambalate e Tobias.',
    description:
      'Neemias governa com liderança exemplar enquanto Esdras, o escriba, traz o grande despertamento espiritual com a leitura pública da Torá na Porta das Águas.',
    passages: [
      {
        bookId: 16,
        bookName: 'Neemias',
        chapter: 2,
        startVerse: 1,
        endVerse: 8,
        display: 'Ne 2:1-8',
      },
      {
        bookId: 16,
        bookName: 'Neemias',
        chapter: 6,
        startVerse: 15,
        endVerse: 16,
        display: 'Ne 6:15-16',
      },
      {
        bookId: 16,
        bookName: 'Neemias',
        chapter: 8,
        startVerse: 1,
        endVerse: 12,
        display: 'Ne 8:1-12',
      },
    ],
    contemporaryFigures: [
      'Artaxerxes I (Pérsia)',
      'Esdras',
      'Neemias',
      'Malaquias',
    ],
  },

  // ── 7. Período Intertestamentário ──
  {
    id: 'alexander-the-great-conquest',
    title: 'Alexandre o Grande Conquista a Judeia e o Oriente',
    year: -332,
    yearDisplay: '332 a.C.',
    era: 'intertestamental',
    eraTitle: 'Período Intertestamentário',
    category: 'world_empire',
    categoryLabel: 'Império Mundial (Grécia)',
    summary:
      'A expansão macedônia substitui o Império Persa e difunde a língua e cultura grega (helenismo) por todo o mundo mediterrâneo.',
    description:
      'Adoção universal da língua grega (Koiné), que preparou o caminho para a tradução da Septuaginta (LXX) e a posterior proclamação dos Evangelhos e das Epístolas por todo o Império.',
    passages: [
      {
        bookId: 27,
        bookName: 'Daniel',
        chapter: 8,
        startVerse: 5,
        endVerse: 8,
        display: 'Dn 8:5-8',
      },
      {
        bookId: 27,
        bookName: 'Daniel',
        chapter: 11,
        startVerse: 2,
        endVerse: 4,
        display: 'Dn 11:2-4',
      },
    ],
    contemporaryFigures: ['Alexandre o Grande', 'Jadua (Sumo Sacerdote)'],
  },
  {
    id: 'maccabean-revolt-hanukkah',
    title: 'A Revolta Macabeia e a Purificação do Templo (Origem do Hanukkah)',
    year: -167,
    yearDisplay: '167 – 164 a.C.',
    era: 'intertestamental',
    eraTitle: 'Período Intertestamentário',
    category: 'biblical_event',
    categoryLabel: 'Evento Histórico / Bíblico',
    summary:
      'Antíoco IV Epifânio profana o Templo sacrificando uma porca sobre o altar; Judas Macabeu lidera a insurreição e rededica o santuário.',
    description:
      'Cumprimento de Daniel 8 e 11 ("a abominação da desolação" do período grego). Instituição da Festa da Dedicação (Hanukkah), celebrada inclusive por Jesus em João 10:22.',
    passages: [
      {
        bookId: 27,
        bookName: 'Daniel',
        chapter: 11,
        startVerse: 31,
        endVerse: 32,
        display: 'Dn 11:31-32',
      },
      {
        bookId: 43,
        bookName: 'João',
        chapter: 10,
        startVerse: 22,
        endVerse: 23,
        display: 'Jo 10:22-23',
      },
    ],
    contemporaryFigures: ['Matatias', 'Judas Macabeu', 'Antíoco IV Epifânio'],
  },
  {
    id: 'pompey-takes-jerusalem',
    title: 'O General Romano Pompeu Conquista Jerusalém',
    year: -63,
    yearDisplay: '63 a.C.',
    era: 'intertestamental',
    eraTitle: 'Período Intertestamentário',
    category: 'world_empire',
    categoryLabel: 'Império Mundial (Roma)',
    summary:
      'A República Romana assume o controle da Judeia após a guerra civil asmoneia; Pompeu invade o Santo dos Santos.',
    description:
      'Início da dominação romana direta, preparando o cenário geopolítico da vinda de Cristo, a Pax Romana e a rede de estradas romanas.',
    passages: [
      {
        bookId: 40,
        bookName: 'Mateus',
        chapter: 22,
        startVerse: 17,
        endVerse: 21,
        display: 'Mt 22:17-21',
      },
      {
        bookId: 42,
        bookName: 'Lucas',
        chapter: 2,
        startVerse: 1,
        endVerse: 3,
        display: 'Lc 2:1-3',
      },
    ],
    contemporaryFigures: [
      'Pompeu',
      'Júlio César',
      'Hircano II',
      'Herodes o Grande',
    ],
  },

  // ── 8. Vida de Cristo ──
  {
    id: 'birth-of-christ-timeline',
    title: 'O Nascimento de Jesus Cristo em Belém',
    year: -4,
    yearDisplay: 'c. 5 – 4 a.C.',
    era: 'life_of_christ',
    eraTitle: 'Vida e Ministério de Jesus Cristo',
    category: 'biblical_event',
    categoryLabel: 'Evento Bíblico',
    summary:
      'O Verbo se faz carne no reinado de Herodes o Grande e de César Augusto.',
    description:
      '"Mas, vindo a plenitude dos tempos, Deus enviou seu Filho, nascido de mulher, nascido sob a lei" (Gl 4:4).',
    passages: [
      {
        bookId: 40,
        bookName: 'Mateus',
        chapter: 1,
        startVerse: 18,
        endVerse: 25,
        display: 'Mt 1:18-25',
      },
      {
        bookId: 42,
        bookName: 'Lucas',
        chapter: 2,
        startVerse: 1,
        endVerse: 20,
        display: 'Lc 2:1-20',
      },
      {
        bookId: 48,
        bookName: 'Gálatas',
        chapter: 4,
        startVerse: 4,
        endVerse: 5,
        display: 'Gl 4:4-5',
      },
    ],
    contemporaryFigures: [
      'César Augusto',
      'Herodes o Grande',
      'Maria',
      'José',
      'João Batista',
    ],
  },
  {
    id: 'crucifixion-resurrection-christ',
    title: 'A Crucificação e Ressurreição Gloriosa de Jesus Cristo',
    year: 30,
    yearDisplay: '30 / 33 d.C.',
    era: 'life_of_christ',
    eraTitle: 'Vida e Ministério de Jesus Cristo',
    category: 'biblical_event',
    categoryLabel: 'Evento Bíblico',
    spiritualAssessment: 'faithful',
    summary:
      'A consumação da expiação vicária na cruz, vitória sobre o pecado e a morte e a ressurreição ao terceiro dia.',
    description:
      'O evento central de toda a história humana. Jesus morre sob Pôncio Pilatos no dia de Páscoa e ressuscita, inaugurando a Nova Aliança.',
    passages: [
      {
        bookId: 40,
        bookName: 'Mateus',
        chapter: 27,
        startVerse: 32,
        endVerse: 56,
        display: 'Mt 27:32-56',
      },
      {
        bookId: 40,
        bookName: 'Mateus',
        chapter: 28,
        startVerse: 1,
        endVerse: 20,
        display: 'Mt 28:1-20',
      },
      {
        bookId: 46,
        bookName: '1 Coríntios',
        chapter: 15,
        startVerse: 3,
        endVerse: 8,
        display: '1 Co 15:3-8',
      },
    ],
    contemporaryFigures: [
      'Tibério César',
      'Pôncio Pilatos',
      'Caifás',
      'Herodes Antipas',
    ],
    archaeologicalNotes:
      'A Inscrição de Pilatos descoberta em Cesareia Marítima em 1961 confirma formalmente o título histórico de "Pontius Pilatus, Praefectus Iudaeae". O ossuário de Caifás encontrado em Jerusalém em 1990.',
  },

  // ── 9. Igreja Apostólica ──
  {
    id: 'pentecost-and-early-church',
    title: 'O Dia de Pentecostes e o Nascimento da Igreja',
    year: 30,
    yearDisplay: '30 / 33 d.C.',
    era: 'apostolic_church',
    eraTitle: 'A Igreja Apostólica e Expansão Primitiva',
    category: 'biblical_event',
    categoryLabel: 'Evento Bíblico',
    summary:
      'Derramamento do Espírito Santo com línguas de fogo e conversão de 3.000 almas na pregação de Pedro.',
    description:
      'Início da era da Igreja e o cumprimento de Joel 2:28-32. Os discípulos são cheios de poder e iniciam a proclamação em Jerusalém, Judeia, Samaria e até os confins da terra.',
    passages: [
      {
        bookId: 44,
        bookName: 'Atos',
        chapter: 2,
        startVerse: 1,
        endVerse: 47,
        display: 'At 2:1-47',
      },
    ],
    contemporaryFigures: ['Pedro', 'João', 'Tiago', 'Estêvão'],
  },
  {
    id: 'conversion-and-missionary-paul',
    title: 'A Conversão de Saulo de Tarso e as Viagens Missionárias',
    year: 34,
    yearDisplay: '34 – 67 d.C.',
    era: 'apostolic_church',
    eraTitle: 'A Igreja Apostólica e Expansão Primitiva',
    category: 'prophet',
    categoryLabel: 'Apóstolo / Profeta',
    spiritualAssessment: 'faithful',
    summary:
      'O encontro com o Cristo ressuscitado na estrada de Damasco transforma o perseguidor no apóstolo dos gentios.',
    description:
      'Três grandes viagens missionárias estabelecendo igrejas na Ásia Menor, Grécia e finalmente Roma. Autor de 13 cartas canônicas do Novo Testamento.',
    passages: [
      {
        bookId: 44,
        bookName: 'Atos',
        chapter: 9,
        startVerse: 1,
        endVerse: 22,
        display: 'At 9:1-22',
      },
      {
        bookId: 44,
        bookName: 'Atos',
        chapter: 13,
        startVerse: 1,
        endVerse: 4,
        display: 'At 13:1-4',
      },
      {
        bookId: 55,
        bookName: '2 Timóteo',
        chapter: 4,
        startVerse: 6,
        endVerse: 8,
        display: '2 Tm 4:6-8',
      },
    ],
    contemporaryFigures: [
      'Paulo',
      'Barnabé',
      'Silas',
      'Timóteo',
      'Lucas',
      'Nero',
    ],
    archaeologicalNotes:
      'Inscrição de Gálio em Delfos (Grécia, 51-52 d.C.) fixa com absoluta precisão cronológica o período em que Paulo esteve perante o procônsul Gálio em Corinto (Atos 18:12).',
  },
  {
    id: 'destruction-of-second-temple',
    title:
      'A Destruição de Jerusalém e do Segundo Templo pelo General Romano Tito',
    year: 70,
    yearDisplay: '70 d.C.',
    era: 'apostolic_church',
    eraTitle: 'A Igreja Apostólica e Expansão Primitiva',
    category: 'world_empire',
    categoryLabel: 'Império Mundial (Roma)',
    summary:
      'Após quatro anos de Revolta Judaica, as legiões romanas de Tito incendeiam e arrasam o Templo de Jerusalém.',
    description:
      'Cumprimento literal da profecia de Jesus no Sermão das Oliveiras: "Não ficará aqui pedra sobre pedra que não seja derribada" (Mt 24:2). Fim dos sacrifícios do sacerdócio levítico.',
    passages: [
      {
        bookId: 40,
        bookName: 'Mateus',
        chapter: 24,
        startVerse: 1,
        endVerse: 2,
        display: 'Mt 24:1-2',
      },
      {
        bookId: 42,
        bookName: 'Lucas',
        chapter: 19,
        startVerse: 41,
        endVerse: 44,
        display: 'Lc 19:41-44',
      },
      {
        bookId: 42,
        bookName: 'Lucas',
        chapter: 21,
        startVerse: 20,
        endVerse: 24,
        display: 'Lc 21:20-24',
      },
    ],
    contemporaryFigures: [
      'Vespasiano',
      'Tito',
      'Flávio Josefo',
      'Apóstolo João',
    ],
    archaeologicalNotes:
      'O Arco de Tito em Roma, erigido em 81 d.C., retrata soldados romanos carregando os despojos do Templo de Jerusalém (o Menorá de ouro puro de 7 braços e a mesa dos pães da proposição).',
  },
];
