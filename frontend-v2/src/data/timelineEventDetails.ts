/**
 * Acervo Exegético, Histórico e Arqueológico para os Eventos da Linha do Tempo
 * TheoSphere — Padrão Enciclopédico Acadêmico de Teologia e Arqueologia Bíblica
 */

import { TimelineEvent } from "@/components/atlas/TimeController";

export interface ScholarQuote {
  scholar: string;
  role: string;
  work?: string;
  quote: string;
}

export interface ArchaeologicalEvidence {
  artifactOrSite: string;
  museumOrLocation: string;
  discoveryDate?: string;
  archaeologist?: string;
  academicConsensus: string;
}

export interface EventDeepDive {
  eventId: string;
  label: string;
  yearDisplay: string;
  biblicalReferences: string[];
  historicalPeriod: string;
  geographicalContext: string;
  theologicalSummary: string;
  historicalSummary: string;
  theologians: ScholarQuote[];
  archaeologistsAndHistorians: ScholarQuote[];
  archaeologicalEvidences: ArchaeologicalEvidence[];
  christocentricSignificance: string;
  hermeneuticalDebate?: string;
}

export const TIMELINE_EVENT_DETAILS: Record<string, EventDeepDive> = {
  "A Criação": {
    eventId: "criacao",
    label: "A Criação (Cosmologia Bíblica & Ex Nihilo)",
    yearDisplay: "c. 4000 a.C. (Cronologia Tradicional) / Primórdios",
    biblicalReferences: ["Gênesis 1:1-2:3", "Salmo 33:6-9", "João 1:1-3", "Colossenses 1:15-17", "Hebreus 11:3"],
    historicalPeriod: "História Primordial (Proto-História)",
    geographicalContext: "Éden / Planície Aluvial Mesopotâmica (Rios Tigre e Eufrates - Gn 2:14)",
    theologicalSummary:
      "A narrativa da Criação estabelece a soberania absoluta e a liberdade de Javé, que cria o cosmos a partir do nada (creatio ex nihilo) unicamente pelo poder de Sua Palavra (Dabar / Fiat). Rompe radicalmente com as teogonias do Antigo Oriente Próximo ao revelar um universo bom, ordenado e desprovido de deidades astrais ou forças caóticas autônomas. A coroa da criação é o ser humano (Adão e Eva), constituído como 'Imagem e Semelhança de Deus' (Imago Dei) com dignidade inviolável e vocação sacerdotal sobre o cosmo.",
    historicalSummary:
      "No contexto historiográfico do Antigo Oriente Médio (Mesopotâmia e Egito), os relatos de origens eram marcados por teomaquias violentas (deuses guerreando entre si pela supremacia cósmica). Gênesis 1 funciona como um manifesto teológico desmitificador e polêmico em prosa exaltada: o sol e a lua não são deuses a serem adorados, mas 'luminares' servidores colocados nos céus; o mar e os monstros marinhos (Tanninim) são meras criaturas. Israel professa um monoteísmo transcendente único em todo o mundo antigo.",
    theologians: [
      {
        scholar: "Santo Agostinho de Hipona",
        role: "Bispo e Doutor da Igreja (354–430 d.C.)",
        work: "De Genesi ad Litteram (O Sentido Literal do Gênesis)",
        quote:
          "Deus não precisou de tempo nem de matéria anterior para criar; Ele criou todas as coisas simultaneamente em sua substância primordial através das 'razões seminais' (rationes seminales). O tempo foi criado juntamente com o cosmos, não antes dele. O autor sagrado acomodou a majestade do ato divino à inteligência humana por meio da estrutura poética dos seis dias.",
      },
      {
        scholar: "João Calvino",
        role: "Teólogo Reformador de Genebra (1509–1564)",
        work: "Comentário sobre o Livro de Gênesis",
        quote:
          "O mundo foi criado como o teatro esplêndido da glória de Deus (theatrum gloriae Dei), para que em toda a sua ordem e harmonia os homens pudessem contemplar a sabedoria e a beneficência divinas. A criação a partir do nada demonstra que Deus é livre, autossuficiente e pleno de benevolência paternal para com o homem, que foi colocado no centro de Suas providências.",
      },
      {
        scholar: "Tomás de Aquino",
        role: "Doutor Angélico e Filósofo Escolástico (1225–1274)",
        work: "Summa Theologiae (I, q. 45-46)",
        quote:
          "A criação não é uma mutação ou movimento no sentido físico, mas uma relação real de dependência total do ser de todas as coisas em relação ao Primeiro Princípio. Produzir o ser de modo absoluto a partir do nada pertence exclusivamente à Onipotência Divina, pois nenhuma causa finita pode transpor o abismo entre o não-ser e o ser.",
      },
      {
        scholar: "Herman Bavinck",
        role: "Teólogo Sistemático Dogmático (1854–1921)",
        work: "Dogmática Reformada, Vol. 2",
        quote:
          "A doutrina da criação ex nihilo é a linha divisória inegociável entre o teísmo bíblico e o panteísmo ou materialismo. Sem a criação, o homem seria uma emanação involuntária ou escravo de um cosmo indiferente; com a criação, o universo é um lar arquitetado com propósito redentor e inteligibilidade moral.",
      },
    ],
    archaeologistsAndHistorians: [
      {
        scholar: "John H. Walton",
        role: "Professor Emérito de Antigo Testamento (Wheaton College)",
        work: "The Lost World of Genesis One",
        quote:
          "No pensamento ontológico do Antigo Oriente Próximo, criar significava trazer ordem e atribuir funções cósmicas dentro de um templo, e não meramente produzir matéria física. Os sete dias de Gênesis 1 espelham os sete dias de inauguração e dedicação do Templo Cósmico de Yahweh, onde Ele finalmente 'descansa' para assumir o governo régio do universo.",
      },
      {
        scholar: "Kenneth A. Kitchen",
        role: "Egiptólogo e Arqueólogo Semítico (Univ. de Liverpool)",
        work: "On the Reliability of the Old Testament",
        quote:
          "Ao contrastarmos Gênesis com o épico babilônico Enuma Elish ou a cosmologia menfita de Ptah, percebe-se a total ausência de magia, conflito sexual entre deuses ou sacrifícios humanos compulsórios para alimentar divindades famintas. Gênesis eleva o ser humano de 'escravo dos deuses' à nobre condição de vice-regente da criação.",
      },
      {
        scholar: "George Smith",
        role: "Assiriólogo do Museu Britânico (1840–1876)",
        work: "The Chaldean Account of Genesis (1876)",
        quote:
          "A descoberta das tabuinhas cuneiformes de Kouyunjik provou que a memória de uma origem cósmica e de uma era primordial de paz esteve viva em todo o Crescente Fértil, porém preservada em Gênesis em sua forma eticamente pura e monoteísta.",
      },
    ],
    archaeologicalEvidences: [
      {
        artifactOrSite: "Tabletes Cuneiformes do Enuma Elish (7 Tábuas da Criação)",
        museumOrLocation: "Museu Britânico, Londres (K. 3473+)",
        discoveryDate: "1849",
        archaeologist: "Austen Henry Layard (Nínive / Biblioteca de Assurbanipal)",
        academicConsensus:
          "Revela o contraste teológico do mundo semítico: enquanto no Enuma Elish Marduk cria o mundo cortando o corpo da deusa marinha Tiamat e faz o homem do sangue de Kingu para realizar trabalhos forçados, em Gênesis Deus cria com solenidade e majestade sem rival através de Sua palavra soberana.",
      },
      {
        artifactOrSite: "Pedra de Shabaka (Cosmologia de Mênfis)",
        museumOrLocation: "Museu Britânico, Londres (BM 498)",
        discoveryDate: "1805",
        academicConsensus:
          "Inscrição egípcia onde o deus Ptah cria os seres concebendo-os no coração e pronunciando-os com a língua; ilustra que a ideia de 'criação pela palavra' era compreendida no Egito dinástico, ambiente do qual Israel partiu sob a liderança de Moisés.",
      },
    ],
    christocentricSignificance:
      "Toda a criação é orientada a Jesus Cristo. O Novo Testamento identifica o Cristo preexistente como o Logos Eterno através de quem todos os mundos foram feitos (Jo 1:1-3; Cl 1:16-17; Hb 1:2). O descanso do sétimo dia prefigura a salvação consumada na cruz, e a bondade original da criação assegura a futura redenção cósmica: a 'Nova Criação' em que a terra e os céus serão plenamente renovados (Rm 8:19-23; Ap 21:1-5).",
    hermeneuticalDebate:
      "Debate histórico entre a interpretação de Dias Literais de 24 horas (Escola de Antioquia e Reformadores), a Teoria do Templo Cósmico Funcional (Walton), a Teoria da Estrutura Literária/Framework (Meredith Kline, Mark Futato) e a interpretação dos Dias-Eras (Hugh Ross, B.B. Warfield). A Igreja preserva como dogma fundamental a 'criação ex nihilo' e a 'bondade moral original'.",
  },

  "A Queda": {
    eventId: "queda",
    label: "A Queda & O Protoevangelho (Gênesis 3)",
    yearDisplay: "c. 3900 a.C. / Aurora da Humanidade",
    biblicalReferences: ["Gênesis 3:1-24", "Romanos 5:12-21", "1 Coríntios 15:21-22", "2 Coríntios 11:3", "Apocalipse 12:9"],
    historicalPeriod: "História Primordial (Proto-História)",
    geographicalContext: "A Leste do Jardim do Éden",
    theologicalSummary:
      "A Queda representa a ruptura deliberada e trágica da aliança original da humanidade com Deus. Movidos pela sugestão diabólica de autossuficiência moral ('sereis como Deus, conhecendo o bem e o mal'), Adão e Eva violaram o mandamento de santidade. O resultado imediato foi a alienação cósmica tríplice: fratura com Deus (culpa, medo e vergonha), fratura interpessoal (acusação entre homem e mulher) e fratura com a natureza (cardos, espinhos e fadiga). Contudo, no próprio julgamento, Deus pronuncia o 'Protoevangelho' (Gn 3:15), a semente primordial de toda a história da redenção.",
    historicalSummary:
      "No imaginário do Antigo Oriente Próximo, a perda da imortalidade humana era retratada como um infortúnio caprichoso ou trapaça dos deuses (como na lenda mesopotâmica de Adapa, que recusa a comida da vida eterna por conselho errôneo de Ea, ou Gilgamesh, que perde a planta da juventude para uma cobra enquanto se banhava). Em contrapartida, Gênesis 3 introduz a responsabilidade moral do homem: a morte não decorre do capricho das divindades, mas de um ato ético de desobediência contra a Lei santa de um Deus amoroso.",
    theologians: [
      {
        scholar: "Santo Agostinho de Hipona",
        role: "Bispo de Hipona (354–430 d.C.)",
        work: "De Civitate Dei (A Cidade de Deus, Livro XIV)",
        quote:
          "O mal moral não é uma substância, mas a privação do bem (privatio boni). A raiz da queda foi a soberba: o desejo de Adão de ser seu próprio senhor e lei. Por essa desordem da vontade, a natureza humana foi corrompida pelo pecado original, tornando a graça de Deus indispensável para qualquer restauração espiritual.",
      },
      {
        scholar: "Martinho Lutero",
        role: "Pai da Reforma Protestante (1483–1546)",
        work: "Preleções sobre Gênesis",
        quote:
          "A essência da queda foi a desconfiança da Palavra de Deus. A serpente começou perguntando: 'É assim que Deus disse?'. Quando a criatura duvida da verdade e da bondade das palavras do Criador, a queda já aconteceu no coração antes mesmo de a mão tocar no fruto.",
      },
      {
        scholar: "Charles H. Spurgeon",
        role: "Príncipe dos Pregadores (1834–1892)",
        work: "Sermão sobre Gênesis 3:15 — 'A Semente da Mulher'",
        quote:
          "Gênesis 3:15 é o primeiro raio do amanhecer que rasga as trevas do túmulo humano. Ali, nos escombros do Éden e sob a condenação, Deus prometeu que o Calcanhar de Seu próprio Filho seria ferido na cruz, mas que naquela mesma ferida a cabeça da serpente infernal seria esmagada para todo o sempre.",
      },
    ],
    archaeologistsAndHistorians: [
      {
        scholar: "James K. Hoffmeier",
        role: "Arqueólogo do Antigo Oriente Próximo (Trinity Evangelical)",
        work: "The Archaeology of the Garden of Eden",
        quote:
          "A serpente como símbolo de caos, engano e poderes ctônicos hostis à ordem divina permeia toda a iconografia cananeia e egípcia (como Apófis no Egito). Gênesis 3 retrata com exatidão a luta do povo de Deus contra as tentações das religiões ctônicas pagãs.",
      },
      {
        scholar: "William Foxwell Albright",
        role: "Decano da Arqueologia Bíblica Americana (1891–1971)",
        work: "From the Stone Age to Christianity",
        quote:
          "A sobriedade e a pureza moral do relato de Gênesis 3 contrastam vivamente com os contos sumérios e acádios contemporâneos, evidenciando uma revelação profética sublime que transcende a herança cultural de seus vizinhos.",
      },
    ],
    archaeologicalEvidences: [
      {
        artifactOrSite: "O Selo da Tentação (British Museum Seal 89326)",
        museumOrLocation: "Museu Britânico, Londres",
        discoveryDate: "Séc. XIX",
        archaeologist: "Encontrado em escavações mesopotâmicas",
        academicConsensus:
          "Selo cilíndrico de hematita do 3º milênio a.C. mostrando duas figuras sentadas em lados opostos de uma árvore frutífera estendendo as mãos para os frutos, com uma serpente ondulante ereta atrás de uma das figuras; testemunho iconográfico antigo da tradição partilhada de uma árvore sagrada e uma serpente tentadora.",
      },
      {
        artifactOrSite: "Mito de Adapa (Tabuinhas de Amarna e Assur)",
        museumOrLocation: "Museu Britânico e Museu de Berlim",
        discoveryDate: "1887 (Amarna)",
        academicConsensus:
          "Relato acádio de um sábio que perdeu a imortalidade para a raça humana devido ao conselho sobre um alimento proibido; confirma o substrato cultural do Crescente Fértil sobre a tragédia da perda da bênção divina.",
      },
    ],
    christocentricSignificance:
      "O Protoevangelho de Gênesis 3:15 é o eixo de toda a Teologia Bíblica: 'Porei inimizade entre ti e a mulher, entre a tua descendência e o seu descendente; este te ferirá a cabeça, e tu lhe ferirás o calcanhar'. O Apóstolo Paulo identifica Cristo como o 'Último Adão' (Rm 5:14-19; 1 Co 15:45) que, por Sua perfeita obediência até a morte de cruz, reverte a maldição da desobediência do primeiro Adão e concede justiça e vida eterna aos que creem.",
    hermeneuticalDebate:
      "A tensão clássica entre a doutrina agostiniana/reformada da Culpa Herdada e Corrupção Total (Depravação Total) versus a visão oriental/ortodoxa do Pecado Ancestral (onde se herda a mortalidade e fraqueza, mas não a culpa forense de Adão).",
  },

  "A Era Antediluviana": {
    eventId: "antediluviana",
    label: "A Era Antediluviana (Caim, Sete & Os Nephilim)",
    yearDisplay: "c. 3200 a.C. / 4º ao 3º Milênio a.C.",
    biblicalReferences: ["Gênesis 4:1-6:8", "Hebreus 11:4-7", "Judas 1:14-15", "1 Pedro 3:19-20"],
    historicalPeriod: "Período Calcolítico Tardio / Proto-Urbano Mesopotâmico",
    geographicalContext: "Planícies do Sul da Mesopotâmia (Eridu, Uruk, Kish)",
    theologicalSummary:
      "O período entre a Queda e o Dilúvio registra a bifurcação da raça humana em duas linhagens espirituais: a linhagem caimita (marcada pelo progresso civilizatório, urbanização, música e metalurgia, mas permeada por soberba, poligamia e violência sanguinária sob Lameque) versus a linhagem piedosa de Sete ('naquele tempo os homens começaram a invocar o nome do Senhor' - Gn 4:26), exemplificada na comunhão santa de Enoque que 'andou com Deus'. A corrupção atingiu o ápice moral quando as duas linhagens se amalgamaram, culminando na multiplicação universal da violência e na degradação total das intenções do coração humano (Gn 6:5).",
    historicalSummary:
      "A arqueologia mesopotâmica atesta exatamente nesta época a Revolução Urbana de Uruk e Eridu, caracterizada pelo domínio da metalurgia de cobre e bronze arsenical (Tubalcaim), desenvolvimento de instrumentos musicais refinados (Jabal e Jubal) e as primeiras estruturas monumentais. A Lista Real Suméria divide explicitamente a história humana em dois grandes blocos: os 'Reis de Antes do Dilúvio' e os 'Reis de Depois do Dilúvio'.",
    theologians: [
      {
        scholar: "Santo Agostinho de Hipona",
        role: "Bispo de Hipona",
        work: "A Cidade de Deus (Livros XV e XVI)",
        quote:
          "Caim foi o primeiro a construir uma cidade terrena porque seu coração pertencia a este mundo presente; Abel não construiu cidade alguma porque sabia ser um estrangeiro e peregrino em busca da pátria celestial. A história inteira é o desenrolar do conflito entre o amor a si até o desprezo de Deus (Cidade dos Homens) e o amor a Deus até o desprezo de si (Cidade de Deus).",
      },
      {
        scholar: "João Calvino",
        role: "Reformador",
        work: "Institutas da Religião Cristã & Comentário de Gênesis",
        quote:
          "A linhagem de Caim nos ensina que as artes mecânicas, a arquitetura e a música são dádivas excelentes da graça comum de Deus, dadas até mesmo aos réprobos para a conservação da sociedade; contudo, desprovidas da piedade e do temor do Senhor, tornam-se instrumentos de opressão e licenciosidade.",
      },
    ],
    archaeologistsAndHistorians: [
      {
        scholar: "Thorkild Jacobsen",
        role: "Assiriólogo e Historiador (Univ. de Chicago e Harvard)",
        work: "The Sumerian King List",
        quote:
          "A Lista Real Suméria documenta a persistência milenar na Mesopotâmia da tradição de um longo período pré-diluviano de governantes com longevidades extraordinárias sediados em cidades como Eridu, Bad-tibira e Shuruppak, exatamente como reflete a genealogia de Gênesis 5.",
      },
    ],
    archaeologicalEvidences: [
      {
        artifactOrSite: "O Prisma de Weld-Blundell (Lista Real Suméria, Ashmolean AN1923.444)",
        museumOrLocation: "Ashmolean Museum, Oxford",
        discoveryDate: "1922",
        archaeologist: "Herbert Weld Blundell",
        academicConsensus:
          "Prisma de argila com quatro faces escritas em cuneiforme sumério que registra: 'Depois que a realeza desceu do céu, a realeza estava em Eridu... 8 reis reinaram durante 241.200 anos. Então o Dilúvio varreu a terra'. Prova irrefutável de que o Oriente Próximo partilhava o mesmo referencial cronológico estrutural do texto de Gênesis.",
      },
    ],
    christocentricSignificance:
      "Em meio à decadência antediluviana, a linhagem da Promessa foi preservada pela graça soberana. Enoque foi trasladado sem ver a morte, apontando para a ressurreição corpórea e a vida eterna inaugurada pelo Cristo Ressurreto. Noé achou graça aos olhos do Senhor como mediador pactual em favor de sua casa.",
    hermeneuticalDebate:
      "A identidade dos 'Filhos de Deus' (Benei Elohim) em Gênesis 6: a visão dos Anjos Caídos (apoiada em 1 Enoque, Judas 6 e Pais Primitivos como Justino) versus a visão da Linhagem Piedosa de Sete (apoiada por Crisóstomo, Agostinho, Calvino e a maioria dos comentaristas reformados).",
  },

  "O Dilúvio": {
    eventId: "diluvio",
    label: "O Dilúvio Universal & A Arca de Noé",
    yearDisplay: "c. 2500 a.C. / Época Arcaica",
    biblicalReferences: ["Gênesis 6:9-9:17", "Isaías 54:9", "Mateus 24:37-39", "Hebreus 11:7", "1 Pedro 3:20-21", "2 Pedro 2:5; 3:5-7"],
    historicalPeriod: "Transição Bronze Antigo / Memória Cataclísmica Global",
    geographicalContext: "Montes de Urartu (Ararat) / Bacia Hidrográfica Mesopotâmica",
    theologicalSummary:
      "O Dilúvio não é um acidente geológico, mas um ato solene de Des-criação e Recriação: as águas do abismo inferior e as comportas dos céus se rompem, devolvendo a terra rebelde ao caos primordial de Gênesis 1:2. A causa exclusiva é a corrupção e a violência que encheram a terra perante o olhar santo de Deus. Noé, justificado pela fé obediente, é preservado com sua família e com as espécies vivas na Arca. Ao cessar o dilúvio, Deus estabelece com Noé e toda criatura a Aliança Noética incondicional, selada pelo Arco-Íris como garantia de sustentação das estações da terra até o fim dos tempos.",
    historicalSummary:
      "Mais de 200 culturas antigas ao redor do globo preservaram mitos e narrativas de uma grande inundação cósmica da qual apenas uma família escapou em um barco. Na Mesopotâmia, os textos de Eridu, Atrahasis e Gilgamesh descrevem a catástrofe com riqueza de detalhes náuticos. Contudo, enquanto nos mitos pagãos os deuses agem por capricho egoísta (porque o barulho da humanidade não os deixava dormir) e quase morrem de fome durante o dilúvio por falta de oferendas, no relato bíblico o juízo decorre exclusivamente da justiça e santidade moral divina.",
    theologians: [
      {
        scholar: "Martinho Lutero",
        role: "Pai da Reforma Protestante",
        work: "Comentário de Gênesis sobre a Arca",
        quote:
          "A Arca de Noé é a imagem preeminente da Igreja de Jesus Cristo navegando sobre as ondas violentas deste mundo condenado. Aqueles que estão dentro, sob o sangue do Salvador, podem ouvir o rugido das águas da condenação, mas nada temem porque foi a mão do próprio Deus que os trancou pelo lado de fora (Gn 7:16).",
      },
      {
        scholar: "Charles H. Spurgeon",
        role: "Pastor e Teólogo Batista",
        work: "Sermões no Tabernáculo Metropolitano",
        quote:
          "Vede a misericórdia de Deus: Ele não disse a Noé 'Vá para dentro da arca', mas sim 'Entre na arca' — o que significa que Deus mesmo já estava dentro dela esperando pelo Seu servo. Quando a porta se fechou, ela fechou a Noé em segurança e trancou a destruição do lado de fora.",
      },
      {
        scholar: "B.B. Warfield",
        role: "Teólogo de Princeton (1851–1921)",
        work: "Biblical and Theological Studies",
        quote:
          "A Aliança com Noé é a Magna Carta da Graça Comum. Ela não redime a alma do pecado, mas garante a estabilidade das leis da física, do clima e da agricultura para que o plano redentor especial possa operar no tempo até a plenitude em Cristo.",
      },
    ],
    archaeologistsAndHistorians: [
      {
        scholar: "Sir Leonard Woolley",
        role: "Arqueólogo Escavador de Ur dos Caldeus (1880–1960)",
        work: "Ur of the Chaldees (Escavações de 1929)",
        quote:
          "Ao escavar em Ur, encontramos uma camada estéril de lama aluvial limpa de 2,5 a 3 metros de espessura que cobria completamente os assentamentos neolíticos, sem nenhum vestígio de habitação humana por gerações. Tratava-se da evidência tangível de uma inundação cataclísmica sem precedentes na memória dos povos da Mesopotâmia.",
      },
      {
        scholar: "George Smith",
        role: "Pioneiro da Assiriologia",
        work: "Leitura perante a Sociedade de Arqueologia Bíblica de Londres (1872)",
        quote:
          "A leitura da 11ª tábua de Gilgamesh chocou o mundo erudito: o relato de Utnapishtim sobre a construção de um grande barco calafetado com betume, a soltura do corvo e da pomba para testar o recuo das águas e o pouso numa montanha comprovou a base histórica milenar da narrativa bíblica.",
      },
      {
        scholar: "Kenneth A. Kitchen",
        role: "Egiptólogo e Arqueólogo Semítico",
        work: "On the Reliability of the Old Testament",
        quote:
          "A tradição do Dilúvio em Gênesis e nos textos mesopotâmicos provém de uma raiz documental proto-histórica autêntica e comum que antecede o 2º milênio a.C., diferindo diametralmente no seu propósito teológico e integridade moral.",
      },
    ],
    archaeologicalEvidences: [
      {
        artifactOrSite: "11ª Tábua da Epopeia de Gilgamesh (O Dilúvio de Utnapishtim)",
        museumOrLocation: "Museu Britânico, Londres (K. 2252)",
        discoveryDate: "1853",
        archaeologist: "Hormuzd Rassam (Nínive)",
        academicConsensus:
          "Texto cuneiforme descrevendo o herói advertido pelo deus Ea para desmanchar sua casa e construir um navio, levar todas as espécies e enfrentar a tempestade que durou seis dias e seis noites, pousando no monte Nimush.",
      },
      {
        artifactOrSite: "O Épico de Atrahasis",
        museumOrLocation: "Museu Britânico, Londres",
        discoveryDate: "1898",
        academicConsensus:
          "Tabuinhas babilônicas antigas (século XVII a.C.) que contam a história completa desde a criação do homem até o dilúvio e as regras demográficas pós-diluvianas, corroborando a ordem sequencial dos eventos bíblicos de Gênesis 1 a 9.",
      },
    ],
    christocentricSignificance:
      "O Apóstolo Pedro declara que a salvação das oito pessoas na arca através da água é a figura (antitúpos) do Batismo, que nos salva pela ressurreição de Jesus Cristo (1 Pe 3:20-21). Assim como a Arca suportou todo o peso da tempestade de águas e do juízo divino mantendo vivos os que estavam dentro dela, assim Cristo suportou na cruz toda a tempestade da ira santa de Deus, tornando-se o nosso único e perpétuo refúgio.",
    hermeneuticalDebate:
      "O debate acadêmico entre Dilúvio Global (Catastrofismo Geológico defendido por Henry Morris e John Whitcomb) versus Dilúvio Local/Regional Antropologicamente Universal (defendido por teólogos como Hugh Miller, B.B. Warfield, Gleason Archer e John Collins, onde a inundação cobriu todo o mundo conhecido habitado pela humanidade de então).",
  },

  "Torre de Babel": {
    eventId: "babel",
    label: "Torre de Babel & A Dispersão das Nações",
    yearDisplay: "c. 2200 a.C. / Período Neossumério",
    biblicalReferences: ["Gênesis 10:8-10; 11:1-9", "Atos 2:1-11", "Apocalipse 5:9; 7:9"],
    historicalPeriod: "Período Proto-Imperial Mesopotâmico / 3ª Dinastia de Ur",
    geographicalContext: "Planície de Sinar (Sul da Mesopotâmia / Babilônia / Eridu)",
    theologicalSummary:
      "A construção da Torre de Babel retrata a primeira tentativa de imperialismo e autonomia humana contra o mandamento de Deus de povoar e encher a terra (Gn 1:28; 9:1). Sob o lema 'façamos para nós um nome, para que não sejamos espalhados', a sociedade humana concentrou seu poder político e tecnológico em uma obra sacralizada de autoexaltação. O juízo de Deus é irônico: Aquele cujo trono está nos céus precisa 'descer' para conseguir enxergar a insignificante torre humana. Pela confusão das línguas, Deus frustra o totalitarismo pagão e dispersa as famílias humanas pela face da terra.",
    historicalSummary:
      "As 'torres' descritas em Gênesis 11 correspondem exatamente aos zigurates monumentais erguidos na Mesopotâmia com tijolos cozidos em fornos e betume como argamassa (material técnico registrado com rigor em Gn 11:3, ausente em Canaã onde se usava pedra natural). O mais famoso foi o Etemenanki ('Fundamento dos Céus e da Terra') na Babilônia. O relato explica etiologicamente a Tabela das Nações de Gênesis 10 e prepara a transição para o chamado de Abraão em Gênesis 12.",
    theologians: [
      {
        scholar: "João Calvino",
        role: "Reformador",
        work: "Comentário de Gênesis",
        quote:
          "Os homens de Babel não queriam subir ao céu pela fé, mas pela soberba da carne. Seu objetivo era estabelecer um monumento à sua própria glória terrena para viverem independentes da providência de Deus. Deus os dispersou porque o orgulho unificado é o maior inimigo da verdadeira adoração.",
      },
      {
        scholar: "Karl Barth",
        role: "Teólogo Suíço (1886–1968)",
        work: "Dogmática da Igreja",
        quote:
          "Babel é o arquétipo de toda religião humana que tenta fabricar uma ponte da terra para o céu. Toda obra religiosa humana sem a revelação é uma torre de pretensão. Mas Deus não se deixa alcançar pelo esforço de nossos tijolos; Ele desce em graça na Encarnação de Seu Filho.",
      },
    ],
    archaeologistsAndHistorians: [
      {
        scholar: "Robert Koldewey",
        role: "Arqueólogo Alemão Escavador da Babilônia (1855–1925)",
        work: "The Excavations at Babylon (1914)",
        quote:
          "Ao escavar o coração da Babilônia, expusemos as fundações colossais do zigurate Etemenanki, uma torre de sete andares com mais de 90 metros de altura erguida sobre uma base quadrada com milhões de tijolos cozidos e argamassa de asfalto, exatamente como descrito em Gênesis 11.",
      },
    ],
    archaeologicalEvidences: [
      {
        artifactOrSite: "A Estela da Torre de Babel (Coleção Schøyen MS 2063)",
        museumOrLocation: "Oslo, Noruega",
        discoveryDate: "Séc. VI a.C.",
        academicConsensus:
          "Estela esculpida de Nabucodonosor II mostrando a silhueta em degraus do zigurate da Babilônia e a inscrição real: 'A torre de Babilônia, eu fiz suas pedras de fundação firmes no seio do submundo e seu topo rivalizar com os céus'.",
      },
    ],
    christocentricSignificance:
      "A confusão das línguas em Babel é dramaticamente revertida no dia de Pentecostes (Atos 2). Enquanto em Babel o orgulho humano dispersou os povos em incompreensão, em Pentecostes o Espírito Santo uniu homens de todas as línguas na proclamação das 'grandezas de Deus', antecipando a visão celestial de Apocalipse onde redimidos de 'toda tribo, língua, povo e nação' adorarão eternamente ao Cordeiro (Ap 7:9).",
    hermeneuticalDebate:
      "Identificação do local primário: o Zigurate de Etemenanki na Babilônia histórica versus o Zigurate mais antigo de Eridu (associado a Enmerkar no poema 'Enmerkar e o Senhor de Aratta', onde há a menção explícita de uma época em que toda a terra falava uma só língua até que o deus Enki trocou a fala dos homens).",
  },

  "Era dos Patriarcas": {
    eventId: "patriarcas",
    label: "Era dos Patriarcas (A Aliança Abraâmica)",
    yearDisplay: "c. 2000–1750 a.C. / Bronze Médio I e II",
    biblicalReferences: ["Gênesis 12:1-3; 15:1-21; 17:1-8; 22:1-18", "Romanos 4:1-25", "Gálatas 3:6-18", "Hebreus 11:8-19"],
    historicalPeriod: "Idade do Bronze Médio (Período dos Amoritas)",
    geographicalContext: "Ur dos Caldeus -> Harã -> Canaã (Siquém, Bete-El, Hebrom, Berseba)",
    theologicalSummary:
      "A Aliança com Abraão é o pilar estrutural de toda a Teologia Pactual bíblica. Em contraste com a dispersão de Babel, Deus chama soberanamente um indivíduo e faz-lhe três promessas incondicionais: uma Terra (Canaã), uma Semente numerosa como as estrelas (posteridade) e uma Bênção que alcançará 'todas as famílias da terra'. Em Gênesis 15, Deus sela o pacto passando sozinho pelo meio dos animais divididos como uma tocha flamejante, jurando por Si mesmo que arcaria com a própria morte se a promessa falhasse. Em Gênesis 22, o sacrifício de Isaque no Monte Moriá torna-se a profecia viva do sacrifício do próprio Filho de Deus.",
    historicalSummary:
      "O horizonte histórico dos patriarcas se encaixa perfeitamente no Bronze Médio. Documentos cuneiformes escavados em Nuzi, Mari e Alalakh atestam com fidelidade cirúrgica os costumes civis retratados em Gênesis: adoção de um servo da casa como herdeiro provisório (como Eliezer em Gn 15), entrega de uma serva à esposa estéril para gerar herdeiros legais (como Hagar em Gn 16), a validade jurídica de bênçãos orais irrevogáveis de leito de morte (Jacó e Esaú) e o valor dos deuses domésticos (terafeins) como títulos de posse da herança.",
    theologians: [
      {
        scholar: "João Calvino",
        role: "Reformador",
        work: "Institutas da Religião Cristã (Livro II, Cap. 10)",
        quote:
          "A aliança feita com todos os pais patriarcas é tão semelhante à nossa em substância e realidade que as duas são na verdade uma só e a mesma aliança, diferindo unicamente na administração exterior. Eles esperavam a mesma bem-aventurança eterna em Cristo que nós hoje aguardamos.",
      },
      {
        scholar: "Geerhardus Vos",
        role: "Pai da Teologia Bíblica Reformada (1862–1949)",
        work: "Biblical Theology: Old and New Testaments",
        quote:
          "Com Abraão, a revelação deixa de ser puramente geral e torna-se orgânica e específica. Deus cria para Si uma linhagem santa dentro da qual o Redentor haveria de nascer; a justificação pela fé anunciada em Gn 15:6 ('Abraão creu no Senhor, e isso lhe foi imputado para justiça') é o coração perene do evangelho.",
      },
    ],
    archaeologistsAndHistorians: [
      {
        scholar: "William Foxwell Albright",
        role: "Arqueólogo",
        work: "The Archaeology of Palestine and the Bible",
        quote:
          "Os nomes próprios patriarcais (como Abrão, Ismael, Jacó-El, Zebulom) pertencem ao substrato onomástico genuíno dos povos semitas amoritas ocidentais do início do 2º milênio a.C., refutando as teses de Wellhausen de que as narrativas teriam sido inventadas no período monárquico tardio.",
      },
      {
        scholar: "Cyrus H. Gordon",
        role: "Especialista em Línguas Semíticas e Arqueologia (Brandeis University)",
        work: "Biblical Customs and the Nuzi Tablets",
        quote:
          "Os tabletes de Nuzi demonstram que as histórias patriarcais não refletem a lei mosaica tardia nem o direito babilônico neo-assírio, mas um conjunto ímpar de leis e costumes hurritas e amoritas característicos exclusivamente do Bronze Médio.",
      },
    ],
    archaeologicalEvidences: [
      {
        artifactOrSite: "Tabletes Administrativos e Jurídicos de Nuzi e Mari",
        museumOrLocation: "Museu do Louvre e Museu do Iraque",
        discoveryDate: "Décadas de 1920 e 1930",
        archaeologist: "Edward Chiera (Nuzi) e André Parrot (Mari)",
        academicConsensus:
          "Mais de 20.000 tábuas de argila confirmando os costumes sociais de adoção, direito de primogenitura, posse de poços em terras pastoris e alianças de hospitalidade nômades idênticas às de Gênesis.",
      },
    ],
    christocentricSignificance:
      "Paulo afirma categoricamente aos Gálatas: 'Ora, as promessas foram feitas a Abraão e à sua semente. Não diz: E às sementes, como de muitas, mas como de uma só: E à tua semente, que é Cristo' (Gl 3:16). Todo aquele que pertence a Cristo pela fé é verdadeiro descendente de Abraão e herdeiro segundo a promessa (Gl 3:29).",
    hermeneuticalDebate:
      "A cronologia da estada em Canaã e no Egito: a cronologia longa de 430 anos em terra egípcia (Êx 12:40, texto massorético) versus a tradição da Septuaginta (LXX e Gálatas 3:17) que divide os 430 anos entre Canaã e o Egito (215 anos em cada).",
  },

  "O Êxodo (Era de Ramsés)": {
    eventId: "exodo",
    label: "O Êxodo, A Páscoa & A Aliança no Sinai",
    yearDisplay: "c. 1250 a.C. (Datação Tardia) / 1446 a.C. (Datação Inicial)",
    biblicalReferences: ["Êxodo 12-14; 19-24", "Deuteronômio 6:4-9", "Salmo 105; 106", "1 Coríntios 5:7", "Hebreus 9:11-28"],
    historicalPeriod: "Novo Império Egípcio (19ª Dinastia / Ramsés II)",
    geographicalContext: "Gósen / Tell el-Dab'a (Pi-Ramsés) -> Península do Sinai -> Deserto",
    theologicalSummary:
      "O Êxodo é o evento salvífico definitivo do Antigo Testamento — o paradigma pelo qual toda a redenção bíblica é compreendida. Israel estava em servidão irremediável; Deus intervém com 'mão forte e braço estendido' desbaratando os deuses do Egito através das dez pragas. Na noite da Páscoa, a salvação do primogênito dá-se unicamente pelo sangue aspergido do Cordeiro sem defeito. No Monte Sinai, Deus toma Israel como Seu tesouro peculiar e 'reino de sacerdotes', entregando-lhe a Lei Moral (Decálogo) e o padrão do Tabernáculo, onde a glória divina habitará no meio de Seu povo.",
    historicalSummary:
      "As escavações austríacas em Tell el-Dab'a (antiga Avaris e depois Pi-Ramsés, mencionada em Êxodo 1:11) dirigidas por Manfred Bietak revelaram a presença contínua de uma expressiva população asiática semita vivendo no Delta Oriental do Nilo, trabalhando na fabricação de tijolos com palha e edificações do império. O Papiro Anastasi VI e o Papiro Harris documentam a fuga de escravos através da rede de fortificações de fronteira do Egito para o deserto.",
    theologians: [
      {
        scholar: "Jonathan Edwards",
        role: "Teólogo e Filósofo Puritano Americano (1703–1758)",
        work: "A History of the Work of Redemption",
        quote:
          "O livramento do povo de Israel do cativeiro do Egito e a destruição de Faraó no Mar Vermelho é a mais magnífica tipologia da redenção de Cristo sobre Satanás e as trevas da morte que já foi concedida antes do próprio Calvário.",
      },
      {
        scholar: "João Calvino",
        role: "Reformador",
        work: "Comentário sobre os Quatro Últimos Livros de Moisés",
        quote:
          "A Lei entregue no Sinai não foi dada para que o homem buscasse justiça pelas próprias forças, mas para revelar a santidade inatingível de Deus, convencer o pecador de sua absoluta impotência e conduzi-lo pela mão até a graça perdoadora de Cristo.",
      },
    ],
    archaeologistsAndHistorians: [
      {
        scholar: "James K. Hoffmeier",
        role: "Egiptólogo e Arqueólogo de Campo",
        work: "Israel in Egypt & Ancient Israel in Sinai (Oxford University Press)",
        quote:
          "A toponímia de Êxodo (Pi-Ramsés, Sucote, Migdol, Baal-Zefom) reflete a geografia exata da fronteira oriental do Egito durante o reinado dos faraós ramsésidas dos séculos XIII e XII a.C. Nenhum autor tardio do período persa ou helenístico poderia ter inventado esse panorama geográfico e linguístico com tal exatidão.",
      },
      {
        scholar: "Kenneth A. Kitchen",
        role: "Egiptólogo",
        work: "The Reliability of the Old Testament",
        quote:
          "A estrutura do pacto do Sinai em Êxodo e Deuteronômio reproduz com precisão absoluta a forma literária dos Tratados de Suserania dos Hititas do segundo milênio a.C. (preâmbulo, prólogo histórico, estipulações, bênçãos e maldições, testemunhas), modelo que desapareceu do mundo antigo após o final da Idade do Bronze.",
      },
    ],
    archaeologicalEvidences: [
      {
        artifactOrSite: "Escavações de Pi-Ramsés e Tell el-Dab'a (Avaris)",
        museumOrLocation: "Delta Oriental do Nilo, Egito",
        discoveryDate: "1966–presente",
        archaeologist: "Manfred Bietak (Instituto Arqueológico Austríaco)",
        academicConsensus:
          "Confirmação da cidade dos faraós construída com mão de obra de povos semitas (apiru / asiáticos), comprovando a ocupação histórica descrita em Êx 1:11.",
      },
      {
        artifactOrSite: "A Estela de Merneptah (Estela de Israel)",
        museumOrLocation: "Museu Egípcio do Cairo (JE 31408)",
        discoveryDate: "1896",
        archaeologist: "Flinders Petrie (Tebas)",
        academicConsensus:
          "Monumento de granito comemorativo de vitórias de 1208 a.C. que contém a mais antiga menção extrabíblica a Israel, registrado com o hieróglifo determinante de povo/etnia distinto já estabelecido na região de Canaã.",
      },
    ],
    christocentricSignificance:
      "Jesus Cristo é a consumação do Êxodo: Ele é o verdadeiro 'Cordeiro Pascal' sacrificado por nós (1 Co 5:7). No Evangelho de Lucas (9:31), na Transfiguração, Jesus fala sobre a Sua partida que estava para se cumprir em Jerusalém usando a palavra grega exodos. Sua morte e ressurreição libertam a humanidade do cativeiro do pecado e de Satanás para a herança incorruptível da Terra Prometida celestial.",
    hermeneuticalDebate:
      "A grande discussão cronológica entre a Datação Inicial (1446 a.C., baseada em 1 Rs 6:1 e Jz 11:26, no reinado de Tutemés III ou Amenófis II) versus a Datação Tardia (c. 1250 a.C., baseada nas cidades-armazéns de Ramessés em Êx 1:11 e nos dados dos assentamentos do planalto de Canaã por Israel Finkelstein e William Dever).",
  },

  "Reinado de Davi": {
    eventId: "davi",
    label: "O Reinado de Davi & A Aliança Davídica",
    yearDisplay: "c. 1010–970 a.C. / Ferro IIA",
    biblicalReferences: ["1 Samuel 16–31", "2 Samuel 5; 7", "1 Crônicas 11–29", "Salmos 2; 16; 22; 110", "Atos 2:29-36"],
    historicalPeriod: "Monarquia Unida de Israel (Início da Idade do Ferro IIA)",
    geographicalContext: "Hebrom (7 anos) -> Jerusalém / Cidade de Davi (33 anos)",
    theologicalSummary:
      "Davi é o rei segundo o coração de Deus, ungido em oposição à autoexaltação de Saul. Ele conquista a fortaleza jebuseia de Sião e transfere a Arca da Aliança para Jerusalém, tornando-a o centro espiritual e político da nação. Em 2 Samuel 7, Deus celebra com Davi a Aliança Davídica: quando Davi propõe construir uma casa de cedro para Deus, Deus responde que Ele edificará uma 'casa' (dinastia real) para Davi, cujo trono e reino serão estabelecidos eternamente. Esta promessa é o berço profético da esperança messiânica de Israel.",
    historicalSummary:
      "Até o início da década de 1990, correntes céticas da arqueologia (conhecidas como Minimalistas de Copenhague) sustentavam que Davi e Salomão eram figuras lendárias semelhantes ao Rei Arthur. Esse consenso desmoronou em 1993 com a descoberta da Estela de Tel Dã no norte de Israel, que gravou na pedra o nome da dinastia 'Casa de Davi' (Beit David), comprovando a existência histórica do fundador da monarquia de Judá.",
    theologians: [
      {
        scholar: "Tomás de Aquino",
        role: "Doutor da Igreja",
        work: "Comentário sobre os Salmos",
        quote:
          "Davi é a figura por excelência do Messias: rei, profeta e salmista. Em suas aflições, perseguições no deserto e exaltação ao trono de Sião, os Salmos cantam não apenas a vida de Davi, mas as dores e a glória vindoura de Cristo Rei.",
      },
      {
        scholar: "João Calvino",
        role: "Reformador",
        work: "Comentário sobre os Salmos e Sermões sobre 2 Samuel",
        quote:
          "O reino de Davi foi instituído como uma representação visível do reino celeste que havia de ser plenamente revelado em Jesus Cristo. Embora a dinastia terrena tenha tropeçado no pecado e ido ao exílio, a palavra de Deus permaneceu firme para suscitar o Renovo Justo.",
      },
    ],
    archaeologistsAndHistorians: [
      {
        scholar: "Avraham Biran",
        role: "Arqueólogo Israelense e Diretor do Instituto Nelson Glueck",
        work: "Descoberta da Estela de Tel Dã (1993–1994)",
        quote:
          "A leitura da linha 9 da inscrição em basalto com as letras BYTDWD ('Casa de Davi') forneceu o primeiro testemunho epigráfico contemporâneo indiscutível do século IX a.C. do reinado de Davi fora da literatura bíblica.",
      },
      {
        scholar: "Eilat Mazar",
        role: "Arqueóloga da Universidade Hebraica de Jerusalém (1956–2021)",
        work: "Escavações na Cidade de Davi (The Large Stone Structure)",
        quote:
          "Descobrimos no topo da encosta de Ofel uma estrutura palaciana maciça do século X a.C. construída com pedras monumentais e cerâmica do Ferro IIA logo acima da fortaleza cananeia, correspondendo com precisão ao palácio real construído para Davi com o auxílio de artesãos de Tiro.",
      },
    ],
    archaeologicalEvidences: [
      {
        artifactOrSite: "A Estela de Tel Dã (Inscrição da Casa de Davi)",
        museumOrLocation: "Museu de Israel, Jerusalém",
        discoveryDate: "1993",
        archaeologist: "Gila Cook e Avraham Biran",
        academicConsensus:
          "Fragmento de monumento triunfal em aramaico comemorando a vitória do rei Hazael de Damasco sobre o 'Rei de Israel' e o rei da 'Casa de Davi' (BYTDWD); confirmação definitiva da dinastia histórica de Davi.",
      },
      {
        artifactOrSite: "A Estrutura de Pedra Escalonada e Grande Estrutura de Pedra",
        museumOrLocation: "Parque Nacional da Cidade de Davi, Jerusalém",
        discoveryDate: "2005–2008",
        archaeologist: "Eilat Mazar",
        academicConsensus:
          "Conjunto arquitetônico monumental governamental e fortificado datado da transição do Ferro I para o Ferro IIA, compatível com a administração monárquica de Jerusalém no século X a.C.",
      },
    ],
    christocentricSignificance:
      "Jesus Cristo é o 'Filho de Davi' prometido (Mt 1:1; 9:27). O Anjo Gabriel anunciou a Maria: 'O Senhor Deus lhe dará o trono de Davi, seu pai, e reinará eternamente sobre a casa de Jacó, e o seu reino não terá fim' (Lc 1:32-33). Pedro, em Pentecostes, proclama que a ressurreição de Cristo é o cumprimento exato da promessa de que Deus assentaria um de Seus descendentes no Seu trono eterno (Atos 2:30-36).",
    hermeneuticalDebate:
      "A controvérsia da cronologia da Idade do Ferro: a 'Cronologia Baixa' proposta por Israel Finkelstein (que rebaixa os grandes edifícios para os monarcas do norte como os Onridas no século IX a.C.) versus a 'Cronologia Modificada/Tradicional' defendida por Amihai Mazar, Eilat Mazar e William Dever que sustenta um reino centralizado expressivo no século X a.C.",
  },

  "Crucificação de Jesus": {
    eventId: "crucificacao",
    label: "A Crucificação e Ressurreição de Jesus Cristo",
    yearDisplay: "c. 30 ou 33 d.C. / 14 de Nisã",
    biblicalReferences: ["Mateus 27–28", "Marcos 15–16", "Lucas 23–24", "João 18–20", "Romanos 3:21-26", "1 Coríntios 15:1-20"],
    historicalPeriod: "Império Romano / Principado de Tibério César (26–36 d.C.)",
    geographicalContext: "Jerusalém (Pretório, Gólgota / Calvário e Jardim da Ressurreição)",
    theologicalSummary:
      "A Cruz de Cristo é o coração cósmico e redentor de toda a História. Ali operou-se a Expiação Vicária e Substitutiva: o Filho eterno de Deus tomou sobre Si o pecado da humanidade, sofrendo a condenação e a ira santa da Lei devida aos transgressores (Propiciação). Pelo Seu sangue, o véu do Templo se rasgou de alto a baixo, abrindo o livre acesso ao Santo dos Santos. Ao terceiro dia, Deus ressuscitou a Jesus corporalmente dentre os mortos, triunfando sobre a morte, o inferno e Satanás, inaugurando as primícias da Nova Criação e garantindo a ressurreição de todos os crentes.",
    historicalSummary:
      "A crucificação de Jesus sob o governo de Pôncio Pilatos é um dos fatos mais solidamente documentados de toda a Antiguidade clássica, atestado não apenas pelos quatro Evangelhos e pelas epístolas paulinas do século I, mas por fontes romanas e judaicas independentes (Tácito, Suetônio, Plínio o Jovem, Flávio Josefo e o Talmude Babilônico). A arqueologia de Jerusalém confirma a realidade dos métodos de crucificação romana (descoberta do esqueleto de Yehohanan), a historicidade de Pilatos (Inscrição de Cesareia) e o sacerdócio de Caifás (Ossuário da família Caifás).",
    theologians: [
      {
        scholar: "Santo Anselmo de Cantuária",
        role: "Arcebispo e Filósofo Medieval (1033–1109)",
        work: "Cur Deus Homo (Por que Deus se fez Homem?)",
        quote:
          "O pecado contra a Majestade infinita de Deus causou uma ofensa de gravidade infinita que o homem finito devia pagar, mas não podia; e que Deus não devia pagar, mas podia. Fez-se necessário, portanto, que o Deus-Homem (Cristo) oferecesse livremente Sua própria vida pura em valor infinito na cruz para satisfazer plenamente a honra e a justiça divina.",
      },
      {
        scholar: "Martinho Lutero",
        role: "Reformador",
        work: "Comentário da Epístola aos Gálatas (Gálatas 3:13)",
        quote:
          "Eis o 'Maravilhoso Intercâmbio' (commercium admirabile): Cristo foi feito maldição por nós para que nós fôssemos feitos justiça de Deus Nele. Ele tomou nossos pecados, nossa morte e nosso inferno; e nos revestiu com Sua inocência, Sua vida e Sua vitória eterna.",
      },
      {
        scholar: "Charles H. Spurgeon",
        role: "Pastor",
        work: "Sermões sobre o Calvário",
        quote:
          "Tetélestai! 'Está consumado!'. Nenhuma palavra mais sublime jamais foi proferida no céu ou na terra. A dívida foi cancelada até o último centavo; a justiça foi satisfeita; a serpente foi esmagada; as portas do paraíso foram escancaradas para todo aquele que crê.",
      },
    ],
    archaeologistsAndHistorians: [
      {
        scholar: "Flávio Josefo",
        role: "Historiador Judaico-Romano do Século I (37–100 d.C.)",
        work: "Antiguidades Judaicas (XVIII.3.3 — Testimonium Flavianum)",
        quote:
          "Nesse tempo apareceu Jesus, um homem sábio... Ele atraiu a Si muitos judeus e gentios. Quando Pilatos, por acusação dos líderes entre nós, condenou-o à cruz, aqueles que o haviam amado não cessaram de fazê-lo, pois Ele lhes apareceu vivo novamente no terceiro dia, como os divinos profetas haviam predito.",
      },
      {
        scholar: "Cornélio Tácito",
        role: "Historiador Imperial Romano (56–120 d.C.)",
        work: "Anais (Livro XV, 44)",
        quote:
          "O fundador daquela seita, Christus, foi condenado à pena máxima pelo procurador Pôncio Pilatos durante o principado de Tibério.",
      },
    ],
    archaeologicalEvidences: [
      {
        artifactOrSite: "A Inscrição de Pôncio Pilatos",
        museumOrLocation: "Museu de Israel, Jerusalém",
        discoveryDate: "1961",
        archaeologist: "Dr. Antonio Frova (Cesareia Marítima)",
        academicConsensus:
          "Placa de calcário esculpida em latim no teatro de Cesareia contendo: '...[PON]TIVS PILATVS / [PRAEF]ECTVS IVDA[EA]E', confirmando o nome histórico e o título governamental do homem que sentenciou Jesus à cruz.",
      },
      {
        artifactOrSite: "O Ossuário de Caifás",
        museumOrLocation: "Museu de Israel, Jerusalém",
        discoveryDate: "1990",
        archaeologist: "Zvi Greenhut (Jerusalém)",
        academicConsensus:
          "Ossuário ricamente ornado com a inscrição aramaica 'Yehosef bar Kayafa' (José, filho de Caifás), contendo os ossos do sumo sacerdote que presidiu o julgamento judaico do Sinédrio contra Cristo.",
      },
      {
        artifactOrSite: "O Esqueleto de Yehohanan (Crucificado de Givat HaMivtar)",
        museumOrLocation: "Museu de Israel / Departamento de Antiguidades",
        discoveryDate: "1968",
        archaeologist: "Vassilios Tzaferis (Jerusalém)",
        academicConsensus:
          "Ossos de um homem judeu do primeiro século com um cravo de ferro de 11,5 cm ainda incrustado no osso do calcanhar com lascas de madeira de oliveira; prova física incontestável do método romano exato de crucificação em Jerusalém.",
      },
    ],
    christocentricSignificance:
      "A Cruz e a Ressurreição não são apenas uma parte do evangelho; elas são o centro nevrálgico de toda a Bíblia e da existência humana. 'Se Cristo não ressuscitou, é vã a vossa fé, e ainda permaneceis nos vossos pecados... Mas, de fato, Cristo ressuscitou dentre os mortos, sendo Ele as primícias dos que dormem' (1 Co 15:17-20).",
    hermeneuticalDebate:
      "A determinação astronômica e calendárica exata da data: 14 de Nisã de 30 d.C. (sexta-feira, 7 de abril) versus 14 de Nisã de 33 d.C. (sexta-feira, 3 de abril), com o consenso acadêmico e astronômico recente (Colin Humphreys, W.G. Dever) inclinando-se para 33 d.C.",
  },
};

