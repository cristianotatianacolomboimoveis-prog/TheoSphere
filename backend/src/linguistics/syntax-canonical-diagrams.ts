import {
  SyntaxDiagramResponse,
  CanonicalDiagramSummary,
} from './syntax-diagram.dto';

export const CANONICAL_DIAGRAMS: Record<string, SyntaxDiagramResponse> = {
  'EPH.1.3-6': {
    reference: 'Efésios 1:3-6',
    titlePt: 'A Grande Doxologia da Graça e Eleição Eterna',
    authorPt: 'Apóstolo Paulo',
    totalClauses: 7,
    maxNestingDepth: 3,
    isCanonicalPreset: true,
    rootClauses: [
      {
        id: 'eph-1-3a',
        level: 0,
        clauseType: 'main',
        labelPt: 'Cláusula Principal (Doxologia)',
        textOriginal:
          'Εὐλογητὸς ὁ θεὸς καὶ πατὴρ τοῦ κυρίου ἡμῶν Ἰησοῦ Χριστοῦ',
        textTranslation:
          'Bendito seja o Deus e Pai de nosso Senhor Jesus Cristo',
        grammaticalSubject: 'ὁ θεὸς καὶ πατήρ (Deus e Pai)',
        mainVerb: '[ἐστίν] (elipse do verbo ser/estar)',
        theologicalNote:
          'Doxologia paulina de abertura em louvor trinitário à soberania e paternidade de Deus.',
        children: [
          {
            id: 'eph-1-3b',
            level: 1,
            clauseType: 'participial',
            labelPt: 'Frase Participial Adjetival (Ação Divina)',
            textOriginal:
              'ὁ εὐλογήσας ἡμᾶς ἐν πάσῃ εὐλογίᾳ πνευματικῇ ἐν τοῖς ἐπουρανίοις ἐν Χριστῷ',
            textTranslation:
              'que nos abençoou com toda sorte de bênção espiritual nas regiões celestiais em Cristo',
            mainVerb: 'εὐλογήσας (Particípio Aoristo Ativo de εὐλογέω)',
            theologicalNote:
              'O particípio aoristo indica uma ação pontual e consumada na eternidade e na cruz.',
            children: [
              {
                id: 'eph-1-4a',
                level: 2,
                clauseType: 'subordinate_causal',
                labelPt: 'Cláusula Subordinada Comparativa/Fundamentação',
                conjunction: 'καθώς (assim como)',
                textOriginal:
                  'καθὼς ἐξελέξατο ἡμᾶς ἐν αὐτῷ πρὸ καταβολῆς κόσμου',
                textTranslation:
                  'assim como nos elegeu nele antes da fundação do mundo',
                grammaticalSubject: 'Deus Pai',
                mainVerb: 'ἐξελέξατο (Aoristo Médio de ἐκλέγομαι)',
                theologicalNote:
                  'A eleição soberana incondicional tem Cristo como esfera (ἐν αὐτῷ) e precede o cosmos.',
                children: [
                  {
                    id: 'eph-1-4b',
                    level: 3,
                    clauseType: 'infinitive_phrase',
                    labelPt: 'Frase Infinitival de Propósito Teológico',
                    textOriginal:
                      'εἶναι ἡμᾶς ἁγίους καὶ ἀμώμους κατενώπιον αὐτοῦ ἐν ἀγάπῃ',
                    textTranslation:
                      'para sermos santos e irrepreensíveis perante ele em amor',
                    mainVerb: 'εἶναι (Infinitivo Presente de εἰμί)',
                    theologicalNote:
                      'O alvo da eleição: santidade e inculpabilidade moral escatológica diante do tribunal de Deus.',
                  },
                ],
              },
              {
                id: 'eph-1-5a',
                level: 2,
                clauseType: 'participial',
                labelPt: 'Frase Participial Modal/Temporal (Predestinação)',
                textOriginal:
                  'προορίσας ἡμᾶς εἰς υἱοθεσίαν διὰ Ἰησοῦ Χριστοῦ εἰς αὐτόν',
                textTranslation:
                  'tendo-nos predestinado para a filiação adotiva por Jesus Cristo para si mesmo',
                mainVerb: 'προορίσας (Particípio Aoristo Ativo de προορίζω)',
                theologicalNote:
                  'A predestinação estabelece previamente a adoção filial através da mediação exclusiva do Filho.',
                children: [
                  {
                    id: 'eph-1-5b',
                    level: 3,
                    clauseType: 'prepositional_phrase',
                    labelPt: 'Frase Preposicional de Norma e Critério Soberano',
                    textOriginal: 'κατὰ τὴν εὐδοκίαν τοῦ θελήματος αὐτοῦ',
                    textTranslation:
                      'segundo o beneplácito de sua soberana vontade',
                    theologicalNote:
                      'A causa motriz não reside em méritos humanos previstos, mas unicamente no conselho e beneplácito divino.',
                  },
                  {
                    id: 'eph-1-6',
                    level: 3,
                    clauseType: 'subordinate_purpose',
                    labelPt:
                      'Cláusula Preposicional de Propósito Supremo (Telos)',
                    textOriginal: 'εἰς ἔπαινον δόξης τῆς χάριτος αὐτοῦ',
                    textTranslation: 'para louvor da glória de sua graça',
                    theologicalNote:
                      'O objetivo final de todo o plano redentor é o louvor supremo da glória da graça divina.',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  'ROM.8.28-30': {
    reference: 'Romanos 8:28-30',
    titlePt: 'A Cadeia Dourada da Redenção (Salutis Ordo)',
    authorPt: 'Apóstolo Paulo',
    totalClauses: 7,
    maxNestingDepth: 2,
    isCanonicalPreset: true,
    rootClauses: [
      {
        id: 'rom-8-28a',
        level: 0,
        clauseType: 'main',
        labelPt: 'Cláusula Principal (Certeza Exegética)',
        textOriginal:
          'Οἴδαμεν δὲ ὅτι τοῖς ἀγαπῶσιν τὸν θεὸν πάντα συνεργεῖ εἰς ἀγαθόν',
        textTranslation:
          'E sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus',
        grammaticalSubject: 'πάντα (todas as coisas)',
        mainVerb: 'Οἴδαμεν (Sabemos) / συνεργεῖ (coopera)',
        theologicalNote:
          'A providência governante de Deus assegura que cada contingência resulte no bem final do redimido.',
        children: [
          {
            id: 'rom-8-28b',
            level: 1,
            clauseType: 'vocative_apposition',
            labelPt: 'Frase Adjetival de Identificação Divina',
            textOriginal: 'τοῖς κατὰ πρόθεσιν κλητοῖς οὖσιν',
            textTranslation:
              'àqueles que são chamados segundo o seu propósito eterno',
            theologicalNote:
              'A definição teológica dos crentes: chamados com eficácia de acordo com a πρόθεσις (decreto eterno).',
          },
        ],
      },
      {
        id: 'rom-8-29a',
        level: 0,
        clauseType: 'subordinate_causal',
        labelPt: 'Elo 1: Presciência da Aliança',
        conjunction: 'ὅτι (porque / pois)',
        textOriginal: 'ὅτι οὓς προέγνω',
        textTranslation: 'porquanto aos que de antemão conheceu',
        grammaticalSubject: 'Deus',
        mainVerb: 'προέγνω (Aoristo Ativo de προγινώσκω)',
        theologicalNote:
          'Yada/Proginosko em sentido relacional de amor de aliança eletivo, não mera clarividência intelectual.',
        children: [
          {
            id: 'rom-8-29b',
            level: 1,
            clauseType: 'main',
            labelPt: 'Elo 2: Predestinação à Conformidade com o Filho',
            textOriginal: 'καὶ προώρισεν συμμόρφους τῆς εἰκόνος τοῦ υἱοῦ αὐτοῦ',
            textTranslation:
              'também os predestinou para serem conformes à imagem de seu Filho',
            mainVerb: 'προώρισεν (Aoristo Ativo de προορίζω)',
            theologicalNote:
              'A predestinação tem como arquétipo a conformidade moral e ontológica com a imagem do Cristo ressurreto.',
            children: [
              {
                id: 'rom-8-29c',
                level: 2,
                clauseType: 'infinitive_phrase',
                labelPt: 'Frase Infinitival de Primazia Cristológica',
                textOriginal:
                  'εἰς τὸ εἶναι αὐτὸν πρωτότοκον ἐν πολλοῖς ἀδελφοῖς',
                textTranslation:
                  'a fim de que ele seja o primogênito entre muitos irmãos',
                mainVerb: 'εἶναι (Infinitivo Presente)',
                theologicalNote:
                  'Cristo mantém a primazia perpétua (πρωτότοκος) como Cabeça da nova humanidade redimida.',
              },
            ],
          },
        ],
      },
      {
        id: 'rom-8-30a',
        level: 0,
        clauseType: 'main',
        labelPt: 'Elo 3, 4 e 5: Vocação, Justificação e Glorificação Consumada',
        textOriginal:
          'οὓς δὲ προώρισεν, τούτους καὶ ἐκάλεσεν· καὶ οὓς ἐκάλεσεν, τούτους καὶ ἐδικαίωσεν· οὓς δὲ ἐδικαίωσεν, τούτους καὶ ἐδόξασεν.',
        textTranslation:
          'e aos que predestinou, a esses também chamou; e aos que chamou, a esses também justificou; e aos que justificou, a esses também glorificou.',
        mainVerb: 'ἐκάλεσεν / ἐδικαίωσεν / ἐδόξασεν (Todos em Aoristo Ativo)',
        theologicalNote:
          'O uso do tempo Aoristo para ἐδόξασεν (glorificou) expressa o Aoristo Pró-leptico: na determinação eterna de Deus, a glorificação futura já está irrevogavelmente realizada.',
      },
    ],
  },
  'COL.1.15-18': {
    reference: 'Colossenses 1:15-18',
    titlePt: 'O Hino Cristológico da Criação e da Igreja',
    authorPt: 'Apóstolo Paulo',
    totalClauses: 6,
    maxNestingDepth: 2,
    isCanonicalPreset: true,
    rootClauses: [
      {
        id: 'col-1-15',
        level: 0,
        clauseType: 'main',
        labelPt: 'Declaração Ontológica da Imagem Invisível',
        textOriginal:
          'ὅς ἐστιν εἰκὼν τοῦ θεοῦ τοῦ ἀοράτου, πρωτότοκος πάσης κτίσεως',
        textTranslation:
          'Ele é a imagem do Deus invisível, o primogênito de toda a criação',
        grammaticalSubject: 'ὅς (Ele / Cristo)',
        mainVerb: 'ἐστιν (Presente Indicativo de εἰμί)',
        theologicalNote:
          'Cristo não é parte criada, mas o herdeiro soberano que manifesta perfeitamente a essência invisível do Pai.',
        children: [
          {
            id: 'col-1-16a',
            level: 1,
            clauseType: 'subordinate_causal',
            labelPt: 'Cláusula Causal da Criação em Cristo',
            conjunction: 'ὅτι (porque)',
            textOriginal:
              'ὅτι ἐν αὐτῷ ἐκτίσθη τὰ πάντα ἐν τοῖς οὐρανοῖς καὶ ἐπὶ τῆς γῆς',
            textTranslation:
              'porque nele foram criadas todas as coisas nos céus e sobre a terra',
            mainVerb: 'ἐκτίσθη (Aoristo Passivo de κτίζω)',
            theologicalNote:
              'Cristo é o centro arquitetônico de todo o universo visível e invisível.',
            children: [
              {
                id: 'col-1-16b',
                level: 2,
                clauseType: 'subordinate_result',
                labelPt: 'Conclusão Teleológica da Criação',
                textOriginal: 'τὰ πάντα διʼ αὐτοῦ καὶ εἰς αὐτὸν ἔκτισται',
                textTranslation:
                  'todas as coisas foram criadas por meio dele e para ele',
                mainVerb: 'ἔκτισται (Perfeito Passivo de κτίζω)',
                theologicalNote:
                  'O tempo Perfeito indica o ato criador com efeitos contínuos e permanentes com Cristo como Telos.',
              },
            ],
          },
        ],
      },
      {
        id: 'col-1-17',
        level: 0,
        clauseType: 'main',
        labelPt: 'Preexistência e Coesão Cósmica',
        textOriginal:
          'καὶ αὐτός ἐστιν πρὸ πάντων καὶ τὰ πάντα ἐν αὐτῷ συνέστηκεν',
        textTranslation:
          'Ele é antes de todas as coisas, e todas as coisas subsistem nele',
        mainVerb: 'συνέστηκεν (Perfeito Ativo de συνίστημι)',
        theologicalNote:
          'Sustentação providencial contínua da física e da matéria através da Palavra de Cristo.',
        children: [
          {
            id: 'col-1-18',
            level: 1,
            clauseType: 'main',
            labelPt: 'Primazia sobre a Igreja e a Ressurreição',
            textOriginal:
              'καὶ αὐτός ἐστιν ἡ κεφαλὴ τοῦ σώματος τῆς ἐκκλησίας· ὅς ἐστιν ἀρχή, πρωτότοκος ἐκ τῶν νεκρῶν',
            textTranslation:
              'E ele é a cabeça do corpo, da igreja; é o princípio, o primogênito de entre os mortos',
            theologicalNote:
              'A soberania se estende da ordem da criação para a ordem da redenção como Cabeça da Igreja.',
          },
        ],
      },
    ],
  },
  'JHN.1.1-3': {
    reference: 'João 1:1-3',
    titlePt: 'O Prólogo do Logos: Eternidade, Comunhão e Deidade',
    authorPt: 'Apóstolo João',
    totalClauses: 5,
    maxNestingDepth: 1,
    isCanonicalPreset: true,
    rootClauses: [
      {
        id: 'jhn-1-1a',
        level: 0,
        clauseType: 'main',
        labelPt: 'Cláusula da Eternidade Pré-Temporal',
        textOriginal: 'Ἐν ἀρχῇ ἦν ὁ λόγος',
        textTranslation: 'No princípio era o Verbo (Logos)',
        grammaticalSubject: 'ὁ λόγος (O Verbo)',
        mainVerb: 'ἦν (Imperfeito Ativo de εἰμί)',
        theologicalNote:
          'O tempo Imperfeito (ἦν) expressa existência contínua sem começo no ponto de partida temporal cósmico.',
      },
      {
        id: 'jhn-1-1b',
        level: 0,
        clauseType: 'main',
        labelPt: 'Cláusula da Comunhão Face a Face (Trindade)',
        textOriginal: 'καὶ ὁ λόγος ἦν πρὸς τὸν θεόν',
        textTranslation: 'e o Verbo estava com Deus',
        grammaticalSubject: 'ὁ λόγος',
        mainVerb: 'ἦν',
        theologicalNote:
          'A preposição πρός com acusativo denota comunhão relacional íntima e face a face entre o Filho e o Pai.',
      },
      {
        id: 'jhn-1-1c',
        level: 0,
        clauseType: 'main',
        labelPt: 'Cláusula da Essência e Plena Deidade (Regra de Colwell)',
        textOriginal: 'καὶ θεὸς ἦν ὁ λόγος',
        textTranslation: 'e o Verbo era Deus',
        grammaticalSubject: 'ὁ λόγος (articulado)',
        mainVerb: 'ἦν',
        theologicalNote:
          'θεός é predicativo anartro pré-verbal: denota natureza qualitativa e deidade plena, sem confundir as pessoas.',
      },
      {
        id: 'jhn-1-3a',
        level: 0,
        clauseType: 'main',
        labelPt: 'Cláusula Afirmativa Universal da Criação',
        textOriginal: 'πάντα διʼ αὐτοῦ ἐγένετο',
        textTranslation: 'Todas as coisas foram feitas por intermédio dele',
        mainVerb: 'ἐγένετο (Aoristo Médio de γίνομαι)',
        theologicalNote:
          'Mediação instrumental exclusiva do Logos na criação de tudo o que veio a existir.',
        children: [
          {
            id: 'jhn-1-3b',
            level: 1,
            clauseType: 'subordinate_relative',
            labelPt: 'Cláusula Antitética de Exclusão Absoluta',
            textOriginal: 'καὶ χωρὶς αὐτοῦ ἐγένετο οὐδὲ ἕν ὃ γέγονεν',
            textTranslation: 'e sem ele nada do que foi feito se fez',
            theologicalNote:
              'A negação categórica afasta qualquer cosmologia gnóstica ou intermediário demiúrgico não-criado.',
          },
        ],
      },
    ],
  },
  'GEN.1.1-3': {
    reference: 'Gênesis 1:1-3',
    titlePt: 'A Gênese Cósmica: Criação ex nihilo e o Mandato de Luz',
    authorPt: 'Moisés (Torá)',
    totalClauses: 4,
    maxNestingDepth: 1,
    isCanonicalPreset: true,
    rootClauses: [
      {
        id: 'gen-1-1',
        level: 0,
        clauseType: 'main',
        labelPt: 'Cláusula Inaugural do Universo (Criação Soberana)',
        textOriginal:
          'בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ',
        textTranslation: 'No princípio criou Deus os céus e a terra',
        grammaticalSubject: 'אֱלֹהִים (Elohim)',
        mainVerb: 'בָּרָא (Qal Perfeito - Bará)',
        theologicalNote:
          'O verbo בָּרָא (bará) no hebraico tem exclusivamente Deus como sujeito: ação criadora soberana ex nihilo.',
      },
      {
        id: 'gen-1-2a',
        level: 0,
        clauseType: 'participial',
        labelPt: 'Cláusula Circunstancial do Estado Primitivo',
        textOriginal:
          'וְהָאָרֶץ הָיְתָה תֹהוּ וָבֹהוּ וְחֹשֶׁךְ עַל־פְּנֵי תְהוֹם',
        textTranslation:
          'A terra, porém, estava sem forma e vazia; havia trevas sobre a face do abismo',
        theologicalNote:
          'Waw disjuntivo introduzindo o estado primordial que aguarda a ordem formadora da Palavra divina.',
      },
      {
        id: 'gen-1-2b',
        level: 0,
        clauseType: 'participial',
        labelPt: 'Cláusula Participial da Operação do Espírito',
        textOriginal: 'וְרוּחַ אֱלֹהִים מְרַחֶפֶת עַל־פְּנֵי הַמָּיִם',
        textTranslation: 'e o Espírito de Deus pairava por sobre as águas',
        mainVerb: 'מְרַחֶפֶת (Piel Particípio de רָחַף)',
        theologicalNote:
          'O verbo m’rachephet indica o Espírito vivificante chocando/sustentando as águas da criação.',
      },
      {
        id: 'gen-1-3',
        level: 0,
        clauseType: 'main',
        labelPt: 'Cláusula do Decreto Criador da Luz (Fiat Lux)',
        textOriginal: 'וַיֹּאמֶר אֱלֹהִים יְהִי אוֹר וַיְהִי־אוֹר',
        textTranslation: 'E disse Deus: Haja luz; e houve luz',
        mainVerb: 'וַיֹּאמֶר (Wayyiqtol) / יְהִי (Jussivo)',
        theologicalNote:
          'A criação pela mera palavra soberana: o imperativo jussivo resulta em efeito instantâneo cósmico.',
      },
    ],
  },
};

export const CANONICAL_DIAGRAMS_LIST: CanonicalDiagramSummary[] = [
  {
    id: 'EPH.1.3-6',
    reference: 'Efésios 1:3-6',
    titlePt: 'Doxologia da Eleição Eterna e Predestinação',
    themePt: 'Soteriologia Paulina & Doxologia Trinitária',
    testament: 'NT',
    clauseCount: 7,
  },
  {
    id: 'ROM.8.28-30',
    reference: 'Romanos 8:28-30',
    titlePt: 'A Cadeia Dourada da Redenção (Salutis Ordo)',
    themePt: 'Presciência, Vocação Eficaz e Glorificação',
    testament: 'NT',
    clauseCount: 7,
  },
  {
    id: 'COL.1.15-18',
    reference: 'Colossenses 1:15-18',
    titlePt: 'O Hino Cristológico da Criação e da Igreja',
    themePt: 'Cristologia Cósmica e Primazia da Ressurreição',
    testament: 'NT',
    clauseCount: 6,
  },
  {
    id: 'JHN.1.1-3',
    reference: 'João 1:1-3',
    titlePt: 'O Prólogo do Logos: Eternidade e Deidade',
    themePt: 'Ontologia Trinitária e Criação Universal',
    testament: 'NT',
    clauseCount: 5,
  },
  {
    id: 'GEN.1.1-3',
    reference: 'Gênesis 1:1-3',
    titlePt: 'A Gênese Cósmica: Criação e Mandato de Luz',
    themePt: 'Cosmologia Bíblica Hebraica e Soberania Divina',
    testament: 'OT',
    clauseCount: 4,
  },
];
