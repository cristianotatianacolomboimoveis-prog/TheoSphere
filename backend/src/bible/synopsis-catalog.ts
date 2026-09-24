/**
 * synopsis-catalog.ts — Catálogo Canônico de Perícopas Sinóticas dos 4 Evangelhos.
 *
 * Mapeamento acadêmico e exegético das perícopas paralelas da vida e ministério de Cristo,
 * seguindo a ordem canônica sinótica (Kurt Aland / Burton & Goodspeed / Robertson).
 * Abrange:
 *   • Tradição Tríplice (Mateus, Marcos, Lucas)
 *   • Tradição Quádrupla (Mateus, Marcos, Lucas, João)
 *   • Tradição Dupla / Fonte Q (Mateus, Lucas)
 *   • Paralelos Duplos Especiais (Mt-Mc, Mc-Lc, Mt-Jo, Lc-Jo)
 *   • Tradições Próprias Notáveis (M, L, Jo)
 */

export type ParallelType =
  | 'quadruple'
  | 'triple'
  | 'double_q'
  | 'double_mt_mc'
  | 'double_mc_lc'
  | 'double_synoptic_john'
  | 'single';

export type SynopsisSection =
  | 'prologue_infancy'
  | 'baptism_temptation'
  | 'early_ministry'
  | 'galilean_ministry'
  | 'parables'
  | 'miracles'
  | 'journey_to_jerusalem'
  | 'jerusalem_ministry'
  | 'passion_death'
  | 'resurrection_ascension';

export interface GospelPassageRef {
  bookId: 40 | 41 | 42 | 43;
  chapter: number;
  startVerse: number;
  endVerse: number;
  display: string;
}

export interface PericopeDefinition {
  id: string;
  order: number;
  title: string;
  section: SynopsisSection;
  sectionTitle: string;
  parallelType: ParallelType;
  description: string;
  passages: {
    matthew?: GospelPassageRef;
    mark?: GospelPassageRef;
    luke?: GospelPassageRef;
    john?: GospelPassageRef;
  };
}

export const SYNOPSIS_SECTION_TITLES: Record<SynopsisSection, string> = {
  prologue_infancy: 'Prólogo, Genealogia e Infância',
  baptism_temptation: 'Preparação: João Batista, Batismo e Tentação',
  early_ministry: 'Início do Ministério & Primeiros Discípulos',
  galilean_ministry: 'Ministério na Galileia & Pregações',
  parables: 'Parábolas do Reino de Deus',
  miracles: 'Grandes Milagres & Sinais',
  journey_to_jerusalem: 'A Caminho de Jerusalém',
  jerusalem_ministry: 'Ministério em Jerusalém & Controvérsias',
  passion_death: 'A Paixão, Traição e Morte de Cristo',
  resurrection_ascension: 'A Ressurreição e a Grande Comissão',
};