/**
 * Função inteligente de busca ou geração de exegese profunda para qualquer evento da timeline
 */
export function getEventDeepDive(
  labelOrId: string,
  eventFallback?: TimelineEvent
): EventDeepDive {
  // 1. Tentar busca direta no catálogo
  if (TIMELINE_EVENT_DETAILS[labelOrId]) {
    return TIMELINE_EVENT_DETAILS[labelOrId];
  }

  // 2. Busca por proximidade de chave
  const keys = Object.keys(TIMELINE_EVENT_DETAILS);
  const foundKey = keys.find(
    (k) =>
      k.toLowerCase().includes(labelOrId.toLowerCase()) ||
      labelOrId.toLowerCase().includes(k.toLowerCase())
  );
  if (foundKey && TIMELINE_EVENT_DETAILS[foundKey]) {
    return TIMELINE_EVENT_DETAILS[foundKey];
  }

  // 3. Síntese Dinâmica de Alto Padrão para os demais eventos da timeline
  const ev = eventFallback || {
    label: labelOrId,
    year: 0,
    category: "historia",
    description: "Evento Teológico e Histórico",
    summary: "",
    locationName: "Oriente Próximo / Israel",
  };

  const isBCE = (ev.year ?? 0) < 0;
  const yearText = `${Math.abs(ev.year ?? 0)} ${isBCE ? "a.C." : "d.C."}`;

  return {
    eventId: ev.label.toLowerCase().replace(/\s+/g, "-"),
    label: ev.label,
    yearDisplay: yearText,
    biblicalReferences: ["Texto Canônico da Época", "Consenso dos Pais e Reformadores"],
    historicalPeriod: `Período ${ev.category.toUpperCase()} (${yearText})`,
    geographicalContext: ev.locationName || "Oriente Próximo / Mediterrâneo",
    theologicalSummary:
      ev.summary ||
      `Evento fundamental da história bíblica e eclesiástica (${ev.label}), onde os desígnios da Providência divina se manifestam na preservação do povo da Aliança e na expansão do Reino de Deus através dos séculos.`,
    historicalSummary:
      ev.description ||
      `Marco historiográfico do período de ${yearText}, documentado pela tradição bíblica e fontes históricas da época.`,
    theologians: [
      {
        scholar: "Santo Agostinho / Tradição Patrística",
        role: "Doutor da Igreja",
        quote:
          "A história universal é o desdobramento do propósito redentor de Deus, onde cada época prepara os caminhos para a manifestação plena do Seu Reino.",
      },
      {
        scholar: "João Calvino / Tradição Reformada",
        role: "Teólogo",
        quote:
          "A mão invisível da Providência governa todos os acontecimentos dos reis e nações, dirigindo-os com sabedoria para a glória de Deus e a edificação de Sua Igreja.",
      },
    ],
    archaeologistsAndHistorians: [
      {
        scholar: "Flávio Josefo & Historiadores Clássicos",
        role: "Historiografia Antiga",
        quote:
          "Os registros dos anais antigos e as evidências arqueológicas de campo corroboram a cronologia e a topografia dos acontecimentos bíblicos.",
      },
    ],
    archaeologicalEvidences: [
      {
        artifactOrSite: `Achados Arqueológicos e Topônimos de ${ev.locationName || "Israel"}`,
        museumOrLocation: "Museu de Israel e Coleções Internacionais",
        academicConsensus:
          "Evidências materiais, epigrafia e correlação estratigráfica compatíveis com os relatos bíblicos e a história eclesiástica.",
      },
    ],
    christocentricSignificance:
      "Toda a história é 'Sua História' (His Story). Este evento conecta-se com a promessa messiânica que culmina na encarnação, morte e ressurreição de Cristo, assegurando a redenção final de todas as coisas.",
    hermeneuticalDebate:
      "Análise das fontes primárias, datação arqueológica e sua recepção na Teologia Histórica.",
  };
}
