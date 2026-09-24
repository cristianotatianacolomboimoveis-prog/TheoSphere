import { TextualVariantItem } from './textual-criticism.dto';

export const TEXTUAL_VARIANTS_CATALOG: TextualVariantItem[] = [
  {
    id: 'ISA.53.11',
    bookId: 23,
    bookNamePt: 'Isaías',
    chapter: 53,
    verse: 11,
    passageRef: 'Isaías 53:11',
    unitTitlePt: 'O Servo Sofredor: "Verá a Luz" no Rolo do Mar Morto (1QIsaᵃ)',
    variantType: 'addition',
    criticalRating: 'B',
    theologicalImpact: 'medium',
    historicalContextPt:
      'No Texto Massorético tradicional (Códice de Leningrado), o texto diz apenas "Do trabalho da sua alma ele verá [יראה] e ficará satisfeito". A descoberta da Caverna 1 de Qumran em 1947 trouxe o Grande Rolo de Isaías (1QIsaᵃ, c. 125 a.C.), 1.000 anos mais antigo que os manuscritos medievais.',
    scribalCausePt:
      'Haplografia no proto-massorético medieval: o copista pulou a palavra "luz" (אוֹר) após o verbo "verá" (יראה) devido à terminação visual semelhante.',
    scholarlyConsensusPt:
      'Consenso unânime na crítica moderna (BHS, BHQ, NVI, NVA, ESV): a leitura de Qumran restaura o texto original hebraico do profeta Isaías, confirmada de forma independente pela Septuaginta (LXX).',
    readings: [
      {
        witnessSiglum: '1QIsaᵃ (Grande Rolo de Qumran)',
        witnessDate: 'c. 125 a.C.',
        family: 'Qumran_DSS',
        originalText: 'מֵעֲמַל נַפְשׁוֹ יִרְאֶה אוֹר יִשְׂבָּע',
        translationPt:
          'Do trabalho da sua alma ele verá a luz e ficará satisfeito',
        isAdoptedByModernEclectic: true,
        isAdoptedByTraditionalTR: false,
      },
      {
        witnessSiglum: 'Septuaginta (LXX - Rahlfs)',
        witnessDate: 'séc. II a.C.',
        family: 'Septuagint_LXX',
        originalText: 'δεῖξαι αὐτῷ φῶς καὶ πλάσαι τῇ συνέσει',
        translationPt: 'Mostrar-lhe-á a luz e formá-lo-á com entendimento',
        isAdoptedByModernEclectic: true,
        isAdoptedByTraditionalTR: false,
      },
      {
        witnessSiglum: 'Texto Massorético (Códice de Leningrado B19A)',
        witnessDate: '1008 d.C.',
        family: 'Proto-Masoretic',
        originalText: 'מֵעֲמַל נַפְשׁוֹ יִרְאֶה יִשְׂבָּע',
        translationPt:
          'Do trabalho da sua alma ele verá [e] ficará satisfeito (sem a palavra "luz")',
        isAdoptedByModernEclectic: false,
        isAdoptedByTraditionalTR: true,
      },
    ],
  },
  {
    id: 'PSA.22.16',
    bookId: 19,
    bookNamePt: 'Salmos',
    chapter: 22,
    verse: 16,
    passageRef: 'Salmo 22:16 (17 no Hebraico)',
    unitTitlePt:
      'Profecia Messiânica: "Traspassaram minhas mãos e pés" vs "Como leão"',
    variantType: 'substitution',
    criticalRating: 'B',
    theologicalImpact: 'high',
    historicalContextPt:
      'O Salmo 22 é a maior profecia veterotestamentária da crucificação. O Texto Massorético padrão traz a leitura obscura "כָּאֲרִי" (ka’ari - "como um leão"), resultando na frase desconexa "Como um leão minhas mãos e meus pés". Manuscritos do Deserto da Judeia e a Septuaginta confirmam a leitura verbal "כָּאֲרוּ / כארו" (ka’aru - "furaram / traspassaram").',
    scribalCausePt:
      'Confusão gráfica entre a letra Yod (י) e a letra Vav (ו) no alfabeto aramaico/hebraico quadrado antigo. O copista estendeu ou encurtou o traço vertical.',
    scholarlyConsensusPt:
      'O pergaminho de Nahal Hever (5/6HevPs) do século I d.C. confirmou definitivamente a leitura "כארו" (com Vav final), ratificando a tradição cristã e a Septuaginta (ὤρυξαν χεῖράς μου καὶ πόδας).',
    readings: [
      {
        witnessSiglum: '5/6HevPs (Nahal Hever - Deserto da Judeia)',
        witnessDate: 'séc. I d.C. (c. 50-68 d.C.)',
        family: 'Qumran_DSS',
        originalText: 'כארו ידי ורגלי',
        translationPt: 'Traspassaram / perfuraram minhas mãos e meus pés',
        isAdoptedByModernEclectic: true,
        isAdoptedByTraditionalTR: true,
      },
      {
        witnessSiglum: 'Septuaginta (LXX)',
        witnessDate: 'séc. III a.C.',
        family: 'Septuagint_LXX',
        originalText: 'ὤρυξαν χεῖράς μου καὶ πόδας μου',
        translationPt: 'Traspassaram minhas mãos e meus pés',
        isAdoptedByModernEclectic: true,
        isAdoptedByTraditionalTR: true,
      },
      {
        witnessSiglum: 'Texto Massorético (Leningrado B19A / BHS)',
        witnessDate: '1008 d.C.',
        family: 'Proto-Masoretic',
        originalText: 'כָּאֲרִי יָדַי וְרַגְלָי',
        translationPt: 'Como um leão as minhas mãos e os meus pés',
        isAdoptedByModernEclectic: false,
        isAdoptedByTraditionalTR: false,
      },
    ],
  },
  {
    id: '1SA.17.4',
    bookId: 9,
    bookNamePt: '1 Samuel',
    chapter: 17,
    verse: 4,
    passageRef: '1 Samuel 17:4',
    unitTitlePt:
      'A Estatura de Golias: 4 Côvados (Qumran e LXX) vs 6 Côvados (TM)',
    variantType: 'substitution',
    criticalRating: 'B',
    theologicalImpact: 'medium',
    historicalContextPt:
      'O Texto Massorético relata que o guerreiro Golias de Gate media "seis côvados e um palmo" (~2,93 metros). Todavia, o rolo bíblico 4QSamᵃ da Caverna 4 de Qumran e o texto grego da Septuaginta trazem "quatro côvados e um palmo" (~2,05 metros).',
    scribalCausePt:
      'Erro do copista no sistema numérico hebraico arcaico ou hipérbole scribal acumulada com a passagem dos séculos para aumentar o gigantismo do campeão filisteu.',
    scholarlyConsensusPt:
      'Críticos textuais (Cross, Tov, McCarter) apontam que 4 côvados (~2 metros) já representava uma estatura monumental para a média do Próximo Oriente Antigo (1,60m), tornando o duelo anatomicamente verossímil.',
    readings: [
      {
        witnessSiglum: '4QSamᵃ (Caverna 4 de Qumran)',
        witnessDate: 'c. 100 a.C.',
        family: 'Qumran_DSS',
        originalText: 'גָּבְהוֹ אַרְבַּע אַמּוֹת וָזָרֶת',
        translationPt:
          'sua altura era de quatro côvados e um palmo (~2,05 metros)',
        isAdoptedByModernEclectic: true,
        isAdoptedByTraditionalTR: false,
      },
      {
        witnessSiglum: 'Septuaginta (LXX)',
        witnessDate: 'séc. II a.C.',
        family: 'Septuagint_LXX',
        originalText: 'ὕψος αὐτοῦ τεσσάρων πήχεων καὶ σπιθαμῆς',
        translationPt: 'sua estatura de quatro côvados e um palmo',
        isAdoptedByModernEclectic: true,
        isAdoptedByTraditionalTR: false,
      },
      {
        witnessSiglum: 'Texto Massorético (Leningrado B19A)',
        witnessDate: '1008 d.C.',
        family: 'Proto-Masoretic',
        originalText: 'גָּבְהוֹ שֵׁשׁ אַמּוֹת וָזָרֶת',
        translationPt: 'sua altura de seis côvados e um palmo (~2,93 metros)',
        isAdoptedByModernEclectic: false,
        isAdoptedByTraditionalTR: true,
      },
    ],
  },
  {
    id: 'DEU.32.8',
    bookId: 5,
    bookNamePt: 'Deuteronômio',
    chapter: 32,
    verse: 8,
    passageRef: 'Deuteronômio 32:8',
    unitTitlePt:
      'Divisão dos Povos: "Filhos de Deus" (Qumran e LXX) vs "Filhos de Israel" (TM)',
    variantType: 'substitution',
    criticalRating: 'B',
    theologicalImpact: 'high',
    historicalContextPt:
      'No Cântico de Moisés sobre a divisão das nações pelo Altíssimo, o TM diz que Deus fixou os termos dos povos segundo o número dos "filhos de Israel" (בְּנֵי יִשְׂרָאֵל). Contudo, Israel sequer existia como nação na Torre de Babel (Gn 10-11). O fragmento 4QDeutʲ de Qumran revelou o texto original: "filhos de Deus" (בְּנֵי אֱלֹהִים - seres celestiais / corte divina).',
    scribalCausePt:
      'Atenuação teológica voluntária por copistas proto-massoréticos posteriores, com receio de leituras politeístas na mente popular judaica pós-exílica.',
    scholarlyConsensusPt:
      'Apoiado por 4QDeutʲ, 4QDeut^q e LXX (ἀγγέλων θεοῦ). Adotado pelas principais traduções acadêmicas contemporâneas (ESV, NVI, NRSV).',
    readings: [
      {
        witnessSiglum: '4QDeutʲ (Caverna 4 de Qumran)',
        witnessDate: 'c. 150 a.C.',
        family: 'Qumran_DSS',
        originalText: 'לְמִסְפַּר בְּנֵי אֱלֹהִים',
        translationPt: 'segundo o número dos filhos de Deus (seres celestiais)',
        isAdoptedByModernEclectic: true,
        isAdoptedByTraditionalTR: false,
      },
      {
        witnessSiglum: 'Septuaginta (LXX)',
        witnessDate: 'séc. III a.C.',
        family: 'Septuagint_LXX',
        originalText: 'κατὰ ἀριθμὸν ἀγγέλων θεοῦ',
        translationPt: 'segundo o número dos anjos de Deus',
        isAdoptedByModernEclectic: true,
        isAdoptedByTraditionalTR: false,
      },
      {
        witnessSiglum: 'Texto Massorético (Leningrado B19A)',
        witnessDate: '1008 d.C.',
        family: 'Proto-Masoretic',
        originalText: 'לְמִסְפַּר בְּנֵי יִשְׂרָאֵל',
        translationPt: 'segundo o número dos filhos de Israel',
        isAdoptedByModernEclectic: false,
        isAdoptedByTraditionalTR: true,
      },
    ],
  },
  {
    id: '1JN.5.7',
    bookId: 62,
    bookNamePt: '1 João',
    chapter: 5,
    verse: 7,
    passageRef: '1 João 5:7-8',
    unitTitlePt:
      'O Comma Johanneum: Três Testemunhas no Céu (Interpolação Latina)',
    variantType: 'addition',
    criticalRating: 'A',
    theologicalImpact: 'high',
    historicalContextPt:
      'O "Comma Johanneum" é a famosa fórmula: "Pois há três que dão testemunho no céu: o Pai, a Palavra e o Espírito Santo; e estes três são um". Essa oração não aparece em NENHUM manuscrito grego primitivo antes do século XIV. Foi inserida por Erasmo na 3ª edição do Textus Receptus (1522) sob coerção.',
    scribalCausePt:
      'Glosa teológica marginal em códices da Vulgata Latina no norte da África e Espanha (séc. IV) que foi subsequentemente incorporada ao corpo do texto por copistas latinos medievais.',
    scholarlyConsensusPt:
      'Certeza crítica absoluta [Rating A] de que não fazia parte da epístola original do Apóstolo João. Rejeitado unanimente em todas as edições críticas gregas (Tischendorf, Westcott-Hort, NA28, SBL, UBS5).',
    readings: [
      {
        witnessSiglum:
          'Códices Sinaítico (א), Vaticano (B), Alexandrino (A) e todos os Papiros',
        witnessDate: 'séc. III - IV d.C.',
        family: 'Alexandrian',
        originalText:
          'ὅτι τρεῖς εἰσιν οἱ μαρτυροῦντες, τὸ πνεῦμα καὶ τὸ ὕδωρ καὶ τὸ αἷμα, καὶ οἱ τρεῖς εἰς τὸ ἕν εἰσιν.',
        translationPt:
          'Pois três são os que dão testemunho: o Espírito, a água e o sangue; e estes três concordam em um.',
        isAdoptedByModernEclectic: true,
        isAdoptedByTraditionalTR: false,
      },
      {
        witnessSiglum: 'Textus Receptus (Stephanus 1550 / Scrivener)',
        witnessDate: '1550 d.C. (Base: Minúsculo 61, séc. XVI)',
        family: 'Byzantine',
        originalText:
          'ὅτι τρεῖς εἰσιν οἱ μαρτυροῦντες ἐν τῷ οὐρανῷ, ὁ πατήρ, ὁ λόγος, καὶ τὸ ἅγιον πνεῦμα· καὶ οὗτοι οἱ τρεῖς ἕν εἰσι.',
        translationPt:
          'Pois três são os que testificam no céu: o Pai, a Palavra e o Espírito Santo; e estes três são um.',
        isAdoptedByModernEclectic: false,
        isAdoptedByTraditionalTR: true,
      },
    ],
  },
  {
    id: 'MRK.16.9',
    bookId: 41,
    bookNamePt: 'Marcos',
    chapter: 16,
    verse: 9,
    passageRef: 'Marcos 16:9-20',
    unitTitlePt:
      'O Final de Marcos: Final Longo (vv. 9-20) vs Encerramento em 16:8',
    variantType: 'addition',
    criticalRating: 'A',
    theologicalImpact: 'high',
    historicalContextPt:
      'Os versículos 9 a 20 de Marcos (que incluem pegar em serpentes e beber veneno) estão completamente ausentes dos dois mais antigos e abalizados códices em pergaminho gregos do mundo: Codex Sinaiticus (א) e Codex Vaticanus (B).',
    scribalCausePt:
      'O evangelho original parece ter sido interrompido abruptamente em 16:8 ("porque estavam com medo"), seja por perda da última folha do papiro original ou morte de Marcos. Copistas da igreja do século II redigiram um sumário catequético baseado em Lucas e João para fornecer um desfecho litúrgico.',
    scholarlyConsensusPt:
      'O vocabulário e estilo dos versículos 9-20 não são marcanos (18 palavras nunca usadas antes por Marcos). Todas as bíblias modernas sinalizam a passagem entre colchetes explicativos.',
    readings: [
      {
        witnessSiglum: 'Codex Sinaiticus (א) e Codex Vaticanus (B)',
        witnessDate: 'séc. IV d.C. (c. 325-350 d.C.)',
        family: 'Alexandrian',
        originalText: 'ἐφοβοῦντο γάρ. [Fim do Evangelho segundo Marcos]',
        translationPt:
          'porque estavam com medo. [Fim do Evangelho no versículo 8]',
        isAdoptedByModernEclectic: true,
        isAdoptedByTraditionalTR: false,
      },
      {
        witnessSiglum: 'Textus Receptus & Códices Bizantinos Majoritários',
        witnessDate: 'séc. V d.C. em diante (Códice Alexandrino A, C, D)',
        family: 'Byzantine',
        originalText:
          'Ἀναστὰς δὲ πρωῒ πρώτῃ σαββάτου ἐφάνη πρῶτον Μαρίᾳ τῇ Μαγδαληνῇ...',
        translationPt:
          'E Jesus, tendo ressuscitado na manhã do primeiro dia da semana, apareceu primeiramente a Maria Madalena... (vv. 9-20)',
        isAdoptedByModernEclectic: false,
        isAdoptedByTraditionalTR: true,
      },
    ],
  },
  {
    id: 'JHN.7.53',
    bookId: 43,
    bookNamePt: 'João',
    chapter: 7,
    verse: 53,
    passageRef: 'João 7:53–8:11',
    unitTitlePt:
      'Pericope Adulterae: O Relato da Mulher Surpreendida em Adultério',
    variantType: 'addition',
    criticalRating: 'A',
    theologicalImpact: 'medium',
    historicalContextPt:
      'O célebre episódio de Jesus traçando letras na terra e dizendo "Aquele que dentre vós estiver sem pecado seja o primeiro a atirar pedra" não se encontra nos papiros primitivos (𝔓⁶⁶ e 𝔓⁷⁵, c. 175-225 d.C.), nem no Sinaítico (א) ou Vaticano (B). Alguns manuscritos tardios inserem este relato após Lc 21:38!',
    scribalCausePt:
      'Tradição oral apostólica genuína preservada no Ocidente que circulou como narrativa independente antes de ser inserida pelos copistas no Evangelho de João por sua temática de julgamento e misericórdia.',
    scholarlyConsensusPt:
      'A unanimidade dos estudiosos reconhece que o trecho não foi redigido pelo Apóstolo João, ainda que relate um evento autêntico do ministério terreno de Jesus. NA28 e UBS5 o colocam entre colchetes duplos.',
    readings: [
      {
        witnessSiglum: '𝔓⁶⁶, 𝔓⁷⁵, Codex Sinaiticus (א), Codex Vaticanus (B)',
        witnessDate: 'séc. II - IV d.C.',
        family: 'Alexandrian',
        originalText: '[Texto pula diretamente de João 7:52 para João 8:12]',
        translationPt:
          '[O texto segue de 7:52 direto para 8:12: "De novo lhes falava Jesus: Eu sou a luz do mundo..."]',
        isAdoptedByModernEclectic: true,
        isAdoptedByTraditionalTR: false,
      },
      {
        witnessSiglum: 'Codex Bezae (D) & Textus Receptus',
        witnessDate: 'séc. V d.C. em diante',
        family: 'Western',
        originalText:
          'Καὶ ἐπορεύθησαν ἕκαστος εἰς τὸν οἶκον αὐτοῦ... Πορεύου, καὶ μηκέτι ἁμάρτανε.',
        translationPt:
          'E cada um foi para a sua casa... Vai e não peques mais. (Perícopa Completa)',
        isAdoptedByModernEclectic: false,
        isAdoptedByTraditionalTR: true,
      },
    ],
  },
  {
    id: '1TI.3.16',
    bookId: 54,
    bookNamePt: '1 Timóteo',
    chapter: 3,
    verse: 16,
    passageRef: '1 Timóteo 3:16',
    unitTitlePt:
      'O Mistério da Piedade: "Aquele que se manifestou" (Ὃς) vs "Deus se manifestou" (Θεὸς)',
    variantType: 'substitution',
    criticalRating: 'A',
    theologicalImpact: 'medium',
    historicalContextPt:
      'No hino cristológico de abertura, os manuscritos alexandrinos mais antigos (א*, A*, C*) trazem o pronome relativo "Ὃς ἐφανερώθη" (Aquele que se manifestou em carne). Manuscritos bizantinos posteriores trazem "Θεὸς ἐφανερώθη" (Deus se manifestou em carne).',
    scribalCausePt:
      'No grego uncial primitivo, "Ὃς" era escrito ΟΣ. A palavra "Deus" (Θεός) era grafada com a abreviação sacra (nomen sacrum) ΘΣ com um traço superior (Θ̄Σ̄). Um copista facilmente transformou o Ômicron (Ο) em Theta (Θ) adicionando um pequeno traço horizontal central!',
    scholarlyConsensusPt:
      'A leitura "Ὃς" é a leitura original (lectio difficilior potior). Cristo é o antecedente implícito do hino batismal primitivo.',
    readings: [
      {
        witnessSiglum:
          'Codex Sinaiticus (א*), Alexandrinus (A*), Ephraemi (C*)',
        witnessDate: 'séc. IV - V d.C.',
        family: 'Alexandrian',
        originalText: 'Ὃς ἐφανερώθη ἐν σαρκί',
        translationPt: 'Aquele que foi manifestado em carne',
        isAdoptedByModernEclectic: true,
        isAdoptedByTraditionalTR: false,
      },
      {
        witnessSiglum: 'Textus Receptus (1550) & Códices Bizantinos',
        witnessDate: 'séc. IX d.C. em diante',
        family: 'Byzantine',
        originalText: 'Θεὸς ἐφανερώθη ἐν σαρκί',
        translationPt: 'Deus se manifestou em carne',
        isAdoptedByModernEclectic: false,
        isAdoptedByTraditionalTR: true,
      },
    ],
  },
  {
    id: 'ROM.8.1',
    bookId: 45,
    bookNamePt: 'Romanos',
    chapter: 8,
    verse: 1,
    passageRef: 'Romanos 8:1',
    unitTitlePt:
      'Nenhuma Condenação: Cláusula de Conduta "que não andam segundo a carne"',
    variantType: 'addition',
    criticalRating: 'A',
    theologicalImpact: 'high',
    historicalContextPt:
      'O Textus Receptus e a Versão Almeida Revista e Corrigida (ARC) acrescentam ao final de Romanos 8:1: "...que não andam segundo a carne, mas segundo o Espírito". Todavia, as testemunhas alexandrinas mais antigas encerram a oração categoricamente em "para os que estão em Cristo Jesus".',
    scribalCausePt:
      'Harmonização deliberada: copistas copiaram a frase final do versículo 4 ("que não andamos segundo a carne, mas segundo o Espírito") e a inseriram no final do versículo 1 para atenuar o absolutismo da graça soberana incondicional.',
    scholarlyConsensusPt:
      'Certeza máxima [Rating A]: a justificação em Rm 8:1 é incondicional e baseada na união com Cristo, e não na performance comportamental do crente.',
    readings: [
      {
        witnessSiglum: '𝔓⁴⁶, Codex Sinaiticus (א), Vaticanus (B), Ephraemi (C)',
        witnessDate: 'c. 200 d.C. - séc. IV',
        family: 'Alexandrian',
        originalText: 'Οὐδὲν ἄρα νῦν κατάκριμα τοῖς ἐν Χριστῷ Ἰησοῦ.',
        translationPt:
          'Agora, pois, nenhuma condenação há para os que estão em Cristo Jesus. [Ponto Final]',
        isAdoptedByModernEclectic: true,
        isAdoptedByTraditionalTR: false,
      },
      {
        witnessSiglum: 'Textus Receptus & Códices Bizantinos',
        witnessDate: 'séc. IX d.C. em diante',
        family: 'Byzantine',
        originalText:
          '...τοῖς ἐν Χριστῷ Ἰησοῦ, μὴ κατὰ σάρκα περιπατοῦσιν, ἀλλὰ κατὰ πνεῦμα.',
        translationPt:
          '...aos que estão em Cristo Jesus, que não andam segundo a carne, mas segundo o Espírito.',
        isAdoptedByModernEclectic: false,
        isAdoptedByTraditionalTR: true,
      },
    ],
  },
];
