export interface RouteWaypoint {
  title: string;
  step: string;
  coords: [number, number]; // [lat, lng]
  img: string;
  verse: string;
  quote: string;
  bible: string;
  geo: string;
  arch: string;
  modelType: 'ark' | 'altar' | 'pillar' | 'scroll' | 'ship';
  modelName: string;
}

export interface TheologicalRoute {
  id: string;
  title: string;
  description: string;
  waypoints: RouteWaypoint[];
}

export const THEOLOGICAL_ROUTES: Record<string, TheologicalRoute> = {
  abraao: {
    id: 'abraao',
    title: 'Jornada de Abraão',
    description:
      'De Ur dos Caldeus até Canaã e Egito: a jornada do Pai da Fé em resposta à promessa incondicional de Deus.',
    waypoints: [
      {
        title: 'Ur dos Caldeus',
        step: 'Passo 1',
        coords: [30.962, 46.1031],
        img: 'https://images.unsplash.com/photo-1608958416629-106ab0e5c9b7?auto=format&fit=crop&w=800&q=80',
        verse: 'Gênesis 11:31',
        quote:
          'Tomou Terá a Abrão seu filho... e saíram de Ur dos Caldeus para ir à terra de Canaã...',
        bible:
          'O início da peregrinação familiar partindo da metrópole suméria.',
        geo: 'Sul da Mesopotâmia, planície aluvial perto do Golfo Pérsico.',
        arch: 'Grande zigurate de Ur escavado por Sir Leonard Woolley.',
        modelType: 'altar',
        modelName: 'Zigurate de Ur',
      },
      {
        title: 'Harã (Norte da Mesopotâmia)',
        step: 'Passo 2',
        coords: [36.8647, 39.0286],
        img: 'https://images.unsplash.com/photo-1547124220-405bbfd84f5c?auto=format&fit=crop&w=800&q=80',
        verse: 'Gênesis 12:1-4',
        quote:
          'Ora, o Senhor disse a Abrão: Sai da tua terra... e partiu Abrão, como o Senhor lhe dissera...',
        bible:
          'O chamado incondicional de Deus e a promessa de fazer dele uma grande nação.',
        geo: 'Rota de caravanas no vale do rio Balikh (atual Turquia).',
        arch: 'Arquitetura tradicional de adobe em cúpula de colmeia.',
        modelType: 'scroll',
        modelName: 'Pergaminho da Aliança',
      },
      {
        title: 'Siquém (Primeiro Altar em Canaã)',
        step: 'Passo 3',
        coords: [32.2134, 35.2789],
        img: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80',
        verse: 'Gênesis 12:6-7',
        quote:
          'E apareceu o Senhor a Abrão, e disse: À tua semente darei esta terra. E edificou ali um altar ao Senhor.',
        bible: 'Primeiro altar construído na terra sob o carvalho de Moré.',
        geo: 'Passo estreito entre o Monte Ebal e Gerizim.',
        arch: 'Muralhas ciclópicas de Tell Balata do Bronze Médio.',
        modelType: 'altar',
        modelName: 'Altar de Siquém',
      },
      {
        title: 'Betel e Ai',
        step: 'Passo 4',
        coords: [31.9333, 35.2167],
        img: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80',
        verse: 'Gênesis 12:8',
        quote:
          'E moveu-se dali para o monte à banda do oriente de Betel, e armou a sua tenda... e edificou ali um altar ao Senhor.',
        bible: 'Invocação pública do nome de Yahweh entre Betel e Ai.',
        geo: 'Cumeeira montanhosa central de Canaã.',
        arch: 'Assentamentos cananeus fortificados.',
        modelType: 'altar',
        modelName: 'Altar de Betel',
      },
      {
        title: 'Egito (Delta do Nilo)',
        step: 'Passo 5',
        coords: [30.0444, 31.2357],
        img: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=800&q=80',
        verse: 'Gênesis 12:10',
        quote:
          'E havia fome naquela terra; e desceu Abrão ao Egito, para peregrinar ali...',
        bible:
          'O teste de fé de Abraão diante da fome e a preservação soberana da promessa.',
        geo: 'Delta oriental do Nilo, celeiro fértil do mundo antigo.',
        arch: 'Inscrições dinásticas de Tânis e Ávaris comprovando migrações semíticas no Médio Império.',
        modelType: 'altar',
        modelName: 'Refúgio no Egito',
      },
      {
        title: 'Hebrom (Carvalhais de Manre)',
        step: 'Passo 6',
        coords: [31.5298, 35.0938],
        img: 'https://images.unsplash.com/photo-1547124220-405bbfd84f5c?auto=format&fit=crop&w=800&q=80',
        verse: 'Gênesis 13:18 // Gênesis 18:1',
        quote:
          'E Abrão mudou as suas tendas, e foi, e habitou nos carvalhais de Manre, que estão junto a Hebrom; e edificou ali um altar ao Senhor.',
        bible:
          'A visitação dos três anjos, a promessa do nascimento de Isaque e a compra da caverna de Macpela.',
        geo: 'Montes altos de Judá a 930m de altitude.',
        arch: 'Enclosure herodiano monumental de Macpela.',
        modelType: 'altar',
        modelName: 'Altar de Manre',
      },
      {
        title: 'Monte Moriá (O Sacrifício de Isaque)',
        step: 'Passo 7',
        coords: [31.7777, 35.2354],
        img: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=800&q=80',
        verse: 'Gênesis 22:2-14',
        quote:
          'Deus proverá para si o cordeiro para o holocausto, meu filho... e chamou Abraão o nome daquele lugar: O Senhor Proverá (Jeová-Jiré).',
        bible:
          'O cume do teste de fé: a substituição do cordeiro no altar prenunciando o Calvário.',
        geo: 'Colina calcária onde séculos depois Salomão erigiu o Templo de Jerusalém.',
        arch: 'A Rocha Sagrada na esplanada do Monte do Templo.',
        modelType: 'altar',
        modelName: 'Altar de Jeová-Jiré',
      },
    ],
  },
  jaco: {
    id: 'jaco',
    title: '2. A Peregrinação de Jacó',
    description:
      'De Berseba a Padã-Arã e de volta à terra da Promessa: a visão da Escada Celestial, a luta em Peniel e o encontro com Israel.',
    waypoints: [
      {
        title: 'Berseba (Partida de Canaã)',
        step: 'Passo 1',
        coords: [31.2456, 34.7925],
        img: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
        verse: 'Gênesis 28:10',
        quote: 'Partiu, pois, Jacó de Berseba, e foi a Harã.',
        bible:
          'A fuga solitária após a bênção patriarcal para escapar da ira de Esaú.',
        geo: "Limite sul da ocupação israelita ('desde Dã até Berseba').",
        arch: 'Poços milenares de Tel Beer Sheba e altares de chifres da Idade do Ferro.',
        modelType: 'pillar',
        modelName: 'Poço de Berseba',
      },
      {
        title: 'Betel (A Escada Celestial)',
        step: 'Passo 2',
        coords: [31.9333, 35.2167],
        img: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
        verse: 'Gênesis 28:12-19',
        quote:
          'E sonhou: e eis uma escada posta na terra, cujo topo tocava nos céus; e eis que os anjos de Deus subiam e desciam por ela.',
        bible:
          'A revelação da Casa de Deus (Bet-El) e a unção da coluna de pedra com azeite.',
        geo: 'Cume rochoso nos montes de Benjamim ao norte de Jerusalém.',
        arch: 'Santuário cananeu arcaico sob o Tell de Beitin.',
        modelType: 'pillar',
        modelName: 'Coluna de Betel',
      },
      {
        title: 'Padã-Arã (Harã)',
        step: 'Passo 3',
        coords: [36.8647, 39.0286],
        img: 'https://images.unsplash.com/photo-1547124220-405bbfd84f5c?auto=format&fit=crop&w=800&q=80',
        verse: 'Gênesis 29:1-20',
        quote:
          'E serviu Jacó sete anos por Raquel; e estes lhe pareceram como poucos dias, pelo muito que a amava.',
        bible:
          'Os 20 anos de trabalho diligente na casa de Labão, onde nasceram os patriarcas das 12 tribos.',
        geo: 'Região fértil de pastagens do rio Balikh na Mesopotâmia setentrional.',
        arch: 'Inscrições e relevos cuneiformes retratando tratados familiares pastorais arameus.',
        modelType: 'scroll',
        modelName: 'Contrato de Padã-Arã',
      },
      {
        title: 'Peniel (Luta com o Anjo)',
        step: 'Passo 4',
        coords: [32.25, 35.65],
        img: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=800&q=80',
        verse: 'Gênesis 32:24-30',
        quote:
          'E chamou Jacó o nome daquele lugar Peniel, porque dizia: Vi a Deus face a face, e a minha alma foi salva.',
        bible:
          'A luta noturna no vau do Jaboque: Jacó tem a coxa deslocada e recebe o novo nome de ISRAEL.',
        geo: 'Garganta sinuosa do rio Jaboque descendo em direção ao vale do Jordão.',
        arch: 'Tell edh-Dhahab esh-Sherqiyeh controlando o passo do Jaboque.',
        modelType: 'altar',
        modelName: 'Memorial de Israel',
      },
      {
        title: 'Siquém (O Poço de Jacó)',
        step: 'Passo 5',
        coords: [32.2134, 35.2789],
        img: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80',
        verse: 'Gênesis 33:18-20',
        quote:
          'E comprou uma parte do campo... e levantou ali um altar, e chamou-lhe: Deus, o Deus de Israel.',
        bible:
          'A compra da herdade onde Jacó cavou o histórico poço que séculos depois foi palco da conversa de Jesus com a Samaritana.',
        geo: 'Vale amplo e fértil entre os montes Ebal e Gerizim.',
        arch: 'Poço de Jacó escavado na rocha viva com mais de 35 metros de profundidade preservado em Nablus.',
        modelType: 'altar',
        modelName: 'Poço de Jacó',
      },
      {
        title: 'Hebrom e descida a Gósen',
        step: 'Passo 6',
        coords: [31.5298, 35.0938],
        img: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=800&q=80',
        verse: 'Gênesis 46:1-4',
        quote:
          'Não temas descer ao Egito, porque eu te farei ali uma grande nação. Eu descerei contigo ao Egito, e certamente te farei tornar a subir...',
        bible:
          'A reunião da família com Isaque e a descida de 70 almas ao Egito nos carros enviados por José.',
        geo: 'De Hebrom e Berseba cruzando o deserto de Sur até a terra de Gósen no Egito.',
        arch: 'Enterro solene de Jacó na caverna de Macpela com grande comitiva fúnebre egípcia (Gn 50).',
        modelType: 'scroll',
        modelName: 'Genealogia de Israel',
      },
    ],
  },
  jose_egito: {
    id: 'jose_egito',
    title: '3. A Trajetória de José no Egito',
    description:
      'Do vale de Hebrom à cisterna de Dotã e ao governo supremo do Império Egípcio: a providência divina que salvou o povo da Aliança.',
    waypoints: [
      {
        title: 'Vale de Hebrom (A Túnica de Cores)',
        step: 'Passo 1',
        coords: [31.5298, 35.0938],
        img: 'https://images.unsplash.com/photo-1547124220-405bbfd84f5c?auto=format&fit=crop&w=800&q=80',
        verse: 'Gênesis 37:3-14',
        quote:
          'E Israel amava a José mais do que a todos os seus filhos... e fez-lhe uma túnica de várias cores.',
        bible:
          'Os sonhos proféticos dos feixes e dos astros celestes que despertaram o ciúme dos irmãos.',
        geo: 'Montes férteis de Hebrom.',
        arch: 'Pinturas de tumbas egípcias de Beni Hasan mostram nobres semitas usando túnicas coloridas e multicoloridas.',
        modelType: 'scroll',
        modelName: 'Túnica de José',
      },
      {
        title: 'Dotã (A Cisterna e a Venda)',
        step: 'Passo 2',
        coords: [32.4167, 35.25],
        img: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
        verse: 'Gênesis 37:17-28',
        quote:
          'Vinde, pois, e vendamo-lo a estes ismaelitas... e venderam José aos ismaelitas por vinte moedas de prata.',
        bible:
          'A traição dos irmãos na encruzilhada de caravanas e o início da provação redentora.',
        geo: 'Planície de Dotã, passo geográfico obrigatório da Via Maris em direção ao Egito.',
        arch: 'Tell Dothan: escavações revelam cisternas em forma de garrafa escavadas na rocha calcária.',
        modelType: 'altar',
        modelName: 'Cisterna de Dotã',
      },
      {
        title: 'Ávaris / Mênfis (Palácio do Faraó)',
        step: 'Passo 3',
        coords: [29.85, 31.25],
        img: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=800&q=80',
        verse: 'Gênesis 41:39-44',
        quote:
          'Disse mais o Faraó a José: Vês aqui te tenho posto sobre toda a terra do Egito... e tirou o seu anel da mão, e o pôs na mão de José.',
        bible:
          'A fidelidade na casa de Potifar, na prisão e a interpretação das 7 vacas gordas e magras elevando-o a Grão-Vizir.',
        geo: 'Capital política e administrativa do Egito Antigo às margens do Nilo.',
        arch: "Escavações em Tell el-Dab'a (Ávaris) revelaram um palácio de estilo sírio-palestino com túmulo piramidal e estátua de oficial com túnica colorida.",
        modelType: 'scroll',
        modelName: 'Anel de Sinete do Faraó',
      },
      {
        title: 'Terra de Gósen (Celeiro e Reunião)',
        step: 'Passo 4',
        coords: [30.7871, 31.8214],
        img: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80',
        verse: 'Gênesis 45:7-8 // Gênesis 50:20',
        quote:
          'Deus me enviou adiante de vós, para conservar vossa sucessão na terra... Vós bem intentastes mal contra mim; porém Deus o intentou para bem...',
        bible:
          'O grande perdão aos irmãos, a provisão dos celeiros e o cumprimento dos propósitos salvíficos de Deus.',
        geo: 'Delta oriental do Nilo, região de abundantes pastagens.',
        arch: 'Silos monumentais egípcios de grãos com capacidade para armazenar safras durante secas prolongadas.',
        modelType: 'altar',
        modelName: 'Celeiros de José',
      },
    ],
  },
  exodo: {
    id: 'exodo',
    title: 'Rota do Êxodo',
    description:
      'A libertação milagrosa de Israel do Egito, a travessia do Mar Vermelho, a revelação no Sinai e os 40 anos até a fronteira de Canaã.',
    waypoints: [
      {
        title: 'Ramsés (Goshen)',
        step: 'Passo 1',
        coords: [30.7871, 31.8214],
        img: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=800&q=80',
        verse: 'Êxodo 12:37',
        quote:
          'Assim partiram os filhos de Israel de Ramsés para Sucote, cerca de seiscentos mil homens a pé...',
        bible:
          'O ponto de partida da redenção de Israel sob a liderança de Moisés após as dez pragas.',
        geo: 'Delta oriental do Nilo, terra fértil de Gósen (antiga Pi-Ramsés).',
        arch: 'Escavações em Qantir confirmam a gigantesca capital raméssida do segundo milênio a.C.',
        modelType: 'scroll',
        modelName: 'Memorial do Êxodo',
      },
      {
        title: 'Sucote',
        step: 'Passo 2',
        coords: [30.55, 32.1833],
        img: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
        verse: 'Êxodo 13:20',
        quote:
          'E partiram de Sucote, e acamparam-se em Etam, no fim do deserto.',
        bible:
          'Primeiro grande acampamento organizado onde a coluna de nuvem e fogo começou a guiar o povo.',
        geo: 'Região do Uádi Tumilat, corredor natural ligando o delta do Nilo ao deserto arábico.',
        arch: "Fortalezas egípcias da 'Muralha do Príncipe' que controlavam as fronteiras com o deserto.",
        modelType: 'pillar',
        modelName: 'Coluna de Fogo',
      },
      {
        title: 'Pi-Hairote (Mar Vermelho)',
        step: 'Passo 3',
        coords: [29.9667, 32.55],
        img: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
        verse: 'Êxodo 14:21-22',
        quote:
          'E os filhos de Israel entraram pelo meio do mar em seco; e as águas foram-lhes como muro à sua direita e à sua esquerda.',
        bible:
          'O clímax da intervenção miraculosa de Deus salvando o povo das bigas do Faraó.',
        geo: 'Extremo norte do Golfo de Suez / Lagos Amargos.',
        arch: 'Registros egípcios testemunham patrulhas e postos de vigia sobre passagens lacustres e pântanos de juncos.',
        modelType: 'pillar',
        modelName: 'Pilar das Águas Abertas',
      },
      {
        title: 'Mara (Águas Amargas)',
        step: 'Passo 4',
        coords: [29.5833, 32.7833],
        img: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
        verse: 'Êxodo 15:23-25',
        quote:
          'E o Senhor mostrou-lhe uma árvore, e lançou-a nas águas, e as águas se tornaram doces.',
        bible:
          "Primeiro teste no deserto de Sur; Jeová-Rafá se revela como 'o Senhor que te sara'.",
        geo: 'Oásis com fontes salobras na costa ocidental da Península do Sinai.',
        arch: 'Identificada com Bir Marah ou fontes sulfurosas de Ain Hawarah.',
        modelType: 'altar',
        modelName: 'Altar de Jeová-Rafá',
      },
      {
        title: 'Elim (12 Fontes e 70 Palmeiras)',
        step: 'Passo 5',
        coords: [29.3333, 33],
        img: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80',
        verse: 'Êxodo 15:27',
        quote:
          'Então vieram a Elim, e havia ali doze fontes de água e setenta palmeiras; e acamparam-se ali junto das águas.',
        bible:
          'Lugar de refrigério divino e abundância em meio ao rigor árido do deserto.',
        geo: 'Oásis verdejante no Uádi Gharandel, com farto lençol freático doce.',
        arch: 'Rotas de caravanas beduínas preservam o uso contínuo das nascentes de Gharandel.',
        modelType: 'altar',
        modelName: 'Oásis de Elim',
      },
      {
        title: 'Refidim (Água da Rocha e Amaleque)',
        step: 'Passo 6',
        coords: [28.7, 33.6],
        img: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
        verse: 'Êxodo 17:6 // Êxodo 17:15',
        quote:
          'Eis que eu estarei ali diante de ti sobre a rocha, em Horebe, e tu ferirás a rocha, e dela sairão águas...',
        bible:
          'Milagre da água brotando da rocha e vitória sobre Amaleque com os braços erguidos de Moisés sustentados por Arão e Hur (Jeová-Nissi).',
        geo: 'Vale árido de Uádi Feiran, a principal garganta montanhosa de acesso ao monte central.',
        arch: 'Inscrições rochosas proto-sinaíticas e ruínas da antiga cidade monástica de Pharan.',
        modelType: 'altar',
        modelName: 'Altar de Jeová-Nissi',
      },
      {
        title: 'Monte Sinai (Horebe)',
        step: 'Passo 7',
        coords: [28.5394, 33.9751],
        img: 'https://images.unsplash.com/photo-1682687220063-4742bd7fd538?auto=format&fit=crop&w=800&q=80',
        verse: 'Êxodo 19:1-20:21',
        quote:
          'E Deus falou todas estas palavras, dizendo: Eu sou o Senhor teu Deus, que te tirei da terra do Egito...',
        bible:
          'O santuário da Aliança: proclamação dos Dez Mandamentos, construção do Tabernáculo e dedicação do sacerdócio.',
        geo: 'O cume de granito de Jebel Musa elevando-se majestoso sobre a planície de er-Raha.',
        arch: 'Tradição monástica do século IV ancorada pelo Mosteiro de Santa Catarina com o Códice Sinaítico.',
        modelType: 'ark',
        modelName: 'A Arca da Aliança',
      },
      {
        title: 'Cades-Barneia (Fronteira da Promessa)',
        step: 'Passo 8',
        coords: [30.65, 34.4167],
        img: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
        verse: 'Números 13:26-33',
        quote:
          'E foram, e chegaram a Moisés e a Arão... e contaram-lhe: Fomos à terra a que nos enviaste; e verdadeiramente mana leite e mel...',
        bible:
          'O envio dos 12 espias, a rebelião do povo pela incredulidade e a sentença dos 40 anos de peregrinação.',
        geo: 'Oásis fértil de Ein el-Qudeirat na fronteira entre o Negueve e a península do Sinai.',
        arch: 'Fortaleza israelita dos séculos X a VIII a.C. escavada por Rudolph Cohen.',
        modelType: 'scroll',
        modelName: 'Relatório dos Espias',
      },
      {
        title: 'Monte Nebo (A Visão da Promessa)',
        step: 'Passo 9',
        coords: [31.768, 35.725],
        img: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
        verse: 'Deuteronômio 34:1-5',
        quote:
          'E subiu Moisés das campinas de Moabe ao monte Nebo... e o Senhor mostrou-lhe toda a terra...',
        bible:
          'A morte solene de Moisés após contemplar Canaã e a passagem da liderança para Josué.',
        geo: 'Cume da cordilheira de Abarim com vista panorâmica sobre o vale do Jordão e Jericó.',
        arch: 'Memorial de Moisés e basílica bizantina do século VI com mosaicos preservados no cume de Siyagha.',
        modelType: 'scroll',
        modelName: 'Memorial de Moisés',
      },
    ],
  },
  conquista_canaa: {
    id: 'conquista_canaa',
    title: '5. Conquista de Canaã sob Josué',
    description:
      'A travessia miraculosa do Jordão, o cerco de Jericó, a batalha de Gibeom e o desmonte das coalizões do norte e sul em Canaã.',
    waypoints: [
      {
        title: 'Rio Jordão (Travessia a Pé Enxuto)',
        step: 'Passo 1',
        coords: [31.8456, 35.5456],
        img: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
        verse: 'Josué 3:14-17',
        quote:
          'E os sacerdotes que levavam a arca da aliança do Senhor pararam firmes em seco no meio do Jordão...',
        bible:
          'O represamento milagroso das águas em Adã, abrindo caminho para a entrada de Israel na terra prometida.',
        geo: 'Fossa tectônica do Jordão em época de transbordamento de colheita.',
        arch: 'Evidências de deslizamentos tectônicos periódicos em Tell ed-Damiyeh que historicamente bloquearam o curso do rio.',
        modelType: 'ark',
        modelName: 'Travessia do Jordão',
      },
      {
        title: 'Gilgal (Memorial das Doze Pedras)',
        step: 'Passo 2',
        coords: [31.85, 35.5],
        img: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
        verse: 'Josué 4:19-24',
        quote:
          'E as doze pedras, que tinham tirado do Jordão, levantou Josué em Gilgal...',
        bible:
          'O primeiro acampamento militar de Israel em Canaã: circuncisão, a Páscoa e o cessar do maná.',
        geo: 'Planície entre o Jordão e Jericó.',
        arch: 'Padrões de pegadas e assentamentos circulares de pedras do Ferro I descobertos no vale do Jordão por Adam Zertal.',
        modelType: 'pillar',
        modelName: 'Pedras de Gilgal',
      },
      {
        title: 'Jericó (Queda das Muralhas)',
        step: 'Passo 3',
        coords: [31.8625, 35.4608],
        img: 'https://images.unsplash.com/photo-1544085311-11a028465b03?auto=format&fit=crop&w=800&q=80',
        verse: 'Josué 6:20',
        quote:
          'Gritou, pois, o povo... e o muro caiu abaixo, e o povo subiu à cidade... e tomaram a cidade.',
        bible:
          'A conquista divina da mais antiga fortaleza cananeia mediante fé e toque dos shofares.',
        geo: 'Oásis alimentado pela fonte de Eliseu a 250m abaixo do nível do mar.',
        arch: 'Escavações em Tell es-Sultan (Kenyon, Wood) revelam muralha de arrimo com tijolos de barro caídos para fora e camada de incêndio maciço.',
        modelType: 'altar',
        modelName: 'Muralhas de Jericó',
      },
      {
        title: 'Gibeom e Vale de Aijalom (O Sol Detido)',
        step: 'Passo 4',
        coords: [31.85, 35.1833],
        img: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=800&q=80',
        verse: 'Josué 10:12-14',
        quote:
          'Sol, detém-te em Gibeom, e tu, lua, no vale de Aijalom. E o sol se deteve, e a lua parou...',
        bible:
          'A derrota estrondosa da coalizão amorreia dos 5 reis sob saraiva de pedras e luz prolongada.',
        geo: 'Passo estratégico de Bete-Horom ligando o planalto de Benjamim à planície costeira.',
        arch: 'O famoso grande poço de Gibeom e jarros de vinho com o nome da cidade escavados por James Pritchard.',
        modelType: 'pillar',
        modelName: 'O Sol de Gibeom',
      },
      {
        title: 'Hazor (Campanha do Norte)',
        step: 'Passo 5',
        coords: [33.0167, 35.5667],
        img: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80',
        verse: 'Josué 11:10-11',
        quote:
          'Porque Hazor dantes era a cabeça de todos estes reinos... e a Hazor queimou a fogo.',
        bible:
          'Vitória decisiva junto às águas de Merom contra a vasta confederação cananeia do norte.',
        geo: 'A maior cidade fortificada de Canaã (cidade alta e baixa cobrindo 80 hectares) dominando o vale de Hulé.',
        arch: 'Yigael Yadin e Amnon Ben-Tor escavaram o palácio real cananeu com camada de cinzas e estátuas decapitadas do século XIII a.C.',
        modelType: 'altar',
        modelName: 'Acrópole de Hazor',
      },
      {
        title: 'Siquém (Renovação Solene da Aliança)',
        step: 'Passo 6',
        coords: [32.2134, 35.2789],
        img: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80',
        verse: 'Josué 24:15-27',
        quote:
          'Porém eu e a minha casa serviremos ao Senhor... e tomou uma grande pedra, e a erigiu ali debaixo do carvalho...',
        bible:
          'O grande discurso de despedida de Josué e o pacto solene de todas as tribos de Israel.',
        geo: 'Anfiteatro natural entre os montes Gerizim (bênção) e Ebal (maldição).',
        arch: "A 'Grande Pedra de Josué' (estela monolítica ereta) preservada junto ao templo fortificado de Tell Balata.",
        modelType: 'pillar',
        modelName: 'Pedra do Testemunho',
      },
    ],
  },
  arca_alianca: {
    id: 'arca_alianca',
    title: '6. A Peregrinação da Arca da Aliança',
    description:
      'Do Tabernáculo de Siló aos territórios filisteus, Bete-Semes, Quiriate-Jearim até a sua entronização gloriosa no Templo de Jerusalém.',
    waypoints: [
      {
        title: 'Siló (O Tabernáculo dos Juízes)',
        step: 'Passo 1',
        coords: [32.1156, 35.2894],
        img: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80',
        verse: '1 Samuel 1:3 // 1 Samuel 4:4',
        quote:
          'Enviou, pois, o povo a Siló, e trouxeram de lá a arca da aliança do Senhor dos Exércitos, que habita entre os querubins...',
        bible:
          'O centro espiritual de Israel por mais de 300 anos, onde Samuel foi chamado por Deus ainda menino.',
        geo: 'Planalto central de Efraim.',
        arch: 'Plataforma de terraplanagem monumental talhada na rocha em Tel Shiloh compatível com as dimensões exatas do Tabernáculo.',
        modelType: 'ark',
        modelName: 'Arca em Siló',
      },
      {
        title: 'Ebenézer / Afeque (Captura da Arca)',
        step: 'Passo 2',
        coords: [32.1, 34.9333],
        img: 'https://images.unsplash.com/photo-1544085311-11a028465b03?auto=format&fit=crop&w=800&q=80',
        verse: '1 Samuel 4:11 // 1 Samuel 4:21',
        quote:
          'E a arca de Deus foi tomada; e os dois filhos de Eli, Hofni e Finéias, morreram... E chamou ao menino Icabode, dizendo: Foi-se a glória de Israel...',
        bible:
          'A derrota de Israel por tratar a Arca como amuleto e a trágica morte do sacerdote Eli.',
        geo: 'Passo das nascentes do rio Yarqon na planície do Sharon.',
        arch: 'Fortaleza cananeia e filisteia de Tel Afek controlando a passagem da Via Maris.',
        modelType: 'ark',
        modelName: 'Icabode em Ebenézer',
      },
      {
        title: 'Asdode, Gate e Ecrom (Cidades Filisteias)',
        step: 'Passo 3',
        coords: [31.7778, 34.8528],
        img: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
        verse: '1 Samuel 5:1-12',
        quote:
          'E levantando-se de madrugada... eis que Dagom estava caído com o rosto em terra diante da arca do Senhor...',
        bible:
          'O juízo divino sobre os deuses pagãos e os tumores que assolavam os filisteus até decidirem devolver a Arca.',
        geo: 'Pentápole filisteia na planície litorânea meridional.',
        arch: 'Inscrições reais dedicadas à deusa Ptgyh em Tel Miqne (Ecrom) e cerâmicas bicrômicas filisteias.',
        modelType: 'altar',
        modelName: 'Queda de Dagom',
      },
      {
        title: 'Bete-Semes (O Carro com Vacas)',
        step: 'Passo 4',
        coords: [31.7456, 34.975],
        img: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80',
        verse: '1 Samuel 6:12-14',
        quote:
          'E as vacas se encaminharam diretamente pelo caminho de Bete-Semes... e o carro veio ao campo de Josué...',
        bible:
          'O retorno sem condutor humano pelo vale de Soreque como sinal miraculoso da mão de Deus.',
        geo: 'Vale de Soreque na fronteira da Sefelá com as montanhas de Judá.',
        arch: 'Tel Beit Shemesh: grande reservatório de água da Idade do Ferro e oficinas de metalurgia.',
        modelType: 'ark',
        modelName: 'Carro de Bete-Semes',
      },
      {
        title: 'Quiriate-Jearim (Casa de Abinadabe)',
        step: 'Passo 5',
        coords: [31.8, 35.1],
        img: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=800&q=80',
        verse: '1 Samuel 7:1-2',
        quote:
          'Vieram, pois, os homens de Quiriate-Jearim, e levaram a arca do Senhor, e a puseram na casa de Abinadabe... e ela esteve ali vinte anos...',
        bible:
          'A guarda reverente da Arca durante os reinados de Saul e o início de Davi.',
        geo: 'Colina arborizada a oeste de Jerusalém (Deir el-Azar).',
        arch: 'Israel Finkelstein escavou em Kiriath-Jearim um imenso terraço de contenção monumental do século VIII a.C.',
        modelType: 'ark',
        modelName: 'Casa de Abinadabe',
      },
      {
        title: 'Jerusalém (Templo de Salomão)',
        step: 'Passo 6',
        coords: [31.7777, 35.2354],
        img: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=800&q=80',
        verse: '2 Samuel 6:12-17 // 1 Reis 8:1-11',
        quote:
          'Davi subiu com júbilo, trazendo a arca de Deus... E os sacerdotes introduziram a arca... no Santo dos Santos; e a glória do Senhor encheu a casa.',
        bible:
          'A dança de júbilo de Davi e o repouso permanente da Arca sob as asas dos querubins dourados no Templo.',
        geo: 'Monte Moriá, acrópole sagrada de Jerusalém.',
        arch: 'A Rocha Fundamental (Even Shetiya) no Santo dos Santos do Templo com a depressão retangular esculpida para a Arca da Aliança.',
        modelType: 'ark',
        modelName: 'A Arca no Santo dos Santos',
      },
    ],
  },
  davi_fugitivo: {
    id: 'davi_fugitivo',
    title: '7. A Fuga e Refúgio de Davi',
    description:
      'Perseguido pelo rei Saul pelos desertos de Judá: a caverna de Adulão, o refúgio em En-Gedi e o treinamento do ungido do Senhor.',
    waypoints: [
      {
        title: 'Gibeá de Saul',
        step: 'Passo 1',
        coords: [31.8236, 35.2322],
        img: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=800&q=80',
        verse: '1 Samuel 19:1-10',
        quote:
          'E Saul procurava encravar a Davi na parede com a lança; porém ele se desviou...',
        bible:
          'A corte de Saul, a inveja doentia do rei e o pacto de amizade eterna com Jônatas.',
        geo: 'Tell el-Ful, colina estratégica controlando o acesso norte a Jerusalém.',
        arch: 'Restos da fortaleza rústica fortificada de Saul escavados por W.F. Albright.',
        modelType: 'scroll',
        modelName: 'Pacto de Jônatas',
      },
      {
        title: 'Nobe (Os Sacerdotes do Senhor)',
        step: 'Passo 2',
        coords: [31.7917, 35.2417],
        img: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80',
        verse: '1 Samuel 21:1-9',
        quote:
          'E deu-lhe o sacerdote o pão sagrado... e a espada de Golias, o filisteu, a quem tu feriste no vale de Elá...',
        bible:
          'Davi faminto recebe os pães da proposição do sacerdote Aimeleque e recupera a espada de Golias.',
        geo: 'Cumeeira das colinas a nordeste do Monte das Oliveiras.',
        arch: 'Sítio sacerdotal arrasado pelo massacre ordenado por Saul através de Doegue, o edomita.',
        modelType: 'altar',
        modelName: 'Espada de Golias',
      },
      {
        title: 'Caverna de Adulão',
        step: 'Passo 3',
        coords: [31.65, 34.9667],
        img: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
        verse: '1 Samuel 22:1-2',
        quote:
          'E ajuntou-se a ele todo o homem que se achava em aperto... e fez-se capitão deles; e eram com ele cerca de quatrocentos homens.',
        bible:
          'O refúgio dos proscritos onde Deus moldou o exército de valentes de Davi e inspirou Salmos messiânicos (Sl 57, 142).',
        geo: 'Região acidentada da Sefelá de Judá, com extensos sistemas de cavernas cársticas.',
        arch: "Khirbet 'Id el-Minya com imensas cavernas subterrâneas habitadas desde o Bronze.",
        modelType: 'altar',
        modelName: 'Caverna de Adulão',
      },
      {
        title: 'Deserto de En-Gedi (A Orla do Manto)',
        step: 'Passo 4',
        coords: [31.4667, 35.3833],
        img: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
        verse: '1 Samuel 24:1-7',
        quote:
          'O Senhor me guarde de que eu faça tal coisa ao meu senhor... que eu estenda a minha mão contra ele, pois é o ungido do Senhor.',
        bible:
          'A nobreza moral de Davi que poupou a vida de Saul na caverna das cabras selvagens.',
        geo: 'Oásis paradisíaco de cascatas de água doce caindo sobre as falésias áridas do Mar Morto.',
        arch: 'Nascente de En-Gedi e templos calcolíticos preservados no penhasco rochoso.',
        modelType: 'altar',
        modelName: 'Penhasco das Cabras',
      },
      {
        title: 'Ziclague e Coroação em Hebrom',
        step: 'Passo 5',
        coords: [31.5298, 35.0938],
        img: 'https://images.unsplash.com/photo-1547124220-405bbfd84f5c?auto=format&fit=crop&w=800&q=80',
        verse: '2 Samuel 2:1-4',
        quote:
          'Vieram os homens de Judá, e ungiram ali a Davi rei sobre a casa de Judá...',
        bible:
          'O fim da peregrinação: o lamento sobre Saul e Jônatas e a primeira unção como rei.',
        geo: 'Montes de Hebrom, centro da tribo de Judá.',
        arch: 'Tel Rumeida com fortificações monumentais da época monárquica davídica.',
        modelType: 'scroll',
        modelName: 'A Coroa de Davi',
      },
    ],
  },
  elias: {
    id: 'elias',
    title: '8. A Jornada Profética de Elias',
    description:
      'Do ribeiro de Quirite ao fogo do Monte Carmelo, a depressão no deserto e a teofania da voz mansa e suave no Monte Horebe.',
    waypoints: [
      {
        title: 'Ribeiro de Quirite',
        step: 'Passo 1',
        coords: [32.3333, 35.6],
        img: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
        verse: '1 Reis 17:3-6',
        quote:
          'Vai-te daqui... e esconde-te junto ao ribeiro de Quirite... e os corvos lhe traziam pão e carne pela manhã e à tarde...',
        bible:
          'O sustento milagroso durante os 3 anos e meio de seca em Israel.',
        geo: 'Desfiladeiro rochoso íngreme do Uádi el-Yabis descendo de Gileade ao Jordão.',
        arch: 'Cavernas eremíticas históricas no vale de Quirite preservando tradição profética.',
        modelType: 'altar',
        modelName: 'Ribeiro de Quirite',
      },
      {
        title: 'Sarepta de Sidom (A Viúva)',
        step: 'Passo 2',
        coords: [33.45, 35.2833],
        img: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
        verse: '1 Reis 17:14-22',
        quote:
          'A farinha da panela não se acabará, e o azeite da botija não faltará... E o Senhor ouviu a voz de Elias, e a alma do menino tornou a entrar nele...',
        bible:
          'A botija de azeite inesgotável e a ressurreição do filho da viúva gentia em terra de Jezabel.',
        geo: 'Costa mediterrânea entre Tiro e Sidom (Líbano).',
        arch: 'Sarafand escavada por James Pritchard com evidências de produção industrial de púrpura e cerâmica fenícia.',
        modelType: 'altar',
        modelName: 'Botija de Sarepta',
      },
      {
        title: 'Monte Carmelo (O Fogo do Céu)',
        step: 'Passo 3',
        coords: [32.7333, 35.05],
        img: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
        verse: '1 Reis 18:36-39',
        quote:
          'Então caiu fogo do Senhor, e consumiu o holocausto, e a lenha, e as pedras... o que vendo todo o povo, caíram sobre os seus rostos, e disseram: Só o Senhor é Deus!',
        bible:
          'O confronto público com os 450 profetas de Baal e a vitória incontestável de Yahweh.',
        geo: 'Promontório montanhoso dominando a planície de Jezreel e o rio Quisom.',
        arch: "Muhraqa ('O Lugar do Queimado'), tradicional cume rochoso com visão panorâmica sobre o vale do Quisom.",
        modelType: 'altar',
        modelName: 'Altar do Carmelo',
      },
      {
        title: 'Monte Horebe / Sinai (A Voz Mansa)',
        step: 'Passo 4',
        coords: [28.5394, 33.9751],
        img: 'https://images.unsplash.com/photo-1682687220063-4742bd7fd538?auto=format&fit=crop&w=800&q=80',
        verse: '1 Reis 19:11-13',
        quote:
          'E depois do terremoto um fogo; porém o Senhor não estava no fogo; e depois do fogo uma voz mansa e delicada...',
        bible:
          'A renovação do chamado profético na mesma montanha da Aliança de Moisés.',
        geo: 'Cume de Jebel Musa no sul do Sinai.',
        arch: "A 'Capela de Santo Elias' no alto do Sinai, marcando a tradicional caverna onde o profeta se abrigou.",
        modelType: 'pillar',
        modelName: 'A Voz Mansa',
      },
    ],
  },
  jonas: {
    id: 'jonas',
    title: '9. A Missão do Profeta Jonas',
    description:
      'A fuga de Jope para Társis, o mar em fúria, o ventre do grande peixe e a pregação que levou a capital assíria ao arrependimento.',
    waypoints: [
      {
        title: 'Gate-Hefer (Galileia)',
        step: 'Passo 1',
        coords: [32.74, 35.33],
        img: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80',
        verse: '2 Reis 14:25 // Jonas 1:1',
        quote:
          'Levanta-te, vai à grande cidade de Nínive, e clama contra ela...',
        bible: 'A terra natal do profeta no território da tribo de Zebulom.',
        geo: 'Colinas da Baixa Galileia perto de Nazaré.',
        arch: 'Khirbet ez-Zurra com ruínas de fortificações israelitas do século VIII a.C.',
        modelType: 'scroll',
        modelName: 'O Chamado de Jonas',
      },
      {
        title: 'Porto de Jope (Jaffa)',
        step: 'Passo 2',
        coords: [32.05, 34.75],
        img: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80',
        verse: 'Jonas 1:3',
        quote:
          'E Jonas se levantou para fugir da presença do Senhor para Társis; e descendo a Jope, achou um navio que ia para Társis...',
        bible:
          'A tentativa tola de escapar do Deus onipresente embarcando num navio mercante.',
        geo: 'Porto natural com arrecifes rochosos perigosos.',
        arch: 'Muralhas monumentais de pedra e porto marítimo do segundo e primeiro milênio a.C.',
        modelType: 'ship',
        modelName: 'Nau de Társis',
      },
      {
        title: 'Mar Aberto (A Grande Tempestade)',
        step: 'Passo 3',
        coords: [33.5, 32.5],
        img: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
        verse: 'Jonas 1:15-17 // Jonas 2:9',
        quote:
          'E levantaram a Jonas, e o lançaram ao mar; e cessou o mar da sua fúria... Preparou, pois, o Senhor um grande peixe...',
        bible:
          'A oração da profundeza do abismo e o sinal do Messias que estaria três dias no coração da terra.',
        geo: 'Águas profundas do Mar Mediterrâneo oriental.',
        arch: 'Âncoras de pedra antigas e relevos marítimos fenícios e assírios.',
        modelType: 'altar',
        modelName: 'Sinal de Jonas',
      },
      {
        title: 'Nínive (A Cidade Arrependida)',
        step: 'Passo 4',
        coords: [36.3589, 43.1528],
        img: 'https://images.unsplash.com/photo-1608958416629-106ab0e5c9b7?auto=format&fit=crop&w=800&q=80',
        verse: 'Jonas 3:4-10',
        quote:
          'E começou Jonas a entrar pela cidade... e pregava, e dizia: Ainda quarenta dias, e Nínive será subvertida. E os homens de Nínive creram em Deus...',
        bible:
          'O maior avivamento gentio do Antigo Testamento com o arrependimento do rei e de toda a população assíria.',
        geo: 'Margem oriental do rio Tigre, fronteira da moderna Mossul.',
        arch: 'Palácio de Senaqueribe e a colina tradicional de Nabi Yunis (tumba do profeta Jonas).',
        modelType: 'scroll',
        modelName: 'Pregação em Nínive',
      },
    ],
  },
  terra_prometida: {
    id: 'terra_prometida',
    title: '10. Terra Prometida, 12 Tribos, Divisão dos Reinos',
    description:
      'A conquista e estabelecimento em Canaã sob Josué, a distribuição da herança tribal de Israel e a posterior divisão nos reinos do Norte e do Sul.',
    waypoints: [
      {
        title: 'Jericó (Travessia do Jordão)',
        step: 'Passo 1',
        coords: [31.8625, 35.4608],
        img: 'https://images.unsplash.com/photo-1544085311-11a028465b03?auto=format&fit=crop&w=800&q=80',
        verse: 'Josué 6:20',
        quote:
          'Gritou, pois, o povo... e o muro caiu abaixo, e o povo subiu à cidade... e tomaram a cidade.',
        bible:
          'A conquista miraculosa da primeira grande fortaleza em Canaã sob Josué.',
        geo: 'Vale do Jordão a 258m abaixo do nível do mar.',
        arch: 'Fortificações massivas de tijolos de barro da Idade do Bronze em Tell es-Sultan.',
        modelType: 'altar',
        modelName: 'Muralhas de Jericó',
      },
      {
        title: 'Siló (Distribuição das Tribos)',
        step: 'Passo 2',
        coords: [32.1156, 35.2894],
        img: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80',
        verse: 'Josué 18:1',
        quote:
          'E toda a congregação dos filhos de Israel se reuniu em Siló, e ali armaram a tenda da congregação...',
        bible:
          'O estabelecimento do Tabernáculo e a partilha da herança entre as 12 tribos.',
        geo: 'Montanhas de Efraim ao norte de Betel.',
        arch: 'Estruturas de culto e cerâmicas do Bronze Tardio e Ferro I em Khirbet Seilun.',
        modelType: 'ark',
        modelName: 'O Tabernáculo de Siló',
      },
      {
        title: 'Jerusalém (Reino Unificado)',
        step: 'Passo 3',
        coords: [31.7683, 35.2137],
        img: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=800&q=80',
        verse: '2 Samuel 5:7',
        quote:
          'Todavia Davi tomou a fortaleza de Sião; esta é a cidade de Davi.',
        bible:
          'A unificação de todas as tribos sob Davi, estabelecendo a capital santa.',
        geo: 'Montes de Judá entre os vales de Cedrom e Hinom.',
        arch: 'A Cidade de Davi revela a Grande Estrutura de Pedra e o canal subterrâneo de água.',
        modelType: 'altar',
        modelName: 'Fortaleza de Sião',
      },
      {
        title: 'Samaria (Reino do Norte)',
        step: 'Passo 4',
        coords: [32.277, 35.1897],
        img: 'https://images.unsplash.com/photo-1542224566-6e85f2e6772f?auto=format&fit=crop&w=800&q=80',
        verse: '1 Reis 12:25',
        quote:
          'E Jeroboão edificou a Siquém... e habitou ali; e saiu dali, e edificou a Penuel.',
        bible:
          'A dramática divisão do reino de Salomão nas 10 tribos do norte e 2 tribos do sul.',
        geo: 'Colina proeminente de Sebaste dominando rotas de comércio.',
        arch: 'Acrópole real com alvenaria de silhar e os famosos marfins talhados de Samaria.',
        modelType: 'scroll',
        modelName: 'Palácio de Samaria',
      },
      {
        title: 'Hebrom (Reino do Sul - Judá)',
        step: 'Passo 5',
        coords: [31.5298, 35.0998],
        img: 'https://images.unsplash.com/photo-1544085311-11a028465b03?auto=format&fit=crop&w=800&q=80',
        verse: '2 Crônicas 11:5-10',
        quote:
          'E Roboão habitou em Jerusalém, e edificou cidades para fortalezas em Judá... E edificou a Hebrom...',
        bible:
          'O fortalecimento das praças de defesa da dinastia davídica em Judá.',
        geo: 'Região montanhosa mais elevada da Judeia.',
        arch: 'Fortificações e silos da Idade do Ferro revelados em Tell Rumeida.',
        modelType: 'altar',
        modelName: 'Fortaleza de Hebrom',
      },
    ],
  },
  exilio_assirio: {
    id: 'exilio_assirio',
    title: '11. Exílio Assírio e Dispersão',
    description:
      'O cativeiro e espalhamento das dez tribos de Israel (Reino do Norte) pelas forças imperiais da Assíria em 722 a.C.',
    waypoints: [
      {
        title: 'Samaria (Cerco e Queda)',
        step: 'Passo 1',
        coords: [32.277, 35.1897],
        img: 'https://images.unsplash.com/photo-1542224566-6e85f2e6772f?auto=format&fit=crop&w=800&q=80',
        verse: '2 Reis 17:5-6',
        quote:
          'No ano nono de Oséias, o rei da Assíria tomou a Samaria, e levou a Israel preso para a Assíria...',
        bible:
          'O fim do Reino do Norte após cerco de 3 anos liderado por Salmaneser e Sargão II.',
        geo: 'Colina da Samaria central.',
        arch: 'Camadas espessas de destruição de cinzas e pontas de flechas assírias do século VIII a.C.',
        modelType: 'altar',
        modelName: 'Muralhas de Samaria',
      },
      {
        title: 'Nínive (Capital do Império Assírio)',
        step: 'Passo 2',
        coords: [36.36, 43.15],
        img: 'https://images.unsplash.com/photo-1608958416629-106ab0e5c9b7?auto=format&fit=crop&w=800&q=80',
        verse: 'Naum 3:1',
        quote:
          'Ai da cidade ensanguentada! Toda ela é mentira e cheia de rapina...',
        bible:
          'A metrópole que subjugou os reinos do Oriente e deportou nações inteiras.',
        geo: 'Margem do rio Tigre.',
        arch: 'Prismas de Sargão II e Senaqueribe com registros detalhados das deportações de Samaria.',
        modelType: 'scroll',
        modelName: 'Palácio de Nínive',
      },
      {
        title: 'Habor (Rio de Gozã)',
        step: 'Passo 3',
        coords: [36.84, 40.08],
        img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
        verse: '2 Reis 17:6',
        quote:
          '...e os fez habitar em Hala e em Habor, junto ao rio de Gozã, e nas cidades dos medos.',
        bible:
          'Os assentamentos forçados das 10 tribos no norte da Mesopotâmia e Média.',
        geo: 'Afluente perene do Eufrates na Síria oriental.',
        arch: 'Tell Halaf: colônia administrativa assíria com monumentos e arquivos cuneiformes.',
        modelType: 'pillar',
        modelName: 'Coluna de Dispersão',
      },
    ],
  },
  exilio_babilonico: {
    id: 'exilio_babilonico',
    title: '12. Exílio Babilônico e Nova Aliança',
    description:
      'As deportações de Judá para a Babilônia em 605, 597 e 586 a.C., a queda de Jerusalém e a promessa profética da restauração pactual.',
    waypoints: [
      {
        title: 'Jerusalém (Templo Destruído)',
        step: 'Passo 1',
        coords: [31.7683, 35.2137],
        img: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=800&q=80',
        verse: '2 Reis 25:9',
        quote:
          'E queimou a casa do Senhor e a casa do rei, como também todas as casas de Jerusalém...',
        bible:
          'A queda do Templo de Salomão em 586 a.C. devido ao abandono da Aliança.',
        geo: 'Montes de Sião e Moriá.',
        arch: "A 'Sala Queimada' escavada na Cidade de Davi com cinzas e flechas babilônicas.",
        modelType: 'altar',
        modelName: 'Cinzas do Templo',
      },
      {
        title: 'Ribla (Tribunal de Nabucodonosor)',
        step: 'Passo 2',
        coords: [34.433, 36.567],
        img: 'https://images.unsplash.com/photo-1544085311-11a028465b03?auto=format&fit=crop&w=800&q=80',
        verse: '2 Reis 25:6',
        quote:
          'E prenderam o rei, e o levaram ao rei de Babilônia, a Ribla; e pronunciaram contra ele sentença.',
        bible:
          'O quartel-general de comando militar onde os nobres e o rei Zedequias foram julgados.',
        geo: 'Vale do rio Orontes na Síria central.',
        arch: 'Tell Rifeh com posições de comando estratégico da Idade do Ferro.',
        modelType: 'scroll',
        modelName: 'Cadeias de Cativeiro',
      },
      {
        title: 'Rio Quebar (Visões de Ezequiel)',
        step: 'Passo 3',
        coords: [32.4833, 44.4333],
        img: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80',
        verse: 'Ezequiel 1:1 // Ezequiel 37:1',
        quote:
          'Estando eu no meio dos cativos, junto ao rio Quebar, se abriram os céus, e eu vi visões de Deus...',
        bible:
          'A contemplação da Glória divina e a profecia do vale de ossos secos renascendo para a vida.',
        geo: 'Canal real de irrigação (Shatt en-Nil) perto de Nipur.',
        arch: 'Arquivos Murashu provam a próspera colônia de cativos judeus no canal Quebar.',
        modelType: 'pillar',
        modelName: 'Roda de Ezequiel',
      },
      {
        title: 'Babilônia (Daniel na Corte)',
        step: 'Passo 4',
        coords: [32.5364, 44.4208],
        img: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?auto=format&fit=crop&w=800&q=80',
        verse: 'Daniel 2:48',
        quote:
          'Então o rei engrandeceu a Daniel... e o pôs por governador de toda a província de Babilônia...',
        bible:
          'O testemunho inabalável na cova dos leões e a revelação do Reino eterno de Deus.',
        geo: 'Metrópole banhada pelo Eufrates.',
        arch: 'Porta de Ishtar com azulejos azuis e dragões de Marduk no Museu de Pérgamo.',
        modelType: 'scroll',
        modelName: 'Porta de Ishtar',
      },
      {
        title: 'Susa (Cidadela Persa)',
        step: 'Passo 5',
        coords: [32.1894, 48.2433],
        img: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80',
        verse: 'Neemias 1:1 // Ester 4:14',
        quote: 'Quem sabe se para tal tempo como este chegaste a este reino?',
        bible:
          'A providência de Deus através da rainha Ester e o clamor de Neemias pelo muro de Jerusalém.',
        geo: 'Sudoeste do Irã moderno.',
        arch: 'Palácio de Apadana com colunas monumentais e touros alados escavados em Shush.',
        modelType: 'scroll',
        modelName: 'Decreto de Artaxerxes',
      },
    ],
  },
  retorno_esdras_neemias: {
    id: 'retorno_esdras_neemias',
    title: '13. O Retorno dos Exilados e Reconstrução',
    description:
      'A repatriação sob os decretos de Ciro e Artaxerxes: reconstrução do Templo por Zorobabel e reedificação dos Muros por Neemias em 52 dias.',
    waypoints: [
      {
        title: 'Babilônia (Decreto de Ciro)',
        step: 'Passo 1',
        coords: [32.5364, 44.4208],
        img: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?auto=format&fit=crop&w=800&q=80',
        verse: 'Esdras 1:1-3',
        quote:
          'O Senhor despertou o espírito de Ciro, rei da Pérsia... Quem há entre vós de todo o seu povo... suba a Jerusalém...',
        bible:
          'O cumprimento profético dos 70 anos anunciados por Jeremias abrindo o retorno.',
        geo: 'Centro do império persa recém-conquistado.',
        arch: 'O Cilindro de Ciro em argila cuneiforme autorizando a repatriação dos povos cativos e seus deuses.',
        modelType: 'scroll',
        modelName: 'Cilindro de Ciro',
      },
      {
        title: 'Rio Aava (Jejum da Caravana)',
        step: 'Passo 2',
        coords: [35.95, 39.05],
        img: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
        verse: 'Esdras 8:21-23',
        quote:
          'Então apregoei ali um jejum junto ao rio Aava, para nos humilharmos diante do nosso Deus... e a mão de nosso Deus foi sobre nós...',
        bible:
          'A caravana de sacerdotes e famílias marchando desarmada sob proteção exclusiva de Deus.',
        geo: 'Curso do rio Eufrates médio.',
        arch: 'Rotas de caravanas imperiais persas providas de postos de correio real (Angarium).',
        modelType: 'altar',
        modelName: 'Altar de Aava',
      },
      {
        title: 'Jerusalém (Muralhas e 2º Templo)',
        step: 'Passo 3',
        coords: [31.7767, 35.2345],
        img: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=800&q=80',
        verse: 'Neemias 6:15 // Esdras 3:11',
        quote:
          'Acabou-se, pois, o muro aos vinte e cinco do mês de Elul, em cinquenta e dois dias... E cantavam a Deus, louvando e dando graças...',
        bible:
          'A dedicação das muralhas com espadas e pás e a fundação do Segundo Templo.',
        geo: 'Colina oriental da Cidade de Davi.',
        arch: 'Trechos da muralha reconstruída por Neemias escavados por Eilat Mazar na crista oriental da Cidade de Davi.',
        modelType: 'pillar',
        modelName: 'Muralha de Neemias',
      },
    ],
  },
  jesus_nascimento_infancia: {
    id: 'jesus_nascimento_infancia',
    title: '14. Nascimento e Infância de Jesus',
    description:
      'Da Anunciação em Nazaré ao Nascimento em Belém, a fuga protetora para o Egito e o diálogo no Templo aos doze anos de idade.',
    waypoints: [
      {
        title: 'Nazaré (A Anunciação)',
        step: 'Passo 1',
        coords: [32.7019, 35.2979],
        img: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80',
        verse: 'Lucas 1:26-35',
        quote:
          'Descerá sobre ti o Espírito Santo, e o poder do Altíssimo te cobrirá com a sua sombra; por isso também o Santo, que de ti há de nascer, será chamado Filho de Deus.',
        bible:
          'A mensagem do anjo Gabriel a Maria na modesta aldeia da Galileia.',
        geo: 'Colinas rochosas da Baixa Galileia.',
        arch: "A 'Casa de Maria' e estruturas residenciais do século I sob a Basílica da Anunciação.",
        modelType: 'scroll',
        modelName: 'A Anunciação',
      },
      {
        title: 'Belém de Judá (A Manjedoura)',
        step: 'Passo 2',
        coords: [31.7054, 35.2024],
        img: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=800&q=80',
        verse: 'Miquéias 5:2 // Lucas 2:7',
        quote:
          'E deu à luz a seu filho primogênito, e envolveu-o em panos, e deitou-o numa manjedoura, porque não havia lugar para eles na estalagem.',
        bible:
          'A encarnação do Verbo Divino cumprindo a profecia davídica milenar.',
        geo: 'Colina a 775m de altitude a 8 km ao sul de Jerusalém.',
        arch: 'A Gruta da Natividade sob a Basílica mais antiga da Cristandade (século IV).',
        modelType: 'altar',
        modelName: 'Manjedoura de Belém',
      },
      {
        title: 'Egito (Fuga de Herodes)',
        step: 'Passo 3',
        coords: [30.0444, 31.2357],
        img: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=800&q=80',
        verse: 'Mateus 2:13-15',
        quote: 'Do Egito chamei o meu Filho.',
        bible:
          'A fuga noturna avisada em sonhos para preservar a vida do Messias da fúria de Herodes.',
        geo: 'Região do Cairo Antigo / Baixo Egito.',
        arch: 'Igreja de Abu Serga (São Sérgio) fundada no século IV sobre a cripta tradicional da Sagrada Família.',
        modelType: 'altar',
        modelName: 'Refúgio no Nilo',
      },
      {
        title: 'Templo de Jerusalém (Aos Doze Anos)',
        step: 'Passo 4',
        coords: [31.7777, 35.2354],
        img: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=800&q=80',
        verse: 'Lucas 2:46-49',
        quote: 'Não sabeis que me convém tratar dos negócios de meu Pai?',
        bible:
          'Jesus sentado no pórtico de Salomão ensinando e maravilhando os mestres da Torá.',
        geo: 'Esplanada do Templo de Herodes.',
        arch: 'Degraus de Hulda escavados no muro sul por onde peregrinos entravam no pátio do Templo.',
        modelType: 'scroll',
        modelName: 'Ensinando no Templo',
      },
    ],
  },
  jesus_galileia: {
    id: 'jesus_galileia',
    title: '15. Ministério Galileu de Jesus Cristo',
    description:
      'O chamado dos discípulos, o Sermão da Montanha e os milagres transformadores nas margens do Mar da Galileia.',
    waypoints: [
      {
        title: 'Nazaré',
        step: 'Passo 1',
        coords: [32.7019, 35.2979],
        img: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80',
        verse: 'Lucas 4:16-21',
        quote:
          'O Espírito do Senhor é sobre mim, pois que me ungiu para evangelizar os pobres...',
        bible:
          'A leitura profética de Isaías na sinagoga de sua infância, inaugurando o ministério público messiânico.',
        geo: 'Colinas arborizadas da Baixa Galileia.',
        arch: 'Casas rurais do primeiro século talhadas na rocha calcária.',
        modelType: 'scroll',
        modelName: 'Rolo de Isaías',
      },
      {
        title: 'Caná da Galileia',
        step: 'Passo 2',
        coords: [32.7472, 35.3386],
        img: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80',
        verse: 'João 2:1-11',
        quote:
          'Jesus principiou assim os seus sinais em Caná da Galileia, e manifestou a sua glória; e os seus discípulos creram nele.',
        bible:
          'O primeiro milagre: a transformação da água em vinho durante as bodas.',
        geo: 'Vila vizinha a Nazaré (Khirbet Qana).',
        arch: 'Talhas de pedra romanas típicas para rituais de purificação judaica.',
        modelType: 'altar',
        modelName: 'Talhas de Caná',
      },
      {
        title: 'Cafarnaum (Centro de Operações)',
        step: 'Passo 3',
        coords: [32.8811, 35.5753],
        img: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80',
        verse: 'Marcos 1:21-28',
        quote:
          'E maravilhavam-se da sua doutrina, porque os ensinava como tendo autoridade...',
        bible:
          'A casa de Pedro, a cura do paralítico baixado pelo teto e o ensino poderoso na sinagoga.',
        geo: 'Margem norte do lago, ponto de pesca e alfândega de Herodes Antipas.',
        arch: 'A sinagoga e a casa octogonal paleocristã associada a Simão Pedro.',
        modelType: 'altar',
        modelName: 'Casa de Pedro',
      },
      {
        title: 'Monte das Bem-Aventuranças',
        step: 'Passo 4',
        coords: [32.8814, 35.5558],
        img: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
        verse: 'Mateus 5:1-12',
        quote:
          'Bem-aventurados os humildes de espírito, porque deles é o reino dos céus...',
        bible:
          'A proclamação da Carta Magna do Reino de Deus: o Sermão da Montanha.',
        geo: 'Encosta verdejante com acústica natural em forma de anfiteatro dominando o lago.',
        arch: 'Capela bizantina do século IV construída para comemorar o sermão.',
        modelType: 'scroll',
        modelName: 'Códice do Sermão da Montanha',
      },
      {
        title: 'Betsaida (Cidade de Pedro e André)',
        step: 'Passo 5',
        coords: [32.9103, 35.6308],
        img: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
        verse: 'Lucas 9:10-17',
        quote:
          'E tomou os cinco pães e os dois peixes, e, olhando para o céu, abençoou-os, e partiu-os...',
        bible:
          'Local da primeira multiplicação dos pães e peixes alimentando cinco mil homens.',
        geo: 'Planície de Bete-Zaida, na foz do rio Jordão no lago.',
        arch: 'Escavações em el-Araj revelam vila romana de pescadores e basílica bizantina dos apóstolos.',
        modelType: 'altar',
        modelName: 'Memorial da Multiplicação',
      },
      {
        title: 'Magdala (Cidade de Maria Madalena)',
        step: 'Passo 6',
        coords: [32.8253, 35.5186],
        img: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80',
        verse: 'Lucas 8:1-3',
        quote: '...e Maria, chamada Madalena, da qual saíram sete demônios...',
        bible:
          'Cidade de salga de peixe onde Jesus libertou Maria Madalena e ministrou na sinagoga local.',
        geo: 'Margem noroeste do lago no sopé do Monte Arbel.',
        arch: "Sinagoga de Magdala do século I com a espetacular 'Pedra de Magdala' esculpida com a Menorá.",
        modelType: 'altar',
        modelName: 'Pedra de Magdala',
      },
    ],
  },
  jesus_peregrino_norte: {
    id: 'jesus_peregrino_norte',
    title: '16. Viagens ao Norte e Revelação Messiânica',
    description:
      'A missão nas fronteiras gentílicas de Tiro e Sidom, a Confissão de Pedro em Cesareia de Filipe e a Transfiguração no Monte Hermom.',
    waypoints: [
      {
        title: 'Tiro e Sidom (A Fé Cananeia)',
        step: 'Passo 1',
        coords: [33.27, 35.2],
        img: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
        verse: 'Mateus 15:21-28',
        quote:
          'Ó mulher, grande é a tua fé! Seja isso feito para contigo como tu desejas. E desde aquela hora a sua filha ficou sã.',
        bible:
          'A perseverança admirável da mulher siro-fenícia que reconheceu a mesa da graça de Jesus.',
        geo: 'Costa fenícia ao norte de Israel.',
        arch: 'Porto fenício e teatro clássico romano escavados em Al-Mina.',
        modelType: 'altar',
        modelName: 'A Fé de Tiro',
      },
      {
        title: 'Cesareia de Filipe (A Confissão de Pedro)',
        step: 'Passo 2',
        coords: [33.2483, 35.6933],
        img: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
        verse: 'Mateus 16:13-18',
        quote:
          'Tu és o Cristo, o Filho do Deus vivo... Pois também eu te digo que tu és Pedro, e sobre esta pedra edificarei a minha igreja...',
        bible:
          'A proclamação fundamental da identidade messiânica junto às portas do inferno (santuário de Pã).',
        geo: 'Nascentes límpidas do rio Jordão no sopé do Monte Hermom.',
        arch: 'Nicho rochoso talhado dedicado ao deus Pã e ruínas do palácio de Agripa II em Banias.',
        modelType: 'altar',
        modelName: 'A Rocha de Banias',
      },
      {
        title: 'Monte Hermom (A Transfiguração)',
        step: 'Passo 3',
        coords: [33.4167, 35.85],
        img: 'https://images.unsplash.com/photo-1682687220063-4742bd7fd538?auto=format&fit=crop&w=800&q=80',
        verse: 'Mateus 17:1-8',
        quote:
          'E transfigurou-se diante deles; e o seu rosto resplandeceu como o sol, e as suas vestes se tornaram brancas como a luz.',
        bible:
          'A glória da Deidade manifesta diante de Pedro, Tiago e João, ladeado pela Lei (Moisés) e Profetas (Elias).',
        geo: 'Ponto culminante da cordilheira do Antilíbano a 2.814 metros de altitude com neves perpétuas.',
        arch: 'Antigos santuários de cume semíticos dedicados a Baal-Hermom.',
        modelType: 'pillar',
        modelName: 'A Glória do Hermom',
      },
      {
        title: 'Decápolis (Cura do Surdo e Mudo)',
        step: 'Passo 4',
        coords: [32.65, 35.68],
        img: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80',
        verse: 'Marcos 7:31-37',
        quote:
          'E, olhando para o céu, suspirou, e disse-lhe: Efatá; isto é: Abre-te. E logo se abriram os seus ouvidos...',
        bible:
          'O ministério libertador na confederação das dez cidades gregas ao leste do Jordão.',
        geo: 'Gargantas profundas e platôs férteis além do lago de Tiberíades.',
        arch: 'Ruínas helenísticas e romanas com teatros e colunatas em Hippos (Sussita) e Gadara.',
        modelType: 'altar',
        modelName: 'Colunas da Decápolis',
      },
    ],
  },
  jesus_paixao_jerusalem: {
    id: 'jesus_paixao_jerusalem',
    title: '17. A Última Jornada de Jesus e a Paixão',
    description:
      'A subida de Jericó a Jerusalém, a ressurreição de Lázaro, a Entrada Triunfal, a agonia no Getsêmani, a Crucificação e a Ressurreição gloriosa.',
    waypoints: [
      {
        title: 'Jericó (Bartimeu e Zaqueu)',
        step: 'Passo 1',
        coords: [31.8625, 35.4608],
        img: 'https://images.unsplash.com/photo-1544085311-11a028465b03?auto=format&fit=crop&w=800&q=80',
        verse: 'Lucas 18:35-43 // Lucas 19:1-10',
        quote:
          'Jesus, Filho de Davi, tem misericórdia de mim!... Hoje veio a salvação a esta casa, pois também este é filho de Abraão.',
        bible:
          'A última parada na subida pelo deserto de Judá trazendo salvação ao publicano e luz ao cego.',
        geo: 'Cidade dos palácios de inverno herodianos no vale do Jordão.',
        arch: 'Palácio de Inverno de Herodes em Tulul Abu el-Alayiq com piscinas e colunatas romanas.',
        modelType: 'altar',
        modelName: 'Casa de Zaqueu',
      },
      {
        title: 'Betânia (Lázaro e a Unção)',
        step: 'Passo 2',
        coords: [31.7708, 35.2611],
        img: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
        verse: 'João 11:43 // João 12:3',
        quote:
          'Lázaro, sai para fora!... Então Maria, tomando um arrátel de unguento de nardo puro... ungiu os pés de Jesus...',
        bible:
          'O maior sinal prévio à Cruz: a vitória sobre a morte quatro dias após o sepultamento.',
        geo: 'Aldeia situada na encosta oriental do Monte das Oliveiras.',
        arch: 'Tumba de Lázaro talhada na rocha calcária em al-Eizariya.',
        modelType: 'altar',
        modelName: 'Tumba de Lázaro',
      },
      {
        title: 'Monte das Oliveiras (Entrada Triunfal)',
        step: 'Passo 3',
        coords: [31.778, 35.244],
        img: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=800&q=80',
        verse: 'Lucas 19:37-41',
        quote:
          'Bendito o Rei que vem em nome do Senhor; paz no céu, e glória nas alturas!... E, quando ia chegando, vendo a cidade, chorou sobre ela...',
        bible:
          'A aclamação do Rei Messias montado num jumentinho e o lamento profético pela destruição vindoura de Jerusalém.',
        geo: 'Crista montanhosa dominando o vale do Cedrom a 818 metros de altitude.',
        arch: 'Capela de Dominus Flevit com vista direta para a Esplanada do Templo.',
        modelType: 'scroll',
        modelName: 'Domingo de Ramos',
      },
      {
        title: 'Getsêmani (O Suor de Sangue)',
        step: 'Passo 4',
        coords: [31.7794, 35.24],
        img: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80',
        verse: 'Lucas 22:41-44',
        quote:
          'Pai, se queres, passa de mim este cálice; todavia não se faça a minha vontade, mas a tua... e o seu suor tornou-se em grandes gotas de sangue...',
        bible:
          'A obediência do Cordeiro na prensa de azeite e a entrega voluntária para redenção do mundo.',
        geo: 'Jardim na base do vale do Cedrom.',
        arch: 'Oliveiras milenares no Jardim do Getsêmani com datação botânica que remonta ao primeiro milênio.',
        modelType: 'altar',
        modelName: 'Prensa do Getsêmani',
      },
      {
        title: 'Gólgota e Sepulcro (A Ressurreição)',
        step: 'Passo 5',
        coords: [31.7838, 35.23],
        img: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=800&q=80',
        verse: 'João 19:30 // Mateus 28:5-6',
        quote:
          'Está consumado!... Mas o anjo, respondendo, disse às mulheres: Não tenhais medo; pois eu sei que buscais a Jesus, que foi crucificado. Não está aqui, porque já ressuscitou, como havia dito.',
        bible:
          'O ápice de toda a revelação bíblica: a expiação definitiva dos pecados e a vitória invicta sobre a morte.',
        geo: 'Colina fora dos muros antigos de Jerusalém.',
        arch: 'A Basílica do Santo Sepulcro e o Jardim da Tumba escavada na rocha com canal de pedra de rolamento.',
        modelType: 'altar',
        modelName: 'Túmulo Vazio',
      },
    ],
  },
  filipe_evangelista: {
    id: 'filipe_evangelista',
    title: '18. Missão Evangelística de Filipe',
    description:
      'O pioneirismo missionário em Samaria, o batismo do eunuco etíope no caminho deserto de Gaza e a proclamação pelas cidades costeiras.',
    waypoints: [
      {
        title: 'Cidade de Samaria',
        step: 'Passo 1',
        coords: [32.277, 35.1897],
        img: 'https://images.unsplash.com/photo-1542224566-6e85f2e6772f?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 8:5-8',
        quote:
          'E, descendo Filipe à cidade de Samaria lhes pregava a Cristo. E as multidões unanimemente prestavam atenção... e havia grande alegria naquela cidade.',
        bible:
          'O rompimento das barreiras étnicas e culturais com a primeira grande colheita de salvação fora da Judeia.',
        geo: 'Acrópole histórica de Sebaste.',
        arch: 'Colunata romana de Herodes e teatro clássico onde multidões se reuniam.',
        modelType: 'scroll',
        modelName: 'Avivamento em Samaria',
      },
      {
        title: 'Estrada Deserta de Gaza (O Eunuco Etíope)',
        step: 'Passo 2',
        coords: [31.5, 34.6],
        img: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 8:26-38',
        quote:
          'Como um cordeiro foi levado ao matadouro... E disse o eunuco: Eis aqui água; que impede que eu seja batizado? E mandou parar o carro, e desceram ambos à água...',
        bible:
          'A explicação de Isaías 53 ao oficial financeiro da rainha Candace e a entrada do Evangelho no continente africano.',
        geo: 'Antiga estrada que desce de Jerusalém a Hebrom e Gaza em direção ao Egito.',
        arch: 'Fontes de Ain ed-Dirweh em Halhul marcadas desde a era bizantina como local do batismo do eunuco.',
        modelType: 'scroll',
        modelName: 'Pergaminho de Isaías',
      },
      {
        title: 'Cesaréia Marítima',
        step: 'Passo 3',
        coords: [32.5011, 34.8919],
        img: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 8:40 // Atos 21:8-9',
        quote:
          'E Filipe se achou em Azoto e, indo passando, anunciava o evangelho em todas as cidades, até que chegou a Cesaréia.',
        bible:
          'A base missionária duradoura de Filipe e suas quatro filhas que profetizavam, acolhendo Paulo anos depois.',
        geo: 'Maior porto mediterrâneo da Judeia romana.',
        arch: 'Aqueduto monumental de Cesaréia e o Palácio do Promontório de Herodes.',
        modelType: 'altar',
        modelName: 'Casa de Filipe',
      },
    ],
  },
  pedro_missoes: {
    id: 'pedro_missoes',
    title: '19. Viagens Apostólicas de Pedro',
    description:
      "A cura de Enéias em Lida, a ressurreição de Dorcas em Jope e o 'Pentecostes dos Gentios' na casa do centurião Cornélio em Cesaréia.",
    waypoints: [
      {
        title: 'Lida (Lod)',
        step: 'Passo 1',
        coords: [31.95, 34.89],
        img: 'https://images.unsplash.com/photo-1544085311-11a028465b03?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 9:32-35',
        quote:
          'E disse-lhe Pedro: Enéias, Jesus Cristo te dá saúde; levanta-te e faze a tua cama. E logo se levantou. E viram-no todos os que habitavam em Lida e Sarona...',
        bible:
          'O ministério itinerante apostólico consolidando as congregações da planície costeira.',
        geo: 'Encruzilhada comercial na planície fértil de Sarona.',
        arch: 'Mosaico romano de Lod com animais marinhos e barcos mercantes do primeiro século.',
        modelType: 'altar',
        modelName: 'Milagre de Lida',
      },
      {
        title: 'Jope (Casa de Simão Curtidor)',
        step: 'Passo 2',
        coords: [32.05, 34.75],
        img: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 9:40 // Atos 10:11-15',
        quote:
          'Tabita, levanta-te... E ela abriu os olhos... E viu o céu aberto, e um vaso que descia... O que Deus purificou não o faças tu comum.',
        bible:
          'A ressurreição de Dorcas e a visão revolucionária do lençol que abriu a salvação incondicional aos gentios.',
        geo: 'Terraço à beira-mar com brisa costeira.',
        arch: 'A tradicional Casa de Simão, o Curtidor, no bairro histórico de Jaffa.',
        modelType: 'scroll',
        modelName: 'Visão dos Céus Abertos',
      },
      {
        title: 'Cesaréia (A Casa de Cornélio)',
        step: 'Passo 3',
        coords: [32.5011, 34.8919],
        img: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 10:44-48',
        quote:
          'E, dizendo Pedro ainda estas palavras, caiu o Espírito Santo sobre todos os que ouviam a palavra. E os fiéis que eram da circuncisão maravilharam-se...',
        bible:
          'A descida soberana do Espírito Santo sobre os oficiais romanos sem necessidade da circuncisão ritual.',
        geo: 'Quartel-general da coorte itálica romana na Judeia.',
        arch: 'A famosa Pedra de Pôncio Pilatos encontrada nas escavações do teatro de Cesaréia.',
        modelType: 'altar',
        modelName: 'O Pentecostes dos Gentios',
      },
    ],
  },
  paulo: {
    id: 'paulo',
    title: '20. 1ª Viagem Missionária de Paulo e Barnabé',
    description:
      'O avanço apostólico pioneiro saindo de Antioquia, cruzando Chipre e alcançando a Galácia (Panfília e Pisídia).',
    waypoints: [
      {
        title: 'Antioquia da Síria',
        step: 'Passo 1',
        coords: [36.2021, 36.1606],
        img: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 13:1-3',
        quote:
          'E, servindo eles ao Senhor, e jejuando, disse o Espírito Santo: Apartai-me a Barnabé e a Saulo...',
        bible:
          'O envio missionário oficial pela igreja mediante oração, jejum e imposição de mãos.',
        geo: 'Margem do rio Orontes, terceira maior cidade do Império Romano.',
        arch: 'Antigo porto de Selêucia Piéria de onde o navio zarpou.',
        modelType: 'ship',
        modelName: 'Nau de Envio',
      },
      {
        title: 'Pafos (Chipre)',
        step: 'Passo 2',
        coords: [34.7578, 32.4181],
        img: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 13:6-12',
        quote:
          'Então o procônsul Sérgio Paulo, vendo o que havia acontecido, creu, maravilhado da doutrina do Senhor.',
        bible:
          'Confronto com o mágico Elimas e a conversão do primeiro governador romano de uma província inteira.',
        geo: 'Costa ocidental da ilha de Chipre.',
        arch: 'Pilar de São Paulo e o Palácio do Procônsul com famosos pisos de mosaico.',
        modelType: 'scroll',
        modelName: 'Decreto Proconsular',
      },
      {
        title: 'Antioquia da Pisídia',
        step: 'Passo 3',
        coords: [38.3039, 31.1878],
        img: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 13:14-48',
        quote:
          'Mas nós nos voltamos para os gentios; porque o Senhor assim no-lo mandou: Eu te pus para luz dos gentios...',
        bible:
          'O magnífico sermão sinagogal de Paulo recapitulando a história de Israel e abrindo a salvação a todas as nações.',
        geo: 'Planalto da Anatólia Central a mais de 1.200m de altitude.',
        arch: 'Templo de Augusto, Teatro Romano e restos da Basílica Cristã de Paulo.',
        modelType: 'scroll',
        modelName: 'Sermão da Pisídia',
      },
      {
        title: 'Listra (Licaônia)',
        step: 'Passo 4',
        coords: [37.5683, 32.2208],
        img: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 14:8-20',
        quote:
          'E apedrejaram a Paulo e o arrastaram para fora da cidade, cuidando que estava morto. Mas, rodeando-o os discípulos, levantou-se e entrou na cidade.',
        bible:
          'A cura do coxo de nascença, a confusão idólatra e o apedrejamento de Paulo seguido de livramento milagroso.',
        geo: 'Colinas isoladas da planície de Cônia.',
        arch: 'Cidade natal de Timóteo, identificada no outeiro de Kilistra.',
        modelType: 'altar',
        modelName: 'Memorial de Timóteo',
      },
    ],
  },
  paulo_2_viagem: {
    id: 'paulo_2_viagem',
    title: '21. 2ª Viagem Missionária de Paulo',
    description:
      'A visão macedônia em Trôade, o terremoto na prisão de Filipos, o discurso no Areópago de Atenas e o ministério em Corinto.',
    waypoints: [
      {
        title: 'Trôade (Visão do Macedônio)',
        step: 'Passo 1',
        coords: [39.75, 26.16],
        img: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 16:9-10',
        quote:
          'E Paulo teve de noite uma visão, em que se apresentou um homem da Macedônia, e lhe rogou, dizendo: Passa à Macedônia, e ajuda-nos!',
        bible:
          'O Espírito Santo fecha as portas da Ásia e direciona o Evangelho para o continente europeu.',
        geo: 'Porto de Alexandria de Trôade na costa do mar Egeu.',
        arch: 'Muralhas monumentais e porto imperial de Alexandria Troas.',
        modelType: 'ship',
        modelName: 'Rumo à Macedônia',
      },
      {
        title: 'Filipos (O Terremoto e o Carcereiro)',
        step: 'Passo 2',
        coords: [41.01, 24.28],
        img: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 16:25-31',
        quote:
          'E, perto da meia-noite, Paulo e Silas oravam e cantavam hinos a Deus... e de repente sobreveio um tão grande terremoto... Crê no Senhor Jesus Cristo e serás salvo, tu e a tua casa.',
        bible:
          'A conversão de Lídia junto ao rio e a libertação miraculosa na colônia romana de Filipos.',
        geo: 'Ao longo da famosa estrada militar romana Via Egnatia.',
        arch: "A tradicional 'Prisão de São Paulo' em Filipos e o fórum romano.",
        modelType: 'altar',
        modelName: 'Cadeia de Filipos',
      },
      {
        title: 'Atenas (O Discurso no Areópago)',
        step: 'Passo 3',
        coords: [37.97, 23.72],
        img: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 17:22-31',
        quote:
          'Varões atenienses, em tudo vos vejo um tanto supersticiosos; Porque, passando eu e vendo os vossos santuários, achei também um altar em que estava escrito: AO DEUS DESCONHECIDO.',
        bible:
          'O confronto filosófico na colina de Marte com epicureus e estóicos proclamando a Ressurreição.',
        geo: 'Colina rochosa de calcário ao lado da Acrópole ateniense.',
        arch: 'Inscrição de bronze gravada com o discurso de Paulo fixada na rocha do Areópago.',
        modelType: 'scroll',
        modelName: 'Discurso do Areópago',
      },
      {
        title: 'Corinto (O Tribunal de Gálio)',
        step: 'Passo 4',
        coords: [37.9056, 22.8797],
        img: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 18:9-12',
        quote:
          'Não temas, mas fala, e não te cales; porque eu sou contigo, e ninguém lançará mão de ti para te fazer mal, pois tenho muito povo nesta cidade.',
        bible:
          'Dezoito meses de ministério pastoral na casa de Áquila e Priscila gerando as cartas aos Coríntios.',
        geo: 'Istmo comercial ligando o Peloponeso à Grécia continental.',
        arch: 'A plataforma do Bema (tribunal proconsular de Gálio) e a célebre inscrição de Erasto.',
        modelType: 'altar',
        modelName: 'Bema de Corinto',
      },
    ],
  },
  paulo_3_viagem: {
    id: 'paulo_3_viagem',
    title: '22. 3ª Viagem Missionária de Paulo',
    description:
      'Três anos de poder na escola de Tirano em Éfeso, a ressurreição de Eutico em Trôade e a comovente despedida aos presbíteros em Mileto.',
    waypoints: [
      {
        title: 'Éfeso (Escola de Tirano e o Grande Teatro)',
        step: 'Passo 1',
        coords: [37.94, 27.34],
        img: 'https://images.unsplash.com/photo-1544085311-11a028465b03?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 19:11-20',
        quote:
          'E Deus pelas mãos de Paulo fazia maravilhas extraordinárias. De sorte que até os lenços e aventais se levavam do seu corpo aos enfermos... Assim a palavra do Senhor crescia poderosamente.',
        bible:
          'Triunfo sobre a feitiçaria com a queima pública de livros e o tumulto de Demétrio no teatro de 25.000 lugares.',
        geo: 'Metrópole cosmopolita da Ásia Proconsular.',
        arch: 'O colossal Teatro de Éfeso, a Biblioteca de Celso e a rua dos Curetes.',
        modelType: 'scroll',
        modelName: 'Pergaminhos de Éfeso',
      },
      {
        title: 'Trôade (A Ressurreição de Eutico)',
        step: 'Passo 2',
        coords: [39.75, 26.16],
        img: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 20:7-12',
        quote:
          'E um jovem, por nome Eutico... tomado de um profundo sono, caiu do terceiro andar abaixo, e foi levantado morto. Paulo desceu, inclinou-se sobre ele... e disse: Não vos perturbeis, que a sua alma nele está.',
        bible:
          'O partir do pão no primeiro dia da semana com a ressurreição do jovem após mensagem até a meia-noite.',
        geo: 'Porto marítimo com vista para a ilha de Tênedos.',
        arch: 'Termas de Herodes Ático e fundações de casas romanas de múltiplos andares.',
        modelType: 'altar',
        modelName: 'Memorial de Trôade',
      },
      {
        title: 'Mileto (A Despedida dos Presbíteros)',
        step: 'Passo 3',
        coords: [37.53, 27.27],
        img: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 20:24-38',
        quote:
          'Mas em nada tenho a minha vida por preciosa, contanto que cumpra com alegria a minha carreira, e o ministério que recebi do Senhor Jesus... E pondo-se de joelhos, orou com todos eles. E levantou-se um grande pranto...',
        bible:
          'O mais terno e comovente discurso apostólico exortando a pastorear a igreja de Deus comprada com Seu próprio sangue.',
        geo: 'Antiga cidade portuária na foz do rio Meandro.',
        arch: "O imenso Teatro de Mileto e a 'Porta dos Leões' que dava acesso ao mar.",
        modelType: 'scroll',
        modelName: 'Discurso de Mileto',
      },
      {
        title: 'Cesaréia e Jerusalém (A Prisão no Templo)',
        step: 'Passo 4',
        coords: [31.7683, 35.2137],
        img: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 21:13 // Atos 21:30-33',
        quote:
          'Estou pronto não só a ser ligado, mas ainda a morrer em Jerusalém pelo nome do Senhor Jesus... E toda a cidade se alvoroçou... e o tribuno o prendeu com duas cadeias.',
        bible:
          'A profecia de Ágabo, a coragem inabalável de Paulo e sua prisão romana na Fortaleza Antônia.',
        geo: 'Jerusalém e a rampa da Fortaleza Antônia dominando os pátios do Templo.',
        arch: 'Escadarias de acesso e pedras de pavimento do Litóstrotos da Fortaleza Antônia.',
        modelType: 'altar',
        modelName: 'Cadeias em Jerusalém',
      },
    ],
  },
  paulo_roma: {
    id: 'paulo_roma',
    title: '23. A Viagem de Paulo a Roma (Prisioneiro de Cristo)',
    description:
      'A viagem marítima de Cesaréia a Roma: o naufrágio em Malta e a chegada triunfal ao centro do império.',
    waypoints: [
      {
        title: 'Cesaréia Marítima',
        step: 'Passo 1',
        coords: [32.5011, 34.8919],
        img: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 25:11-12',
        quote:
          'Apelo para César! Então Festo... respondeu: Apelaste para César? Para César irás.',
        bible:
          'A apelação legal de Paulo como cidadão romano diante do governador Festo e do rei Agripa.',
        geo: 'Porto artificial construído por Herodes.',
        arch: 'Prisão no Pretório de Herodes onde Paulo esteve detido por 2 anos.',
        modelType: 'ship',
        modelName: 'Galeão Romano',
      },
      {
        title: 'Bons Portos (Creta)',
        step: 'Passo 2',
        coords: [34.9333, 24.8],
        img: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 27:8-10',
        quote:
          'Senhores, vejo que a navegação há de ser com incômodo e muito dano, não só para a carga e navio, mas também para as nossas vidas.',
        bible:
          'O aviso profético de Paulo sobre a tempestade iminente no Mediterrâneo.',
        geo: 'Baía protegida na costa sul da ilha de Creta.',
        arch: 'Porto natural preservado até a atualidade com capela dedicada a Paulo.',
        modelType: 'ship',
        modelName: 'Nau de Alexandria',
      },
      {
        title: 'Malta (Baía de São Paulo)',
        step: 'Passo 3',
        coords: [35.9497, 14.3989],
        img: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 27:44 // Atos 28:1-6',
        quote:
          'E assim aconteceu que todos chegaram à terra a salvo... E os bárbaros usaram conosco de não pouca humanidade...',
        bible:
          'O milagroso resgate dos 276 passageiros sem perda de vidas, a picada inofensiva da víbora e a cura do pai de Públio.',
        geo: 'Ilha estratégica no centro do Mar Mediterrâneo.',
        arch: 'Âncoras de chumbo romanas do primeiro século recuperadas na enseada de São Tomás em Malta.',
        modelType: 'altar',
        modelName: 'Âncora da Esperança',
      },
      {
        title: 'Pozzuoli (Baía de Nápoles)',
        step: 'Passo 4',
        coords: [40.8268, 14.1205],
        img: 'https://images.unsplash.com/photo-1499933374294-4584851497cc?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 28:13-14',
        quote:
          'E daí... chegamos a Pozzuoli, onde, achando alguns irmãos, fomos convidados a ficar com eles sete dias; e assim fomos para Roma.',
        bible:
          'O desembarque na Itália e a acolhida fraterna dos cristãos locais.',
        geo: 'Principal porto de trigo do Império Romano em frente ao Vesúvio.',
        arch: 'Anfiteatro Flaviano e o Templo-Mercado de Serápis.',
        modelType: 'ship',
        modelName: 'Porto de Puteoli',
      },
      {
        title: 'Roma (Via Ápia Antiga)',
        step: 'Passo 5',
        coords: [41.9028, 12.4964],
        img: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 28:30-31',
        quote:
          'E Paulo ficou dois anos inteiros na sua própria habitação alugada... Pregando o reino de Deus, e ensinando com toda a liberdade as coisas pertencentes ao Senhor Jesus Cristo, sem impedimento algum.',
        bible:
          'A proclamação desimpedida do Evangelho no coração do Império Romano sob guarda militar, gerando as cartas da prisão (Efésios, Filipenses, Colossenses, Filemom).',
        geo: 'Roma imperial, Colinas de Roma.',
        arch: 'A Via Ápia Antiga pavimentada com lajes de basalto e a Basílica de São Paulo Extramuros sobre o túmulo do apóstolo.',
        modelType: 'scroll',
        modelName: 'Epístolas da Prisão',
      },
    ],
  },
};
