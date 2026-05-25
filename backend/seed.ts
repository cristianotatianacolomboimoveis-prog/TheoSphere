import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL ?? '';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const initialLocations = [
  {
    name: 'Jardim do Éden',
    era: -4000,
    category: 'Origens',
    description:
      'O local bíblico da criação e da queda do homem, frequentemente associado à confluência dos rios Tigre e Eufrates.',
    lng: 47.0,
    lat: 31.0,
  },
  {
    name: 'Moriá (Monte do Templo)',
    era: -1000,
    category: 'Patriarcas',
    description:
      'Local onde Abraão teria oferecido Isaque e onde Salomão construiu o primeiro Templo.',
    lng: 35.2353,
    lat: 31.7781,
  },
  {
    name: 'Éfeso',
    era: 50,
    category: 'Expansão Apostólica',
    description:
      'Um dos centros mais importantes do cristianismo primitivo, onde Paulo pregou e onde está o Templo de Ártemis.',
    lng: 27.3633,
    lat: 37.9422,
  },
  {
    name: 'Nínive',
    era: -750,
    category: 'Monarquia/Profetas',
    description:
      'Antiga capital assíria, destino da pregação do profeta Jonas.',
    lng: 43.15,
    lat: 36.36,
  },
  // --- Rotas de Abraão (AT) ---
  {
    name: 'Ur dos Caldeus',
    era: -2000,
    category: 'Patriarcas',
    description:
      'Ponto de partida da peregrinação da família de Abraão a partir da antiga Mesopotâmia.',
    lng: 46.1031,
    lat: 30.962,
  },
  {
    name: 'Harã',
    era: -1990,
    category: 'Patriarcas',
    description:
      'Local no norte da Mesopotâmia onde Terá faleceu e Abraão recebeu o chamado de Deus.',
    lng: 39.0286,
    lat: 36.8647,
  },
  {
    name: 'Siquém',
    era: -1985,
    category: 'Patriarcas',
    description:
      'Primeiro local em Canaã onde Deus confirmou a promessa da terra a Abraão.',
    lng: 35.2789,
    lat: 32.2134,
  },
  {
    name: 'Betel',
    era: -1984,
    category: 'Patriarcas',
    description:
      'Santuário montanhoso onde Abraão armou tendas e invocou o nome de Deus.',
    lng: 35.2167,
    lat: 31.9333,
  },
  {
    name: 'Egito (Delta do Nilo)',
    era: -1980,
    category: 'Patriarcas',
    description:
      'A planície fértil do Delta do Nilo onde Abraão buscou refúgio da fome.',
    lng: 31.2357,
    lat: 30.0444,
  },
  {
    name: 'Hebrom',
    era: -1970,
    category: 'Patriarcas',
    description:
      'Habitação prolongada nos carvalhais de Manre e caverna de sepultura de Macpela.',
    lng: 35.0998,
    lat: 31.5298,
  },
  {
    name: 'Berseba',
    era: -1960,
    category: 'Patriarcas',
    description:
      'O poço cavado e aliança de paz celebrada entre Abraão e Abimeleque.',
    lng: 34.8013,
    lat: 31.2447,
  },
  // --- Rota do Êxodo (AT) ---
  {
    name: 'Ramessés (Egito)',
    era: -1446,
    category: 'Êxodo',
    description:
      'Capital do Delta do Nilo e ponto de partida do Êxodo sob Moisés.',
    lng: 31.8347,
    lat: 30.7963,
  },
  {
    name: 'Sucote',
    era: -1446,
    category: 'Êxodo',
    description: 'Primeiro acampamento de Israel logo após a partida do Egito.',
    lng: 32.2667,
    lat: 30.5667,
  },
  {
    name: 'Travessia do Mar Vermelho',
    era: -1446,
    category: 'Êxodo',
    description: 'Local de livramento espetacular com a divisão das águas.',
    lng: 32.85,
    lat: 28.85,
  },
  {
    name: 'Mara (Águas Amargas)',
    era: -1446,
    category: 'Êxodo',
    description:
      'Local no deserto onde Deus curou e tornou doces as águas amargas.',
    lng: 32.95,
    lat: 29.1833,
  },
  {
    name: 'Elim',
    era: -1446,
    category: 'Êxodo',
    description:
      'Oásis abundante contendo doze fontes de água e setenta palmeiras.',
    lng: 33.1333,
    lat: 29.05,
  },
  {
    name: 'Refidim',
    era: -1446,
    category: 'Êxodo',
    description:
      'Vitória militar contra Amaleque e água que brotou da rocha ferida.',
    lng: 33.7833,
    lat: 28.65,
  },
  {
    name: 'Monte Sinai',
    era: -1445,
    category: 'Êxodo',
    description:
      'Onde Moisés recebeu a revelação da Aliança e os Dez Mandamentos.',
    lng: 33.9753,
    lat: 28.5385,
  },
  {
    name: 'Cades-Barneia',
    era: -1440,
    category: 'Êxodo',
    description: 'Oásis fronteiriço de onde partiram os espias a Canaã.',
    lng: 34.4167,
    lat: 30.6417,
  },
  {
    name: 'Monte Nebo',
    era: -1406,
    category: 'Êxodo',
    description:
      'Cume de Pisga na Transjordânia onde Moisés vislumbrou Canaã antes de falecer.',
    lng: 35.7258,
    lat: 31.765,
  },
  // --- Ministério de Jesus na Galileia (NT) ---
  {
    name: 'Rio Jordão (Batismo)',
    era: 27,
    category: 'Evangelhos',
    description:
      'Onde Jesus foi batizado por João Batista, iniciando seu ministério.',
    lng: 35.5503,
    lat: 31.8372,
  },
  {
    name: 'Monte da Tentação',
    era: 27,
    category: 'Evangelhos',
    description:
      'Local de jejum no deserto e superação espiritual das tentações.',
    lng: 35.4331,
    lat: 31.8744,
  },
  {
    name: 'Nazaré',
    era: 28,
    category: 'Evangelhos',
    description:
      'Cidade natal de criação de Jesus de onde iniciou sua proclamação.',
    lng: 35.3033,
    lat: 32.7019,
  },
  {
    name: 'Caná',
    era: 28,
    category: 'Evangelhos',
    description:
      'Local bíblico das bodas de Caná, onde Jesus transformou água em vinho.',
    lng: 35.3378,
    lat: 32.7481,
  },
  {
    name: 'Cafarnaum',
    era: 29,
    category: 'Evangelhos',
    description:
      'Cidade marítima na costa do lago e centro administrativo do ministério galileu.',
    lng: 35.575,
    lat: 32.8808,
  },
  {
    name: 'Monte das Bem-Aventuranças',
    era: 29,
    category: 'Evangelhos',
    description:
      'Encosta natural nas colinas galileias onde Jesus pregou o Sermão do Monte.',
    lng: 35.5492,
    lat: 32.8805,
  },
  {
    name: 'Betsaida',
    era: 29,
    category: 'Evangelhos',
    description:
      'Terra natal de apóstolos e local do milagre da multiplicação de pães.',
    lng: 35.6267,
    lat: 32.9067,
  },
  {
    name: 'Mar da Galileia',
    era: 29,
    category: 'Evangelhos',
    description:
      'Cenário de caminhadas nas águas e acalmar de tempestades furiosas.',
    lng: 35.59,
    lat: 32.83,
  },
  {
    name: 'Corazim',
    era: 30,
    category: 'Evangelhos',
    description: 'Cidade basáltica ao norte repreendida pela incredulidade.',
    lng: 35.5683,
    lat: 32.9136,
  },
  // --- Viagens de Paulo (NT) ---
  {
    name: 'Antioquia da Síria',
    era: 46,
    category: 'Expansão Apostólica',
    description:
      'Igreja base que separou e enviou Paulo e Barnabé para missões.',
    lng: 36.1606,
    lat: 36.2021,
  },
  {
    name: 'Seleucia da Pieria',
    era: 46,
    category: 'Expansão Apostólica',
    description:
      'Cidade portuária de onde Paulo e Barnabé embarcaram para Chipre.',
    lng: 35.9167,
    lat: 36.1167,
  },
  {
    name: 'Salamina',
    era: 46,
    category: 'Expansão Apostólica',
    description:
      'Grande porto mercantil em Chipre onde Paulo pregou nas sinagogas.',
    lng: 33.9025,
    lat: 35.1842,
  },
  {
    name: 'Pafos',
    era: 46,
    category: 'Expansão Apostólica',
    description: 'Capital ocidental de Chipre e conversão de Sérgio Paulo.',
    lng: 32.4271,
    lat: 34.772,
  },
  {
    name: 'Perge (Pamfília)',
    era: 47,
    category: 'Expansão Apostólica',
    description:
      'Local costeiro no sul da Anatólia e retorno de João Marcos a Jerusalém.',
    lng: 30.8522,
    lat: 36.9608,
  },
  {
    name: 'Antioquia da Pisídia',
    era: 47,
    category: 'Expansão Apostólica',
    description:
      'Grande colônia romana onde Paulo pregou longo sermão sobre a história salvífica.',
    lng: 31.1856,
    lat: 38.2975,
  },
  {
    name: 'Icônio',
    era: 47,
    category: 'Expansão Apostólica',
    description:
      'Nó comercial da Licaônia com conversões e conflito com opositores.',
    lng: 32.4847,
    lat: 37.8714,
  },
  {
    name: 'Listra',
    era: 48,
    category: 'Expansão Apostólica',
    description:
      'Cura do coxo, tentativa de adoração e apedrejamento de Paulo.',
    lng: 32.45,
    lat: 37.5833,
  },
  {
    name: 'Derbe',
    era: 48,
    category: 'Expansão Apostólica',
    description:
      'Cidade de acolhimento pacífico onde muitos discípulos foram formados.',
    lng: 33.3167,
    lat: 37.35,
  },
  {
    name: 'Jerusalém',
    era: 57,
    category: 'Expansão Apostólica',
    description: 'Cidade sagrada e prisão de Paulo no pátio do Templo.',
    lng: 35.2137,
    lat: 31.7683,
  },
  {
    name: 'Cesareia Marítima',
    era: 58,
    category: 'Expansão Apostólica',
    description:
      'Prisão de Paulo no palácio de Herodes e apelo oficial perante César.',
    lng: 34.9028,
    lat: 32.5036,
  },
  {
    name: 'Sidom',
    era: 59,
    category: 'Expansão Apostólica',
    description: 'Porto fenício onde Paulo visitou amigos e foi cuidado.',
    lng: 35.3689,
    lat: 33.5631,
  },
  {
    name: 'Mira (Lícia)',
    era: 59,
    category: 'Expansão Apostólica',
    description:
      'Porto de Lícia onde trocaram de navio alexandrino rumo à Itália.',
    lng: 29.9847,
    lat: 36.2575,
  },
  {
    name: 'Bons Portos (Creta)',
    era: 59,
    category: 'Expansão Apostólica',
    description:
      'Onde o navio abrigou-se temporariamente antes da terrível tempestade.',
    lng: 24.8167,
    lat: 34.9333,
  },
  {
    name: 'Malta',
    era: 60,
    category: 'Expansão Apostólica',
    description:
      'Ilha do naufrágio sem vítimas e onde Paulo curou o pai de Públio.',
    lng: 14.3754,
    lat: 35.9375,
  },
  {
    name: 'Siracusa',
    era: 60,
    category: 'Expansão Apostólica',
    description: 'Porto e capital da ilha da Sicília com escala de três dias.',
    lng: 15.2866,
    lat: 37.0755,
  },
  {
    name: 'Régio',
    era: 60,
    category: 'Expansão Apostólica',
    description: 'Porto costeiro italiano no sul da Calábria.',
    lng: 15.6476,
    lat: 38.1105,
  },
  {
    name: 'Pozzuoli',
    era: 60,
    category: 'Expansão Apostólica',
    description:
      'Porto de trigo de Nápoles e porto oficial de desembarque na península.',
    lng: 14.1205,
    lat: 40.8268,
  },
  {
    name: 'Roma',
    era: 60,
    category: 'Expansão Apostólica',
    description:
      'Capital imperial onde Paulo viveu em prisão domiciliar pregando livremente.',
    lng: 12.4964,
    lat: 41.9028,
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// THEOLOGY SEED — conteúdo teológico para o sistema RAG.
// Os embeddings são zero por enquanto; o sistema RAG irá re-embeddá-los
// quando a OPENAI_API_KEY estiver configurada.
// ──────────────────────────────────────────────────────────────────────────────
const THEOLOGY_SEED: { content: string; tradition: string }[] = [
  // ── PREDESTINAÇÃO E LIVRE-ARBÍTRIO ─────────────────────────────────────────
  {
    tradition: 'Reformada',
    content:
      'A doutrina da predestinação incondicional (eleição soberana) ensina que Deus, antes da fundação do mundo, escolheu soberanamente aqueles que seriam salvos, não com base em méritos previstos ou na presciência da fé humana, mas exclusivamente segundo o seu beneplácito e vontade (Efésios 1:4-5; Romanos 9:11). Calvino argumenta nos Institutas que a eleição é dupla: os eleitos para a salvação e os réprobos para a condenação. Os Cânones de Dort (1619) sistematizaram esses pontos nos cinco artigos conhecidos como TULIP.',
  },
  {
    tradition: 'Arminiana',
    content:
      'A teologia arminiana, formulada por Jacobus Armínio (1560-1609) e sistematizada na Remonstrância de 1610, sustenta que a eleição divina é baseada na presciência de Deus da fé humana. A graça preveniente capacita todos os seres humanos a responder ao evangelho, mas não os compele. O livre-arbítrio é real e responsável. Deus deseja genuinamente que todos se salvem (1 Timóteo 2:4; 2 Pedro 3:9). A graça pode ser resistida e a salvação, em princípio, pode ser perdida pelo abandono contínuo da fé.',
  },

  // ── JUSTIFICAÇÃO PELA FÉ ───────────────────────────────────────────────────
  {
    tradition: 'Reformada',
    content:
      "A doutrina da justificação pela fé (sola fide) é o artigo pelo qual a Igreja fica de pé ou cai (articulus stantis et cadentis ecclesiae), segundo Lutero. O pecador é declarado justo diante de Deus somente pela fé em Jesus Cristo, não por obras ou mérito humano. Romanos 3:28 declara: 'Concluímos que o homem é justificado pela fé, independentemente das obras da lei.' A justiça de Cristo é imputada ao crente; os pecados do crente foram imputados a Cristo na cruz. Esta é a base forense da salvação.",
  },
  {
    tradition: 'Católica Romana',
    content:
      'A teologia católica romana, conforme definido pelo Concílio de Trento (1545-1563), ensina que a justificação é um processo de renovação interior (não apenas declaração forense) que começa com o batismo e é sustentado pela cooperação do ser humano com a graça. A fé, a esperança e a caridade são necessárias. As obras meritórias cooperam para a salvação. O Decreto sobre a Justificação de Trento rejeitou explicitamente a sola fide protestante, afirmando que a fé sozinha é insuficiente.',
  },

  // ── NATUREZA DA GRAÇA ──────────────────────────────────────────────────────
  {
    tradition: 'Reformada',
    content:
      "Na teologia reformada, a graça irresistível (ou graça eficaz) é um dos cinco pontos do Calvinismo. Ela afirma que a graça de Deus na regeneração não pode ser permanentemente resistida pelos eleitos; quando Deus determina salvar alguém, esse indivíduo certamente será salvo. João 6:37 sustenta esta visão: 'Tudo o que o Pai me der, a mim virá.' A graça comum é dada a todos; a graça especial (salvífica) é somente para os eleitos.",
  },
  {
    tradition: 'Arminiana',
    content:
      'Na teologia arminiana e metodista, a graça preveniente (ou graça precedente) é concedida universalmente a todos os seres humanos, restaurando parcialmente a liberdade moral perdida na queda. Ela não garante a salvação, mas habilita a resposta ao evangelho. João Wesley ensinava que a graça preveniente opera antes da conversão, convencendo de pecado e atraindo ao Cristo, mas pode ser resistida e rejeitada. Deus não salva ninguém contra a sua vontade.',
  },
  {
    tradition: 'Católica Romana',
    content:
      'Na teologia tomista e católica, a graça é uma participação na vida divina (gratia gratum faciens). Distingue-se entre graça atual (auxílio divino para atos específicos) e graça habitual (estado de santificação). O debate entre tomistas e molinistas sobre a relação entre graça eficaz e livre-arbítrio ficou conhecida como a controvérsia De Auxiliis (1597-1607). Bañez defendeu a praemoção física; Molina propôs a ciência média (scientia media) de Deus.',
  },

  // ── BATISMO ────────────────────────────────────────────────────────────────
  {
    tradition: 'Batista',
    content:
      'A teologia batista defende o batismo de crentes (credobatismo): somente pessoas que professaram pessoalmente a fé em Cristo devem ser batizadas. O batismo é por imersão completa, simbolizando morte, sepultura e ressurreição com Cristo (Romanos 6:3-4). Ele não é meio de graça salvífica, mas ordenança que declara publicamente a fé já existente. O batismo de infantes é rejeitado por ausência de evidência bíblica explícita e por contrariar o princípio da conversão pessoal.',
  },
  {
    tradition: 'Presbiteriana',
    content:
      "A teologia presbiteriana e reformada defende o paidobatismo (batismo de infantes) com base na continuidade das alianças. Assim como a circuncisão era o sinal da aliança para os filhos de crentes no Antigo Testamento, o batismo é o sinal equivalente na nova aliança. A Confissão de Westminster (1646) afirma que 'o batismo é um sacramento da Nova Aliança, pelo qual o batizado é solenemente recebido na Igreja visível.' Ele não opera automaticamente a salvação, mas é meio de graça.",
  },
  {
    tradition: 'Católica Romana',
    content:
      'Na teologia católica, o batismo opera ex opere operato a remissão do pecado original e dos pecados pessoais, infunde a graça santificante e incorpora o batizado ao Corpo de Cristo. O Concílio de Trento declarou que o batismo é necessário para a salvação, salvo o batismo de desejo (baptismus flaminis) ou de sangue (martírio). O batismo de infantes é praticado desde a antiguidade cristã, conforme atestado por Orígenes e Cipriano de Cartago.',
  },

  // ── DONS DO ESPÍRITO ───────────────────────────────────────────────────────
  {
    tradition: 'Cessacionista',
    content:
      "O cessacionismo ensina que os dons milagrosos do Espírito Santo — línguas, profecia, cura, sinais e maravilhas — cessaram com a morte dos apóstolos ou com o fechamento do cânon bíblico no século I. B.B. Warfield, em 'Counterfeit Miracles' (1918), argumentou que os dons de autenticação serviram para confirmar os apóstolos como porta-vozes de Deus e perderam sua função após o estabelecimento da Igreja. 1 Coríntios 13:8-10 é citado: 'se há profecias, serão aniquiladas.'",
  },
  {
    tradition: 'Continuacionista/Pentecostal',
    content:
      "O continuacionismo e o pentecostalismo ensinam que todos os dons do Espírito mencionados no Novo Testamento continuam disponíveis para a Igreja até a volta de Cristo. Joel 2:28-29 (citado em Atos 2:17-18) promete o derramamento do Espírito 'nos últimos dias', que se iniciaram com Pentecostes. O batismo no Espírito Santo é frequentemente entendido como uma experiência posterior à conversão, com a evidência inicial de falar em outras línguas (Atos 2, 10, 19).",
  },

  // ── ESCATOLOGIA ────────────────────────────────────────────────────────────
  {
    tradition: 'Pré-milenista Dispensacionalista',
    content:
      'O pré-milenismo dispensacionalista, sistematizado por John Nelson Darby no século XIX e popularizado pela Bíblia de Scofield, ensina que Cristo voltará antes de um reinado literal de mil anos na terra (Apocalipse 20). Os eventos incluem: o arrebatamento secreto da Igreja, a grande tribulação de sete anos, a segunda vinda de Cristo com seus santos, o milênio, a rebelião final de Satanás e o juízo do Grande Trono Branco. Israel e a Igreja são entidades distintas com propósitos escatológicos diferentes.',
  },
  {
    tradition: 'Amilenista',
    content:
      "O amilenismo, defendido por Agostinho, Calvino, e a maior parte da tradição reformada e luterana, interpreta o 'milênio' de Apocalipse 20 de forma simbólica, referindo-se ao período atual entre as duas vindas de Cristo. O reino de mil anos é o reinado espiritual de Cristo sobre a Igreja no presente. Satanás está 'acorrentado' no sentido de que a propagação do evangelho às nações não é impedida. O amilenismo rejeita um reino terreno literal futuro.",
  },
  {
    tradition: 'Pós-milenista',
    content:
      'O pós-milenismo ensina que Cristo voltará após um período de prosperidade espiritual e expansão do reino de Deus na terra — o milênio. Defensores como Jonathan Edwards, Charles Hodge e B.B. Warfield viam a evangelização crescente e o progresso moral como sinais do avanço do reino. O mundo será gradualmente transformado pelo evangelho antes da parousia. Esta visão foi mais influente nos séculos XVIII-XIX e ressurgiu nos círculos da teologia do domínio (teonomia).',
  },

  // ── EXPIAÇÃO ───────────────────────────────────────────────────────────────
  {
    tradition: 'Reformada',
    content:
      "A expiação substitutiva penal é a visão dominante na teologia reformada e evangélica. Ela ensina que Cristo morreu como substituto dos pecadores, suportando a penalidade da lei de Deus — a ira divina — em seu lugar. Isaías 53:5-6 é o texto fundamental: 'Ele foi traspassado pelas nossas transgressões.' 2 Coríntios 5:21 afirma: 'Aquele que não conheceu pecado, Deus o fez pecado por nós.' A satisfação da justiça divina é central; sem derramamento de sangue não há remissão (Hebreus 9:22).",
  },
  {
    tradition: 'Liberal/Moral',
    content:
      'A teoria da influência moral da expiação, associada a Pedro Abelardo (século XII) e reinterpretada pelos teólogos liberais do século XIX (Horace Bushnell, Adolf von Harnack), ensina que a morte de Cristo não foi uma satisfação da justiça divina, mas uma demonstração suprema do amor de Deus destinada a transformar moralmente os pecadores. A cruz move o coração humano ao arrependimento e ao amor. Esta visão rejeita a necessidade da satisfação penal e enfatiza o aspecto exemplar do sacrifício de Cristo.',
  },
  {
    tradition: 'Arminiana',
    content:
      'A teoria governamental da expiação, desenvolvida por Hugo Grotius (1617) e adotada por muitos arminianos e metodistas, ensina que Deus, como governador moral do universo, aceita a morte de Cristo como uma demonstração pública da seriedade do pecado, permitindo-lhe perdoar os pecadores sem violar a ordem moral. Cristo não pagou estritamente a penalidade dos eleitos; Deus, em sua liberdade soberana, aceita seu sacrifício como suficiente para estender o perdão condicionalmente a todos os que creem.',
  },

  // ── NATUREZA DA BÍBLIA ─────────────────────────────────────────────────────
  {
    tradition: 'Evangélica/Inerrante',
    content:
      'A doutrina da inerrância bíblica afirma que a Bíblia, nos autógrafos originais (textos manuscritos originais), é inteiramente verdadeira em tudo o que afirma — em matéria de fé, prática, história e ciência. A Declaração de Chicago sobre a Inerrância Bíblica (1978), assinada por mais de 300 líderes evangélicos, define inerrância como ausência de erro ou falha em tudo o que as Escrituras pretendem afirmar. 2 Timóteo 3:16 e 2 Pedro 1:21 são os textos fundamentais.',
  },
  {
    tradition: 'Reformada/Infalibilista',
    content:
      "A doutrina da infalibilidade bíblica afirma que a Bíblia é infalivelmente confiável em tudo o que ensina concernente à fé e à prática, sem necessariamente se comprometer com a inerrância em detalhes históricos, científicos ou geográficos. Esta distinção é feita por alguns teólogos reformados e presbiterianos moderados. A Confissão de Westminster afirma que 'a autoridade infalível' das Escrituras deriva de Deus que é a própria Verdade.",
  },
  {
    tradition: 'Liberal/Crítica Histórica',
    content:
      'A teologia liberal, influenciada por Schleiermacher, Ritschl e os desenvolvedores do método histórico-crítico no século XIX, trata a Bíblia como um documento humano que testemunha da experiência religiosa de Israel e da Igreja primitiva. A inspiração divina não exclui o condicionamento histórico, cultural e teológico humano. Erros factuais, contradições literárias e desenvolvimento doutrinal são esperados num corpus literário produzido ao longo de séculos. O cânon é um produto da tradição eclesial.',
  },

  // ── ENTRADAS ADICIONAIS DE ALTA RELEVÂNCIA ─────────────────────────────────
  {
    tradition: 'Reformada',
    content:
      "A doutrina da perseverança dos santos (ou segurança eterna) ensina que todos os que foram genuinamente regenerados e eleitos por Deus perseverarão até o fim e serão finalmente salvos. João 10:28-29: 'Eu lhes dou a vida eterna, e jamais perecerão.' Romanos 8:38-39 lista todas as forças do universo e afirma que nenhuma pode separar o crente do amor de Deus. Calvino distingue entre os que são externamente chamados e os que são eficazmente chamados e selados pelo Espírito.",
  },
  {
    tradition: 'Arminiana',
    content:
      "A teologia arminiana rejeita a perseverança garantida dos santos. A apostasia genuína é possível — o crente pode, por abandono contínuo da fé, perder a salvação. Hebreus 6:4-6 e 10:26-29 são textos centrais para esta posição: 'É impossível renovar para o arrependimento aqueles que... recaíram.' João Wesley ensinava que a plena santificação (perfeição cristã) é possível nesta vida — um processo de mortificação do pecado operado pelo Espírito Santo na santidade.",
  },
  {
    tradition: 'Evangélica',
    content:
      'A cristologia ortodoxa, conforme definida pelo Concílio de Calcedônia (451 d.C.), afirma que Jesus Cristo é verdadeiro Deus e verdadeiro homem, em uma só Pessoa, com duas naturezas — divina e humana — sem confusão, mudança, divisão ou separação (ἀσυγχύτως, ἀτρέπτως, ἀδιαιρέτως, ἀχωρίστως). Esta formulação refutou o nestorianismo (duas pessoas), o eutiquianismo (uma natureza), o apolinarismo (negação da mente humana de Cristo) e o monofisismo.',
  },
  {
    tradition: 'Batista',
    content:
      'A eclesiologia batista enfatiza a autonomia da congregação local como corpo de Cristo reunido. A Igreja visível é composta apenas por crentes batizados que professaram fé pessoal. O governo congregacional é preferido, com os pastores/bispos e diáconos servindo como líderes, mas com a congregação detendo autoridade. Os dois ordenanças (não sacramentos) são o batismo e a Ceia do Senhor, ambos entendidos como atos simbólicos e memoriais, não meios de graça sacramental.',
  },
  {
    tradition: 'Reformada',
    content:
      'A doutrina da aliança (teologia federal) é central na teologia reformada e presbiteriana. Deus se relaciona com a humanidade por meio de alianças: a aliança das obras com Adão (quebrada pela queda) e a aliança da graça com Cristo como segundo Adão. As alianças bíblicas — noaica, abraâmica, mosaica, davídica e a nova aliança — são administrações progressivas de uma única aliança da graça. Esta estrutura hermenêutica sustenta o paidobatismo e a continuidade entre os dois Testamentos.',
  },
  {
    tradition: 'Pentecostal',
    content:
      'A pneumatologia pentecostal e carismática distingue entre a regeneração pelo Espírito (que ocorre na conversão) e o batismo no Espírito Santo (uma segunda bênção subsequente). Atos 2, 8, 10 e 19 são os textos fundamentais. O batismo no Espírito Santo capacita para o serviço, o testemunho e os dons espirituais. Para os pentecostais clássicos (Assembleias de Deus, IURD), falar em línguas (glossolalia) é a evidência inicial necessária do batismo no Espírito.',
  },
  {
    tradition: 'Católica Romana',
    content:
      'A Mariologia católica, desenvolvida em quatro dogmas definidos: Mãe de Deus (Theotokos, Éfeso 431), Virgindade Perpétua (Latrão 649), Imaculada Conceição (Pio IX, 1854) e Assunção (Pio XII, 1950). Maria é venerada como Mediatrix e Corredentrix — títulos debatidos teologicamente. A tradição protestante reformada rejeita essas doutrinas por ausência de fundamento bíblico claro, aceitando apenas a maternidade divina e a virgindade na concepção de Cristo.',
  },
  {
    tradition: 'Presbiteriana',
    content:
      'A Confissão de Fé de Westminster (1646) é o maior símbolo de fé da tradição reformada anglófona. Produzida pela Assembleia de Westminster por solicitação do Parlamento inglês, ela cobre soteriologia, eclesiologia, sacramentos, escatologia e ética com precisão sistemática. A Confissão afirma a predestinação dupla, a suficiência das Escrituras, a justificação pela fé somente, os dois sacramentos (batismo e Ceia) e o culto regulado pelo Princípio Regulador do Culto.',
  },
  {
    tradition: 'Evangélica',
    content:
      "A doutrina da Trindade, conforme formulada no Credo Niceno-Constantinopolitano (325/381 d.C.), afirma que há um só Deus em três Pessoas coiguais, coeternais e consubstanciais: Pai, Filho e Espírito Santo. O Filho é 'gerado, não criado, consubstancial ao Pai' (homooúsios). O Espírito Santo 'procede do Pai e do Filho' (Filioque — inserção ocidental disputada pelo Oriente). As heresias trinitárias incluem o arianismo (Filho criado), o sabelianismo (modos de uma só Pessoa) e o triteísmo.",
  },
];

async function seedTheologyEmbeddings() {
  console.log(
    '\nIniciando seed das entradas teológicas (TheologyEmbedding)...',
  );

  let inserted = 0;
  let skipped = 0;

  for (const entry of THEOLOGY_SEED) {
    try {
      // Usa ON CONFLICT DO NOTHING para evitar duplicatas por conteúdo idêntico.
      // O embedding zero será substituído pelo sistema RAG quando a OPENAI_API_KEY
      // estiver configurada e o processo de re-embedding for executado.
      const zeroEmbedding = JSON.stringify(Array(768).fill(0));

      await prisma.$executeRaw`
        INSERT INTO "TheologyEmbedding" (content, tradition, embedding)
        VALUES (
          ${entry.content},
          ${entry.tradition},
          ${zeroEmbedding}::vector
        )
        ON CONFLICT DO NOTHING
      `;
      inserted++;
      console.log(
        `  [OK] Tradição: ${entry.tradition} — ${entry.content.slice(0, 60)}...`,
      );
    } catch (e: any) {
      skipped++;
      console.warn(
        `  [SKIP] Entrada não inserida (${entry.tradition}): ${e.message?.slice(0, 80)}`,
      );
    }
  }

  console.log(
    `\nTheologyEmbedding: ${inserted} inseridas, ${skipped} ignoradas.`,
  );
}

async function main() {
  console.log('Iniciando o povoamento do banco de dados...');

  // Limpa os locais existentes para evitar duplicação (opcional)
  await prisma.$executeRaw`TRUNCATE TABLE "Location" RESTART IDENTITY CASCADE;`;

  for (const loc of initialLocations) {
    // Inserimos usando $executeRaw para lidar com o PostGIS corretamente
    // ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) cria o dado geográfico
    await prisma.$executeRaw`
      INSERT INTO "Location" (name, era, category, description, geom)
      VALUES (
        ${loc.name},
        ${loc.era},
        ${loc.category},
        ${loc.description},
        ST_SetSRID(ST_MakePoint(${loc.lng}, ${loc.lat}), 4326)::geography
      )
    `;
    console.log(`Local adicionado: ${loc.name}`);
  }

  console.log('Banco populado com sucesso com dados geográficos (PostGIS)!');

  // Seed das entradas teológicas para o sistema RAG
  await seedTheologyEmbeddings();

  console.log('\nSeed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