export const GOSPEL_PERICOPES: PericopeDefinition[] = [
  // 1. Prólogo, Genealogia e Infância
  {
    id: 'prologue-word',
    order: 1,
    title: 'O Prólogo do Verbo Eterno',
    section: 'prologue_infancy',
    sectionTitle: SYNOPSIS_SECTION_TITLES.prologue_infancy,
    parallelType: 'single',
    description:
      'A preexistência de Cristo como o Logos divino e a encarnação.',
    passages: {
      luke: {
        bookId: 42,
        chapter: 1,
        startVerse: 1,
        endVerse: 4,
        display: 'Lc 1:1-4',
      },
      john: {
        bookId: 43,
        chapter: 1,
        startVerse: 1,
        endVerse: 18,
        display: 'Jo 1:1-18',
      },
    },
  },
  {
    id: 'genealogy-jesus',
    order: 2,
    title: 'A Genealogia de Jesus Cristo',
    section: 'prologue_infancy',
    sectionTitle: SYNOPSIS_SECTION_TITLES.prologue_infancy,
    parallelType: 'double_q',
    description:
      'A ascendência messiânica de Jesus através de Abraão/Davi (Mateus) e Adão (Lucas).',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 1,
        startVerse: 1,
        endVerse: 17,
        display: 'Mt 1:1-17',
      },
      luke: {
        bookId: 42,
        chapter: 3,
        startVerse: 23,
        endVerse: 38,
        display: 'Lc 3:23-38',
      },
    },
  },
  {
    id: 'birth-of-jesus',
    order: 3,
    title: 'O Nascimento de Jesus em Belém',
    section: 'prologue_infancy',
    sectionTitle: SYNOPSIS_SECTION_TITLES.prologue_infancy,
    parallelType: 'double_q',
    description: 'A narrativa da natividade em Belém e a adoração.',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 1,
        startVerse: 18,
        endVerse: 25,
        display: 'Mt 1:18-25',
      },
      luke: {
        bookId: 42,
        chapter: 2,
        startVerse: 1,
        endVerse: 20,
        display: 'Lc 2:1-20',
      },
    },
  },

  // 2. Preparação: Batismo e Tentação
  {
    id: 'john-baptist-preaching',
    order: 4,
    title: 'O Ministério e Pregação de João Batista',
    section: 'baptism_temptation',
    sectionTitle: SYNOPSIS_SECTION_TITLES.baptism_temptation,
    parallelType: 'quadruple',
    description:
      'A voz que clama no deserto e o batismo de arrependimento às margens do Jordão.',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 3,
        startVerse: 1,
        endVerse: 12,
        display: 'Mt 3:1-12',
      },
      mark: {
        bookId: 41,
        chapter: 1,
        startVerse: 1,
        endVerse: 8,
        display: 'Mc 1:1-8',
      },
      luke: {
        bookId: 42,
        chapter: 3,
        startVerse: 1,
        endVerse: 18,
        display: 'Lc 3:1-18',
      },
      john: {
        bookId: 43,
        chapter: 1,
        startVerse: 19,
        endVerse: 28,
        display: 'Jo 1:19-28',
      },
    },
  },
  {
    id: 'baptism-of-jesus',
    order: 5,
    title: 'O Batismo de Jesus por João Batista',
    section: 'baptism_temptation',
    sectionTitle: SYNOPSIS_SECTION_TITLES.baptism_temptation,
    parallelType: 'quadruple',
    description:
      'Os céus se abrem, o Espírito Santo desce como pomba e o Pai atesta a filiação divina.',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 3,
        startVerse: 13,
        endVerse: 17,
        display: 'Mt 3:13-17',
      },
      mark: {
        bookId: 41,
        chapter: 1,
        startVerse: 9,
        endVerse: 11,
        display: 'Mc 1:9-11',
      },
      luke: {
        bookId: 42,
        chapter: 3,
        startVerse: 21,
        endVerse: 22,
        display: 'Lc 3:21-22',
      },
      john: {
        bookId: 43,
        chapter: 1,
        startVerse: 29,
        endVerse: 34,
        display: 'Jo 1:29-34',
      },
    },
  },
  {
    id: 'temptation-in-wilderness',
    order: 6,
    title: 'A Tentação de Jesus no Deserto',
    section: 'baptism_temptation',
    sectionTitle: SYNOPSIS_SECTION_TITLES.baptism_temptation,
    parallelType: 'triple',
    description:
      'Quarenta dias no deserto da Judeia e a vitória sobre os três embates do tentador.',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 4,
        startVerse: 1,
        endVerse: 11,
        display: 'Mt 4:1-11',
      },
      mark: {
        bookId: 41,
        chapter: 1,
        startVerse: 12,
        endVerse: 13,
        display: 'Mc 1:12-13',
      },
      luke: {
        bookId: 42,
        chapter: 4,
        startVerse: 1,
        endVerse: 13,
        display: 'Lc 4:1-13',
      },
    },
  },

  // 3. Início do Ministério & Chamado dos Primeiros Discípulos
  {
    id: 'calling-first-disciples',
    order: 7,
    title: 'O Chamado dos Primeiros Discípulos',
    section: 'early_ministry',
    sectionTitle: SYNOPSIS_SECTION_TITLES.early_ministry,
    parallelType: 'quadruple',
    description:
      'Jesus chama Simão Pedro, André, Tiago e João junto ao mar da Galileia.',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 4,
        startVerse: 18,
        endVerse: 22,
        display: 'Mt 4:18-22',
      },
      mark: {
        bookId: 41,
        chapter: 1,
        startVerse: 16,
        endVerse: 20,
        display: 'Mc 1:16-20',
      },
      luke: {
        bookId: 42,
        chapter: 5,
        startVerse: 1,
        endVerse: 11,
        display: 'Lc 5:1-11',
      },
      john: {
        bookId: 43,
        chapter: 1,
        startVerse: 35,
        endVerse: 51,
        display: 'Jo 1:35-51',
      },
    },
  },
  {
    id: 'cleansing-of-leper',
    order: 8,
    title: 'A Cura de um Leproso',
    section: 'early_ministry',
    sectionTitle: SYNOPSIS_SECTION_TITLES.early_ministry,
    parallelType: 'triple',
    description:
      'Jesus estende a mão, toca no leproso e diz: "Quero, sê limpo!".',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 8,
        startVerse: 1,
        endVerse: 4,
        display: 'Mt 8:1-4',
      },
      mark: {
        bookId: 41,
        chapter: 1,
        startVerse: 40,
        endVerse: 45,
        display: 'Mc 1:40-45',
      },
      luke: {
        bookId: 42,
        chapter: 5,
        startVerse: 12,
        endVerse: 16,
        display: 'Lc 5:12-16',
      },
    },
  },
  {
    id: 'healing-paralytic-capernaum',
    order: 9,
    title: 'A Cura do Paralítico descido pelo Telhado em Cafarnaum',
    section: 'early_ministry',
    sectionTitle: SYNOPSIS_SECTION_TITLES.early_ministry,
    parallelType: 'triple',
    description:
      'O perdão dos pecados precede a cura física: "Levanta-te, toma o teu leito e vai para tua casa".',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 9,
        startVerse: 1,
        endVerse: 8,
        display: 'Mt 9:1-8',
      },
      mark: {
        bookId: 41,
        chapter: 2,
        startVerse: 1,
        endVerse: 12,
        display: 'Mc 2:1-12',
      },
      luke: {
        bookId: 42,
        chapter: 5,
        startVerse: 17,
        endVerse: 26,
        display: 'Lc 5:17-26',
      },
    },
  },
  {
    id: 'calling-of-levi-matthew',
    order: 10,
    title: 'O Chamado de Levi (Mateus) e a Ceia com Pecadores',
    section: 'early_ministry',
    sectionTitle: SYNOPSIS_SECTION_TITLES.early_ministry,
    parallelType: 'triple',
    description: '"Não vim chamar justos, mas pecadores ao arrependimento".',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 9,
        startVerse: 9,
        endVerse: 13,
        display: 'Mt 9:9-13',
      },
      mark: {
        bookId: 41,
        chapter: 2,
        startVerse: 13,
        endVerse: 17,
        display: 'Mc 2:13-17',
      },
      luke: {
        bookId: 42,
        chapter: 5,
        startVerse: 27,
        endVerse: 32,
        display: 'Lc 5:27-32',
      },
    },
  },
  {
    id: 'question-about-fasting',
    order: 11,
    title: 'A Pergunta sobre o Jejum e o Vinho Novo em Odres Novos',
    section: 'early_ministry',
    sectionTitle: SYNOPSIS_SECTION_TITLES.early_ministry,
    parallelType: 'triple',
    description:
      'A incompatibilidade entre as velhas estruturas legais e a nova dispensação do Reino.',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 9,
        startVerse: 14,
        endVerse: 17,
        display: 'Mt 9:14-17',
      },
      mark: {
        bookId: 41,
        chapter: 2,
        startVerse: 18,
        endVerse: 22,
        display: 'Mc 2:18-22',
      },
      luke: {
        bookId: 42,
        chapter: 5,
        startVerse: 33,
        endVerse: 39,
        display: 'Lc 5:33-39',
      },
    },
  },
  {
    id: 'lord-of-the-sabbath',
    order: 12,
    title: 'Jesus, Senhor do Sábado: As Espigas Colhidas',
    section: 'early_ministry',
    sectionTitle: SYNOPSIS_SECTION_TITLES.early_ministry,
    parallelType: 'triple',
    description:
      '"O sábado foi feito por causa do homem, e não o homem por causa do sábado".',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 12,
        startVerse: 1,
        endVerse: 8,
        display: 'Mt 12:1-8',
      },
      mark: {
        bookId: 41,
        chapter: 2,
        startVerse: 23,
        endVerse: 28,
        display: 'Mc 2:23-28',
      },
      luke: {
        bookId: 42,
        chapter: 6,
        startVerse: 1,
        endVerse: 5,
        display: 'Lc 6:1-5',
      },
    },
  },

  // 4. Ministério na Galileia & Pregações
  {
    id: 'sermon-on-the-mount-beatitudes',
    order: 13,
    title: 'As Bem-Aventuranças (Sermão do Monte / da Planície)',
    section: 'galilean_ministry',
    sectionTitle: SYNOPSIS_SECTION_TITLES.galilean_ministry,
    parallelType: 'double_q',
    description:
      'A proclamação do caráter ético e espiritual dos cidadãos do Reino.',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 5,
        startVerse: 1,
        endVerse: 12,
        display: 'Mt 5:1-12',
      },
      luke: {
        bookId: 42,
        chapter: 6,
        startVerse: 20,
        endVerse: 26,
        display: 'Lc 6:20-26',
      },
    },
  },
  {
    id: 'the-lords-prayer',
    order: 14,
    title: 'A Oração do Pai Nosso',
    section: 'galilean_ministry',
    sectionTitle: SYNOPSIS_SECTION_TITLES.galilean_ministry,
    parallelType: 'double_q',
    description: 'O modelo supremo de oração ensinado aos discípulos.',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 6,
        startVerse: 9,
        endVerse: 13,
        display: 'Mt 6:9-13',
      },
      luke: {
        bookId: 42,
        chapter: 11,
        startVerse: 1,
        endVerse: 4,
        display: 'Lc 11:1-4',
      },
    },
  },
  {
    id: 'golden-rule-and-two-foundations',
    order: 15,
    title: 'A Regra de Ouro e as Duas Fundações (Rocha e Areia)',
    section: 'galilean_ministry',
    sectionTitle: SYNOPSIS_SECTION_TITLES.galilean_ministry,
    parallelType: 'double_q',
    description:
      'O clímax do sermão: a prática das palavras de Cristo versus a ruína da insensatez.',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 7,
        startVerse: 12,
        endVerse: 27,
        display: 'Mt 7:12-27',
      },
      luke: {
        bookId: 42,
        chapter: 6,
        startVerse: 31,
        endVerse: 49,
        display: 'Lc 6:31-49',
      },
    },
  },
  {
    id: 'calming-the-storm',
    order: 16,
    title: 'Jesus Acalma a Tempestade no Mar da Galileia',
    section: 'miracles',
    sectionTitle: SYNOPSIS_SECTION_TITLES.miracles,
    parallelType: 'triple',
    description: '"Cala-te, emudece!". O vento cessa e há grande bonança.',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 8,
        startVerse: 23,
        endVerse: 27,
        display: 'Mt 8:23-27',
      },
      mark: {
        bookId: 41,
        chapter: 4,
        startVerse: 35,
        endVerse: 41,
        display: 'Mc 4:35-41',
      },
      luke: {
        bookId: 42,
        chapter: 8,
        startVerse: 22,
        endVerse: 25,
        display: 'Lc 8:22-25',
      },
    },
  },
  {
    id: 'gadarene-demoniac',
    order: 17,
    title: 'O Endemoninhado Gadareno / Geraneso libertado',
    section: 'miracles',
    sectionTitle: SYNOPSIS_SECTION_TITLES.miracles,
    parallelType: 'triple',
    description: 'A legião de demônios expulsa para a manada de porcos.',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 8,
        startVerse: 28,
        endVerse: 34,
        display: 'Mt 8:28-34',
      },
      mark: {
        bookId: 41,
        chapter: 5,
        startVerse: 1,
        endVerse: 20,
        display: 'Mc 5:1-20',
      },
      luke: {
        bookId: 42,
        chapter: 8,
        startVerse: 26,
        endVerse: 39,
        display: 'Lc 8:26-39',
      },
    },
  },
  {
    id: 'jairus-daughter-and-woman-with-issue-of-blood',
    order: 18,
    title: 'A Filha de Jairo e a Mulher com o Fluxo de Sangue',
    section: 'miracles',
    sectionTitle: SYNOPSIS_SECTION_TITLES.miracles,
    parallelType: 'triple',
    description:
      'Dupla manifestação de fé: cura pelo toque nas vestes e ressurreição da jovem ("Talita cumi").',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 9,
        startVerse: 18,
        endVerse: 26,
        display: 'Mt 9:18-26',
      },
      mark: {
        bookId: 41,
        chapter: 5,
        startVerse: 21,
        endVerse: 43,
        display: 'Mc 5:21-43',
      },
      luke: {
        bookId: 42,
        chapter: 8,
        startVerse: 40,
        endVerse: 56,
        display: 'Lc 8:40-56',
      },
    },
  },

  // 5. Parábolas
  {
    id: 'parable-of-the-sower',
    order: 19,
    title: 'A Parábola do Semeador e os Quatro Tipos de Solo',
    section: 'parables',
    sectionTitle: SYNOPSIS_SECTION_TITLES.parables,
    parallelType: 'triple',
    description: 'A semente da Palavra e a resposta dos diferentes corações.',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 13,
        startVerse: 1,
        endVerse: 23,
        display: 'Mt 13:1-23',
      },
      mark: {
        bookId: 41,
        chapter: 4,
        startVerse: 1,
        endVerse: 20,
        display: 'Mc 4:1-20',
      },
      luke: {
        bookId: 42,
        chapter: 8,
        startVerse: 4,
        endVerse: 15,
        display: 'Lc 8:4-15',
      },
    },
  },
  {
    id: 'parable-mustard-seed',
    order: 20,
    title: 'A Parábola do Grão de Mostarda e do Fermento',
    section: 'parables',
    sectionTitle: SYNOPSIS_SECTION_TITLES.parables,
    parallelType: 'triple',
    description:
      'O crescimento extraordinário do Reino de Deus a partir de origens diminutas.',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 13,
        startVerse: 31,
        endVerse: 35,
        display: 'Mt 13:31-35',
      },
      mark: {
        bookId: 41,
        chapter: 4,
        startVerse: 30,
        endVerse: 34,
        display: 'Mc 4:30-34',
      },
      luke: {
        bookId: 42,
        chapter: 13,
        startVerse: 18,
        endVerse: 21,
        display: 'Lc 13:18-21',
      },
    },
  },

  // 6. Grandes Milagres & Sinais
  {
    id: 'feeding-of-the-five-thousand',
    order: 21,
    title: 'A Alimentação dos Cinco Mil Homens',
    section: 'miracles',
    sectionTitle: SYNOPSIS_SECTION_TITLES.miracles,
    parallelType: 'quadruple',
    description:
      'O único milagre da vida pública narrado em todos os quatro evangelhos canônicos.',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 14,
        startVerse: 13,
        endVerse: 21,
        display: 'Mt 14:13-21',
      },
      mark: {
        bookId: 41,
        chapter: 6,
        startVerse: 30,
        endVerse: 44,
        display: 'Mc 6:30-44',
      },
      luke: {
        bookId: 42,
        chapter: 9,
        startVerse: 10,
        endVerse: 17,
        display: 'Lc 9:10-17',
      },
      john: {
        bookId: 43,
        chapter: 6,
        startVerse: 1,
        endVerse: 14,
        display: 'Jo 6:1-14',
      },
    },
  },
  {
    id: 'walking-on-water',
    order: 22,
    title: 'Jesus Anda sobre as Águas do Mar',
    section: 'miracles',
    sectionTitle: SYNOPSIS_SECTION_TITLES.miracles,
    parallelType: 'double_mt_mc',
    description:
      '"Tende bom ânimo, sou eu; não temais!". A manifestação da autoridade sobre o caos marítimo.',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 14,
        startVerse: 22,
        endVerse: 33,
        display: 'Mt 14:22-33',
      },
      mark: {
        bookId: 41,
        chapter: 6,
        startVerse: 45,
        endVerse: 52,
        display: 'Mc 6:45-52',
      },
      john: {
        bookId: 43,
        chapter: 6,
        startVerse: 16,
        endVerse: 21,
        display: 'Jo 6:16-21',
      },
    },
  },

  // 7. A Caminho de Jerusalém & Confissão Messiânica
  {
    id: 'peters-confession-at-caesarea-philippi',
    order: 23,
    title:
      'A Confissão de Pedro em Cesareia de Filipe e Primeiro Anúncio da Paixão',
    section: 'journey_to_jerusalem',
    sectionTitle: SYNOPSIS_SECTION_TITLES.journey_to_jerusalem,
    parallelType: 'triple',
    description:
      '"Tu és o Cristo, o Filho do Deus vivo!". A revelação da identidade messiânica e as condições do discipulado.',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 16,
        startVerse: 13,
        endVerse: 28,
        display: 'Mt 16:13-28',
      },
      mark: {
        bookId: 41,
        chapter: 8,
        startVerse: 27,
        endVerse: 38,
        display: 'Mc 8:27-38',
      },
      luke: {
        bookId: 42,
        chapter: 9,
        startVerse: 18,
        endVerse: 27,
        display: 'Lc 9:18-27',
      },
    },
  },
  {
    id: 'the-transfiguration',
    order: 24,
    title: 'A Transfiguração no Monte Santo',
    section: 'journey_to_jerusalem',
    sectionTitle: SYNOPSIS_SECTION_TITLES.journey_to_jerusalem,
    parallelType: 'triple',
    description:
      'A glória da deidade resplandece junto a Moisés e Elias; a nuvem luminosa e a voz do Pai.',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 17,
        startVerse: 1,
        endVerse: 9,
        display: 'Mt 17:1-9',
      },
      mark: {
        bookId: 41,
        chapter: 9,
        startVerse: 2,
        endVerse: 10,
        display: 'Mc 9:2-10',
      },
      luke: {
        bookId: 42,
        chapter: 9,
        startVerse: 28,
        endVerse: 36,
        display: 'Lc 9:28-36',
      },
    },
  },

  // 8. Ministério em Jerusalém
  {
    id: 'triumphal-entry',
    order: 25,
    title: 'A Entrada Triunfal em Jerusalém',
    section: 'jerusalem_ministry',
    sectionTitle: SYNOPSIS_SECTION_TITLES.jerusalem_ministry,
    parallelType: 'quadruple',
    description:
      '"Hosana ao Filho de Davi! Bendito o que vem em nome do Senhor!".',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 21,
        startVerse: 1,
        endVerse: 11,
        display: 'Mt 21:1-11',
      },
      mark: {
        bookId: 41,
        chapter: 1,
        startVerse: 1,
        endVerse: 11,
        display: 'Mc 11:1-11',
      },
      luke: {
        bookId: 42,
        chapter: 19,
        startVerse: 28,
        endVerse: 40,
        display: 'Lc 19:28-40',
      },
      john: {
        bookId: 43,
        chapter: 12,
        startVerse: 12,
        endVerse: 19,
        display: 'Jo 12:12-19',
      },
    },
  },
  {
    id: 'cleansing-of-the-temple',
    order: 26,
    title: 'A Purificação do Templo',
    section: 'jerusalem_ministry',
    sectionTitle: SYNOPSIS_SECTION_TITLES.jerusalem_ministry,
    parallelType: 'quadruple',
    description:
      '"A minha casa será chamada casa de oração; mas vós a tendes feito covil de salteadores".',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 21,
        startVerse: 12,
        endVerse: 17,
        display: 'Mt 21:12-17',
      },
      mark: {
        bookId: 41,
        chapter: 11,
        startVerse: 15,
        endVerse: 19,
        display: 'Mc 11:15-19',
      },
      luke: {
        bookId: 42,
        chapter: 19,
        startVerse: 45,
        endVerse: 48,
        display: 'Lc 19:45-48',
      },
      john: {
        bookId: 43,
        chapter: 2,
        startVerse: 13,
        endVerse: 22,
        display: 'Jo 2:13-22',
      },
    },
  },
  {
    id: 'the-greatest-commandment',
    order: 27,
    title: 'O Grande Mandamento da Lei',
    section: 'jerusalem_ministry',
    sectionTitle: SYNOPSIS_SECTION_TITLES.jerusalem_ministry,
    parallelType: 'triple',
    description: 'Amar a Deus de todo o coração e ao próximo como a si mesmo.',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 22,
        startVerse: 34,
        endVerse: 40,
        display: 'Mt 22:34-40',
      },
      mark: {
        bookId: 41,
        chapter: 12,
        startVerse: 28,
        endVerse: 34,
        display: 'Mc 12:28-34',
      },
      luke: {
        bookId: 42,
        chapter: 10,
        startVerse: 25,
        endVerse: 28,
        display: 'Lc 10:25-28',
      },
    },
  },

  // 9. Paixão e Morte
  {
    id: 'the-last-supper',
    order: 28,
    title: 'A Última Ceia e a Instituição da Eucaristia',
    section: 'passion_death',
    sectionTitle: SYNOPSIS_SECTION_TITLES.passion_death,
    parallelType: 'quadruple',
    description:
      '"Isto é o meu corpo, que é dado por vós; fazei isto em memória de mim".',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 26,
        startVerse: 26,
        endVerse: 30,
        display: 'Mt 26:26-30',
      },
      mark: {
        bookId: 41,
        chapter: 14,
        startVerse: 22,
        endVerse: 26,
        display: 'Mc 14:22-26',
      },
      luke: {
        bookId: 42,
        chapter: 22,
        startVerse: 14,
        endVerse: 20,
        display: 'Lc 22:14-20',
      },
      john: {
        bookId: 43,
        chapter: 13,
        startVerse: 1,
        endVerse: 17,
        display: 'Jo 13:1-17',
      },
    },
  },
  {
    id: 'gethsemane-agony-and-prayer',
    order: 29,
    title: 'A Agonia e Oração no Getsêmani',
    section: 'passion_death',
    sectionTitle: SYNOPSIS_SECTION_TITLES.passion_death,
    parallelType: 'triple',
    description:
      '"Meu Pai, se é possível, passe de mim este cálice; todavia, não seja como eu quero, mas como tu queres".',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 26,
        startVerse: 36,
        endVerse: 46,
        display: 'Mt 26:36-46',
      },
      mark: {
        bookId: 41,
        chapter: 14,
        startVerse: 32,
        endVerse: 42,
        display: 'Mc 14:32-42',
      },
      luke: {
        bookId: 42,
        chapter: 22,
        startVerse: 39,
        endVerse: 46,
        display: 'Lc 22:39-46',
      },
    },
  },
  {
    id: 'arrest-of-jesus',
    order: 30,
    title: 'A Traição com Beijo e a Prisão de Jesus',
    section: 'passion_death',
    sectionTitle: SYNOPSIS_SECTION_TITLES.passion_death,
    parallelType: 'quadruple',
    description:
      'Judas entrega o Mestre à multidão armada e os discípulos fogem.',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 26,
        startVerse: 47,
        endVerse: 56,
        display: 'Mt 26:47-56',
      },
      mark: {
        bookId: 41,
        chapter: 14,
        startVerse: 43,
        endVerse: 52,
        display: 'Mc 14:43-52',
      },
      luke: {
        bookId: 42,
        chapter: 22,
        startVerse: 47,
        endVerse: 53,
        display: 'Lc 22:47-53',
      },
      john: {
        bookId: 43,
        chapter: 18,
        startVerse: 1,
        endVerse: 12,
        display: 'Jo 18:1-12',
      },
    },
  },
  {
    id: 'peter-denial',
    order: 31,
    title: 'As Três Negações de Pedro e o Canto do Galo',
    section: 'passion_death',
    sectionTitle: SYNOPSIS_SECTION_TITLES.passion_death,
    parallelType: 'quadruple',
    description:
      'No pátio do sumo sacerdote, Pedro nega conhecer Jesus e chora amargamente.',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 26,
        startVerse: 69,
        endVerse: 75,
        display: 'Mt 26:69-75',
      },
      mark: {
        bookId: 41,
        chapter: 14,
        startVerse: 66,
        endVerse: 72,
        display: 'Mc 14:66-72',
      },
      luke: {
        bookId: 42,
        chapter: 22,
        startVerse: 54,
        endVerse: 62,
        display: 'Lc 22:54-62',
      },
      john: {
        bookId: 43,
        chapter: 18,
        startVerse: 15,
        endVerse: 27,
        display: 'Jo 18:15-27',
      },
    },
  },
  {
    id: 'trial-before-pilate',
    order: 32,
    title: 'O Julgamento perante Pôncio Pilatos',
    section: 'passion_death',
    sectionTitle: SYNOPSIS_SECTION_TITLES.passion_death,
    parallelType: 'quadruple',
    description:
      '"Tu és o Rei dos judeus?". A libertação de Barrabás e a sentença de crucificação.',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 27,
        startVerse: 11,
        endVerse: 26,
        display: 'Mt 27:11-26',
      },
      mark: {
        bookId: 41,
        chapter: 15,
        startVerse: 1,
        endVerse: 15,
        display: 'Mc 15:1-15',
      },
      luke: {
        bookId: 42,
        chapter: 23,
        startVerse: 1,
        endVerse: 25,
        display: 'Lc 23:1-25',
      },
      john: {
        bookId: 43,
        chapter: 18,
        startVerse: 28,
        endVerse: 40,
        display: 'Jo 18:28-40',
      },
    },
  },
  {
    id: 'crucifixion-and-death',
    order: 33,
    title: 'A Crucificação e a Morte de Jesus no Calvário',
    section: 'passion_death',
    sectionTitle: SYNOPSIS_SECTION_TITLES.passion_death,
    parallelType: 'quadruple',
    description:
      'Trevas sobre a terra, o véu do templo se rasga em dois: "Verdadeiramente este era o Filho de Deus!".',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 27,
        startVerse: 32,
        endVerse: 56,
        display: 'Mt 27:32-56',
      },
      mark: {
        bookId: 41,
        chapter: 15,
        startVerse: 21,
        endVerse: 41,
        display: 'Mc 15:21-41',
      },
      luke: {
        bookId: 42,
        chapter: 23,
        startVerse: 26,
        endVerse: 49,
        display: 'Lc 23:26-49',
      },
      john: {
        bookId: 43,
        chapter: 19,
        startVerse: 17,
        endVerse: 37,
        display: 'Jo 19:17-37',
      },
    },
  },
  {
    id: 'burial-of-jesus',
    order: 34,
    title: 'O Sepultamento de Jesus por José de Arimateia',
    section: 'passion_death',
    sectionTitle: SYNOPSIS_SECTION_TITLES.passion_death,
    parallelType: 'quadruple',
    description:
      'O corpo é envolvido em lençóis limpos e posto no túmulo novo cavado na rocha.',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 27,
        startVerse: 57,
        endVerse: 61,
        display: 'Mt 27:57-61',
      },
      mark: {
        bookId: 41,
        chapter: 15,
        startVerse: 42,
        endVerse: 47,
        display: 'Mc 15:42-47',
      },
      luke: {
        bookId: 42,
        chapter: 23,
        startVerse: 50,
        endVerse: 56,
        display: 'Lc 23:50-56',
      },
      john: {
        bookId: 43,
        chapter: 19,
        startVerse: 38,
        endVerse: 42,
        display: 'Jo 19:38-42',
      },
    },
  },

  // 10. Ressurreição e Ascensão
  {
    id: 'the-empty-tomb',
    order: 35,
    title: 'O Túmulo Vazio e o Anúncio da Ressurreição',
    section: 'resurrection_ascension',
    sectionTitle: SYNOPSIS_SECTION_TITLES.resurrection_ascension,
    parallelType: 'quadruple',
    description:
      'As mulheres vão ao túmulo de madrugada; a pedra removida: "Ele não está aqui, porque já ressuscitou!".',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 28,
        startVerse: 1,
        endVerse: 8,
        display: 'Mt 28:1-8',
      },
      mark: {
        bookId: 41,
        chapter: 16,
        startVerse: 1,
        endVerse: 8,
        display: 'Mc 16:1-8',
      },
      luke: {
        bookId: 42,
        chapter: 24,
        startVerse: 1,
        endVerse: 12,
        display: 'Lc 24:1-12',
      },
      john: {
        bookId: 43,
        chapter: 20,
        startVerse: 1,
        endVerse: 10,
        display: 'Jo 20:1-10',
      },
    },
  },
  {
    id: 'the-great-commission',
    order: 36,
    title: 'A Grande Comissão e o Envio dos Discípulos',
    section: 'resurrection_ascension',
    sectionTitle: SYNOPSIS_SECTION_TITLES.resurrection_ascension,
    parallelType: 'quadruple',
    description:
      '"Ide, portanto, fazei discípulos de todas as nações, batizando-os em nome do Pai, e do Filho, e do Espírito Santo".',
    passages: {
      matthew: {
        bookId: 40,
        chapter: 28,
        startVerse: 16,
        endVerse: 20,
        display: 'Mt 28:16-20',
      },
      mark: {
        bookId: 41,
        chapter: 16,
        startVerse: 14,
        endVerse: 20,
        display: 'Mc 16:14-20',
      },
      luke: {
        bookId: 42,
        chapter: 24,
        startVerse: 44,
        endVerse: 49,
        display: 'Lc 24:44-49',
      },
      john: {
        bookId: 43,
        chapter: 20,
        startVerse: 19,
        endVerse: 23,
        display: 'Jo 20:19-23',
      },
    },
  },
];
