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
      'A peregrinação de fé de Abraão desde Ur dos Caldeus, passando por Harã, Canaã (Siquém, Betel, Hebrom, Berseba) e o Egito.',
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
          'O início da peregrinação da família de Abraão a partir de uma das mais avançadas metrópoles da Mesopotâmia antiga.',
        geo: 'Localizada na planície aluvial do sul da Mesopotâmia (atual Iraque), próxima ao antigo curso do rio Eufrates.',
        arch: 'Famosa pelo grande zigurate de Ur, escavado por Sir Leonard Woolley.',
        modelType: 'altar',
        modelName: 'Zigurate de Ur',
      },
      {
        title: 'Harã',
        step: 'Passo 2',
        coords: [36.8647, 39.0286],
        img: 'https://images.unsplash.com/photo-1547124220-405bbfd84f5c?auto=format&fit=crop&w=800&q=80',
        verse: 'Gênesis 12:1-4',
        quote:
          'Ora, o Senhor disse a Abrão: Sai da tua terra... e Abrão partiu, como o Senhor lhe dissera, e Ló foi com ele; e era Abrão da idade de setenta e cinco anos quando saiu de Harã.',
        bible:
          'O local onde Terá faleceu e onde Abraão recebeu o chamado direto de Deus para ir a Canaã.',
        geo: 'Importante centro comercial no norte da Mesopotâmia, na atual província de Şanlıurfa, Turquia.',
        arch: 'Conhecida por suas casas típicas de adobe em formato de colmeia e ruínas de antigas muralhas.',
        modelType: 'scroll',
        modelName: 'Pergaminho da Promessa',
      },
      {
        title: 'Siquém',
        step: 'Passo 3',
        coords: [32.2134, 35.2789],
        img: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80',
        verse: 'Gênesis 12:6-7',
        quote:
          'E passou Abrão por aquela terra até ao lugar de Siquém, até ao carvalho de Moré... E apareceu o Senhor a Abrão, e disse: À tua semente darei esta terra. E edificou ali um altar ao Senhor.',
        bible:
          'Primeiro local em Canaã onde Deus confirmou a promessa da terra e onde Abraão edificou seu primeiro altar na terra prometida.',
        geo: 'Localizada no vale estreito entre o Monte Ebal e o Monte Gerizim, um ponto de cruzamento de rotas naturais.',
        arch: 'Ruínas de Tell Balata revelam uma importante cidade fortificada do Bronze Médio e Tardio.',
        modelType: 'altar',
        modelName: 'Altar de Siquém',
      },
      {
        title: 'Betel',
        step: 'Passo 4',
        coords: [31.9333, 35.2167],
        img: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80',
        verse: 'Gênesis 12:8',
        quote:
          'E moveu-se dali para o monte à banda do oriente de Betel, e armou a sua tenda... e edificou ali um altar ao Senhor, e invocou o nome do Senhor.',
        bible:
          'Um santuário chave onde Abraão armou suas tendas e invocou a Deus, e mais tarde Jacó teve sua visão celestial da escada.',
        geo: 'Situada nas montanhas de Judá, ao norte de Jerusalém, ao longo da rota da cumeeira montanhosa.',
        arch: 'Identificada com a moderna Beitin, escavações revelam uma transição ocupacional densa desde o Bronze.',
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
          'E havia fome naquela terra; e desceu Abrão ao Egito, para peregrinar ali, porque a fome era grande na terra.',
        bible:
          'O teste de fé de Abraão diante da escassez, envolvendo o Faraó e a preservação de Sara.',
        geo: 'A região extremamente fértil do Delta do Nilo (Baixo Egito), celeiro do antigo Oriente Próximo.',
        arch: 'Cidades dinásticas como Tânis e Ávaris revelam forte influência e presença de povos semitas.',
        modelType: 'scroll',
        modelName: 'Papiro Egípcio',
      },
      {
        title: 'Hebrom',
        step: 'Passo 6',
        coords: [31.5298, 35.0998],
        img: 'https://images.unsplash.com/photo-1544085311-11a028465b03?auto=format&fit=crop&w=800&q=80',
        verse: 'Gênesis 13:18',
        quote:
          'E mudou Abrão as suas tendas, e foi, e habitou nos carvalhais de Manre, que estão em Hebrom; e edificou ali um altar ao Senhor.',
        bible:
          'Local de habitação prolongada de Abraão, compra da caverna de Macpela para sepultura de Sara e dos patriarcas.',
        geo: 'Uma das cidades mais elevadas da Judeia (aprox. 930m de altitude), fértil em vinhas e oliveiras.',
        arch: 'O monumental Túmulo dos Patriarcas (Haram al-Khalil) construído por Herodes, o Grande.',
        modelType: 'altar',
        modelName: 'Túmulo dos Patriarcas',
      },
      {
        title: 'Berseba',
        step: 'Passo 7',
        coords: [31.2447, 34.8013],
        img: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=800&q=80',
        verse: 'Gênesis 21:31-33',
        quote:
          'Por isso se chamou aquele lugar Berseba, porquanto ambos juraram ali... E plantou um bosque em Berseba, e invocou ali o nome do Senhor.',
        bible:
          'O local do pacto de paz com Abimeleque, o poço cavado por Abraão e a invocação de Deus como El Olam (Deus Eterno).',
        geo: 'Portão de entrada para o deserto do Neguebe, marcando a fronteira meridional histórica de Israel.',
        arch: 'O sítio de Tel Beer Sheva exibe um sistema avançado de abastecimento de água do período bíblico.',
        modelType: 'altar',
        modelName: 'Poço de Abraão',
      },
    ],
  },
  exodo: {
    id: 'exodo',
    title: 'Rota do Êxodo',
    description:
      'A jornada de libertação do Egito até a Terra Prometida, passando pelo Monte Sinai e atravessando o deserto sob a liderança de Moisés.',
    waypoints: [
      {
        title: 'Ramessés (Egito)',
        step: 'Passo 1',
        coords: [30.7963, 31.8347],
        img: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
        verse: 'Êxodo 12:37',
        quote: 'Assim partiram os filhos de Israel de Ramessés para Sucote...',
        bible:
          'O ponto de partida do êxodo marca o fim de 430 anos de permanência no Egito.',
        geo: 'Localizada no fértil Delta do Nilo (a terra de Gósen).',
        arch: 'Identificada historicamente com a cidade de Pi-Ramessés.',
        modelType: 'altar',
        modelName: 'Altar de Tijolos (Egito)',
      },
      {
        title: 'Sucote',
        step: 'Passo 2',
        coords: [30.5667, 32.2667],
        img: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=800&q=80',
        verse: 'Êxodo 13:20',
        quote:
          'E, partindo de Sucote, acamparam-se em Etã, à entrada do deserto...',
        bible:
          'Primeiro acampamento de Israel e o início da manifestação da coluna de nuvem e de fogo.',
        geo: 'Localizada na região de Wadi Tumilat, um canal leste-oeste ligando o Nilo aos lagos amargos.',
        arch: 'Identificada com Tell el-Maskhuta, um local fortificado e de armazenamento egípcio.',
        modelType: 'pillar',
        modelName: 'Coluna de Nuvem / Fogo',
      },
      {
        title: 'Travessia do Mar Vermelho',
        step: 'Passo 3',
        coords: [28.85, 32.85],
        img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
        verse: 'Êxodo 14:21-22',
        quote: 'Moisés estendeu a mão sobre o mar... e as águas se dividiram.',
        bible:
          'O momento central de livramento do Antigo Testamento, aniquilando as forças do Faraó.',
        geo: 'Provavelmente no Golfo de Suez ou no Golfo de Aqaba.',
        arch: 'Debates intensos sobre a tradução Yam Suph (Mar de Juncos).',
        modelType: 'pillar',
        modelName: 'Coluna de Fogo / Nuvem',
      },
      {
        title: 'Mara (Águas Amargas)',
        step: 'Passo 4',
        coords: [29.1833, 32.95],
        img: 'https://images.unsplash.com/photo-1544085311-11a028465b03?auto=format&fit=crop&w=800&q=80',
        verse: 'Êxodo 15:23-25',
        quote:
          'E chegaram a Mara; mas não puderam beber das águas de Mara, porque eram amargas... E ele clamou ao Senhor, e o Senhor mostrou-lhe um tronco...',
        bible:
          'A primeira grande prova de provisão física e cura das águas após a travessia do mar.',
        geo: 'Identificada tradicionalmente com Ain Hawara, no deserto de Sur, península ocidental do Sinai.',
        arch: 'Uma das antigas fontes salobras da rota de caravanas de comércio de cobre.',
        modelType: 'pillar',
        modelName: 'Árvore de Provisão',
      },
      {
        title: 'Elim',
        step: 'Passo 5',
        coords: [29.05, 33.1333],
        img: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=800&q=80',
        verse: 'Êxodo 15:27',
        quote:
          'E vieram a Elim, e havia ali doze fontes de água e setenta palmeiras; e acamparam-se ali junto das águas.',
        bible:
          'Local de refrigério espiritual e descanso abundante concedido por Deus no deserto.',
        geo: 'Identificada com Wadi Gharandel, um oásis verdejante e profundo corte natural no deserto do Sinai.',
        arch: 'Importante parada de comércio e pastoreio nômada de longa duração histórico.',
        modelType: 'scroll',
        modelName: 'Oásis de Palmeiras',
      },
      {
        title: 'Refidim',
        step: 'Passo 6',
        coords: [28.65, 33.7833],
        img: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80',
        verse: 'Êxodo 17:1-8',
        quote:
          'E acampou-se o povo em Refidim, e não havia ali água para o povo beber... Então veio Amaleque, e pelejou contra Israel em Refidim.',
        bible:
          'O local onde Moisés feriu a rocha para dar água e a vitória militar sobre os amalequitas com as mãos de Moisés erguidas.',
        geo: 'Planície árida localizada no wadi a caminho do maciço granítico do sul do Sinai.',
        arch: 'Local de antigos altares nômadas e vestígios de inscrições de rochas pré-islâmicas.',
        modelType: 'altar',
        modelName: 'Rocha Ferida',
      },
      {
        title: 'Monte Sinai (Horebe)',
        step: 'Passo 7',
        coords: [28.5385, 33.9753],
        img: 'https://images.unsplash.com/photo-1682687220063-4742bd7fd538?auto=format&fit=crop&w=800&q=80',
        verse: 'Êxodo 19:20',
        quote: 'O Senhor desceu ao topo do monte Sinai e chamou Moisés...',
        bible: 'O nascimento de Israel como nação sob a Aliança.',
        geo: 'Tradicionalmente associado a Jebel Musa no sul do Sinai.',
        arch: 'No sopé deste monte fica o Mosteiro de Santa Catarina.',
        modelType: 'ark',
        modelName: 'A Arca da Aliança',
      },
      {
        title: 'Cades-Barneia',
        step: 'Passo 8',
        coords: [30.6417, 34.4167],
        img: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80',
        verse: 'Números 13:26',
        quote:
          'E foram, e chegaram a Moisés, e a Arão, e a toda a congregação... em Cades, e deram-lhes notícias... e mostraram-lhes o fruto da terra.',
        bible:
          'Oásis fronteiriço de onde partiram os doze espias de Canaã e onde o povo rebelou-se, resultando na condenação de 40 anos.',
        geo: 'Localizado na divisa geográfica entre o deserto do Parã, o deserto de Zim e as colinas do sul de Canaã (Neguebe).',
        arch: 'Escavações em Ein el-Qudeirat revelam uma monumental fortaleza da Idade do Ferro.',
        modelType: 'scroll',
        modelName: 'Fortaleza de Cades',
      },
      {
        title: 'Monte Nebo',
        step: 'Passo 9',
        coords: [31.765, 35.7258],
        img: 'https://images.unsplash.com/photo-1547124220-405bbfd84f5c?auto=format&fit=crop&w=800&q=80',
        verse: 'Deuteronômio 34:1-5',
        quote:
          'Então subiu Moisés das planícies de Moabe ao monte Nebo, ao cume de Pisga... E mostrou-lhe o Senhor toda a terra...',
        bible:
          'O ponto final do êxodo sob a liderança de Moisés, de onde ele contemplou a Terra Prometida antes de morrer.',
        geo: 'Membro da cordilheira de Abarim, na Transjordânia (atual Jordânia), oferecendo vista panorâmica do Vale do Jordão e do Mar Morto.',
        arch: 'Local de basílicas bizantinas primitivas com mosaicos monumentais preservados.',
        modelType: 'pillar',
        modelName: 'Memorial de Moisés',
      },
    ],
  },
  jesus_galileia: {
    id: 'jesus_galileia',
    title: 'Ministério Galileu de Jesus',
    description:
      'A intensa atividade missionária, milagres e ensinamentos de Jesus Cristo na região ao redor do Mar da Galileia.',
    waypoints: [
      {
        title: 'Rio Jordão (Batismo)',
        step: 'Passo 1',
        coords: [31.8372, 35.5503],
        img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
        verse: 'Mateus 3:13-17',
        quote:
          'Então veio Jesus da Galileia ter com João, junto do Jordão, para ser batizado por ele...',
        bible:
          'O ponto de partida oficial e a unção messiânica do ministério terrestre de Jesus.',
        geo: 'O vale do rio Jordão inferior, marcando o limite geográfico oriental da Judeia.',
        arch: 'Sítio arqueológico de Al-Maghtas (Jordânia/Israel), com igrejas bizantinas de batismo de peregrinos.',
        modelType: 'scroll',
        modelName: 'Pomba do Espírito',
      },
      {
        title: 'Monte da Tentação',
        step: 'Passo 2',
        coords: [31.8744, 35.4331],
        img: 'https://images.unsplash.com/photo-1682687220063-4742bd7fd538?auto=format&fit=crop&w=800&q=80',
        verse: 'Mateus 4:1-11',
        quote:
          'Então foi conduzido Jesus pelo Espírito ao deserto, para ser tentado pelo diabo...',
        bible:
          'O jejum de 40 dias e o teste de obediência espiritual de Jesus antes do início da pregação.',
        geo: 'Localizado no deserto da Judeia, erguendo-se dramaticamente sobre a cidade antiga de Jericó.',
        arch: 'O Mosteiro de Quarental (Deir al-Qarantal) construído nas rochas verticais da montanha.',
        modelType: 'pillar',
        modelName: 'Memorial do Deserto',
      },
      {
        title: 'Nazaré',
        step: 'Passo 3',
        coords: [32.7019, 35.3033],
        img: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80',
        verse: 'Lucas 4:16-30',
        quote:
          'E, chegando a Nazaré, onde fora criado, entrou num dia de sábado... E levantaram-se, e o expulsaram da cidade...',
        bible:
          'A cidade de origem familiar de Jesus e o local de sua primeira proclamação messiânica na sinagoga.',
        geo: 'Situada em uma bacia natural cercada de colinas na Baixa Galileia.',
        arch: 'Ruínas de habitações rústicas do século I escavadas sob a Basílica da Anunciação.',
        modelType: 'scroll',
        modelName: 'Sinagoga de Nazaré',
      },
      {
        title: 'Caná',
        step: 'Passo 4',
        coords: [32.7481, 35.3378],
        img: 'https://images.unsplash.com/photo-1544085311-11a028465b03?auto=format&fit=crop&w=800&q=80',
        verse: 'João 2:1-11',
        quote:
          'Jesus principiou assim os seus sinais em Caná da Galileia, e manifestou a sua glória; e os seus discípulos creram nele.',
        bible:
          'Transformação da água em vinho no casamento de Caná, inaugurando o ministério público através do primeiro milagre.',
        geo: 'Pequeno assentamento na planície ao norte de Nazaré.',
        arch: 'Identificada historicamente com Khirbet Qana, escavações revelam vasos de purificação de pedra do período romano.',
        modelType: 'altar',
        modelName: 'Talha de Pedra',
      },
      {
        title: 'Cafarnaum',
        step: 'Passo 5',
        coords: [32.8808, 35.575],
        img: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?auto=format&fit=crop&w=800&q=80',
        verse: 'Mateus 4:13',
        quote:
          'E, deixando Nazaré, foi habitar em Cafarnaum, cidade marítima, nos confins de Zebulom e Naftali...',
        bible:
          'O quartel-general do ministério público de Jesus, local de ensinamento na sinagoga e cura da sogra de Pedro.',
        geo: 'Cidade portuária e comercial nas margens noroeste do Mar da Galileia.',
        arch: 'Ruínas da sinagoga de calcário branco e a casa octogonal associada ao apóstolo Pedro.',
        modelType: 'scroll',
        modelName: 'Casa de Pedro',
      },
      {
        title: 'Monte das Bem-Aventuranças',
        step: 'Passo 6',
        coords: [32.8805, 35.5492],
        img: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80',
        verse: 'Mateus 5:1-3',
        quote:
          'E Jesus, vendo a multidão, subiu a um monte, e... abriu a sua boca, e os ensinava, dizendo: Bem-aventurados...',
        bible:
          'O local do Sermão do Monte, que estabeleceu a nova constituição ética e espiritual do Reino de Deus.',
        geo: 'Encosta verdejante suavemente inclinada, ao norte de Cafarnaum, com acústica natural soberba.',
        arch: 'Localizado na encosta de Tabgha, coroado hoje com um belo santuário bizantino octogonal.',
        modelType: 'pillar',
        modelName: 'Monte do Sermão',
      },
      {
        title: 'Betsaida',
        step: 'Passo 7',
        coords: [32.9067, 35.6267],
        img: 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?auto=format&fit=crop&w=800&q=80',
        verse: 'Lucas 9:10-17',
        quote:
          'E, retirando-se à parte, foi para um lugar deserto de uma cidade chamada Betsaida... E tomou os cinco pães e os dois peixes...',
        bible:
          'Terra natal de Pedro, André e Filipe; local da multiplicação dos pães e cura do cego de nascença.',
        geo: 'Situada no delta onde o rio Jordão desemboca no norte do Mar da Galileia.',
        arch: 'Sítio arqueológico de Et-Tell, exibindo antigas casas de pescadores e um palácio real arameu anterior.',
        modelType: 'ship',
        modelName: 'Cesta de Pães',
      },
      {
        title: 'Mar da Galileia',
        step: 'Passo 8',
        coords: [32.83, 35.59],
        img: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80',
        verse: 'Mateus 14:24-27',
        quote:
          'But the boat was now in the middle of the sea, tossed by the waves... And in the fourth watch of the night Jesus went to them, walking on the sea.',
        bible:
          'Manifestação da soberania divina de Jesus sobre a natureza ao acalmar a tempestade e andar nas águas.',
        geo: 'Grande lago de água doce na depressão do Vale do Rift Jordânico, situado a 210 metros abaixo do nível do mar.',
        arch: 'Descoberta famosa do Barco da Galileia do século I preservado na lama da margem perto de Ginosar.',
        modelType: 'ship',
        modelName: 'Barco da Galileia',
      },
      {
        title: 'Corazim',
        step: 'Passo 9',
        coords: [32.9136, 35.5683],
        img: 'https://images.unsplash.com/photo-1608958416629-106ab0e5c9b7?auto=format&fit=crop&w=800&q=80',
        verse: 'Mateus 11:21',
        quote:
          'Ai de ti, Corazim! Ai de ti, Betsaida! Porque, se em Tiro e em Sidom se fizessem os milagres que em vós se fizeram, há muito que se teriam arrependido...',
        bible:
          'Pronunciamento de advertência e juízo contra as cidades galileias que viram seus milagres mas não se arrependeram.',
        geo: 'Assentamento rochoso montanhoso situado a poucos quilômetros ao norte de Cafarnaum.',
        arch: 'Excelente preservação de sinagoga construída de basalto negro do século III-IV e da Cadeira de Moisés em pedra.',
        modelType: 'scroll',
        modelName: 'Cadeira de Moisés',
      },
    ],
  },
  paulo: {
    id: 'paulo',
    title: '1ª Viagem de Paulo',
    description: 'A primeira grande expedição missionária do Apóstolo Paulo.',
    waypoints: [
      {
        title: 'Antioquia da Síria',
        step: 'Passo 1',
        coords: [36.2021, 36.1606],
        img: 'https://images.unsplash.com/photo-1527842891421-42e67ff5758f?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 13:2',
        quote: 'Disse o Espírito Santo: Separai-me a Barnabé e a Saulo...',
        bible: 'A igreja base de missões para os gentios.',
        geo: 'Terceira maior cidade do Império Romano.',
        arch: 'Ponto crucial de rotas comerciais.',
        modelType: 'scroll',
        modelName: 'Pergaminhos das Epístolas',
      },
      {
        title: 'Seleucia da Pieria',
        step: 'Passo 2',
        coords: [36.1167, 35.9167],
        img: 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 13:4',
        quote:
          'Estes, pois, enviados pelo Espírito Santo, desceram a Seleucia e dali navegaram para Chipre.',
        bible:
          'O porto de embarque oficial de onde Paulo e Barnabé partiram para sua primeira viagem ultramarina.',
        geo: 'Cidade portuária helenística construída na costa do Mediterrâneo, perto da foz do rio Orontes.',
        arch: 'O famoso túnel de Tito, canal de engenharia romana colossal cavado na rocha para desvio de enchentes.',
        modelType: 'ship',
        modelName: 'Navio Helenístico',
      },
      {
        title: 'Salamina',
        step: 'Passo 3',
        coords: [35.1842, 33.9025],
        img: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 13:5',
        quote:
          'E, chegados a Salamina, anunciavam a palavra de Deus nas sinagogas dos judeus; e tinham também a João como cooperador.',
        bible:
          'A primeira pregação missionária em Chipre, anunciando a palavra de Deus diretamente nas sinagogas judaicas.',
        geo: 'Grande porto mercantil e capital oriental de Chipre, situada na foz do rio Pedieos.',
        arch: 'Monumentais termas romanas, colunas de ginásios helenísticos e o teatro antigo de Salamina.',
        modelType: 'scroll',
        modelName: 'Sinagoga de Salamina',
      },
      {
        title: 'Pafos',
        step: 'Passo 4',
        coords: [34.772, 32.4271],
        img: 'https://images.unsplash.com/photo-1483450388369-9ed95738483c?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 13:6-12',
        quote:
          'E... acharam um certo judeu, mago, falso profeta, chamado Barjesus... Mas Saulo, que também se chama Paulo... disse: Ó filho do diabo...',
        bible:
          'O confronto com o feiticeiro Elimas e a conversão de Sérgio Paulo.',
        geo: 'Centro administrativo e capital da província romana de Chipre, situada na ponta ocidental da ilha.',
        arch: 'Excepcionais vilas romanas com mosaicos decorados e as ruínas da basílica paleocristã.',
        modelType: 'scroll',
        modelName: 'Coluna de Paulo',
      },
      {
        title: 'Perge (Pamfília)',
        step: 'Passo 5',
        coords: [36.9608, 30.8522],
        img: 'https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 13:13',
        quote:
          'E, navegando de Pafos, Paulo e os que estavam com ele dirigiram-se a Perge, da Pamfília. Mas João, apartando-se deles, voltou para Jerusalém.',
        bible:
          'O local do desembarque na Ásia Menor e a separação de João Marcos do grupo missionário.',
        geo: 'Antiga cidade portuária no sul da Anatólia, situada no interior ao longo do rio Cestro.',
        arch: 'Grandiosas torres helenísticas de portão de entrada, o ninfeu romano e o longo estádio preservado.',
        modelType: 'scroll',
        modelName: 'Estátua de Perge',
      },
      {
        title: 'Antioquia da Pisídia',
        step: 'Passo 6',
        coords: [38.2975, 31.1856],
        img: 'https://images.unsplash.com/photo-1449034446853-66c86144b0ad?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 13:14-16',
        quote:
          'E eles, saindo de Perge, chegaram a Antioquia da Pisídia, e, entrando na sinagoga num dia de sábado, assentaram-se...',
        bible:
          'O primeiro grande sermão de Paulo documentado em Atos, ligando a história da redenção a Jesus Cristo.',
        geo: 'Metrópole e colônia militar romana situada no alto planalto central da Pisídia, nas encostas das montanhas de Taurus.',
        arch: 'As ruínas da imponente Basílica de São Paulo, o Templo de Augusto e o aqueduto romano.',
        modelType: 'scroll',
        modelName: 'Púlpito de Basílica',
      },
      {
        title: 'Icônio',
        step: 'Passo 7',
        coords: [37.8714, 32.4847],
        img: 'https://images.unsplash.com/photo-1542224566-6e85f2e6772f?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 14:1',
        quote:
          'E aconteceu em Icônio que, entrando juntos na sinagoga dos judeus, falaram de tal modo que creu uma grande multidão...',
        bible:
          'Pregação bem-sucedida aos judeus e gentios, seguida por conspiração local para apedrejar os apóstolos.',
        geo: 'Oásis fértil e importante nó de tráfego de estradas romanas na planície central da Licaônia (atual Konya, Turquia).',
        arch: 'Inscrições e monumentos cristãos bizantinos provando forte presença eclesiástica posterior.',
        modelType: 'scroll',
        modelName: 'Sinagoga de Icônio',
      },
      {
        title: 'Listra',
        step: 'Passo 8',
        coords: [37.5833, 32.45],
        img: 'https://images.unsplash.com/photo-1499933374294-4584851497cc?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 14:8-19',
        quote:
          'E estava em Listra um homem... coxo de nascença... Mas vieram uns judeus de Antioquia e de Icônio... e, apedrejando a Paulo, arrastaram-no para fora da cidade...',
        bible:
          'Cura miraculosa do coxo, aclamação popular como deuses gregos (Hermes e Zeus) e posterior apedrejamento cruel de Paulo.',
        geo: 'Pequeno assentamento e colônia militar romana remota no interior montanhoso de Licaônia.',
        arch: 'Uma estela monumental em latim confirma a localização de Listra em Hatunsaray, Turquia.',
        modelType: 'altar',
        modelName: 'Altar de Júpiter',
      },
      {
        title: 'Derbe',
        step: 'Passo 9',
        coords: [37.35, 33.3167],
        img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 14:20-21',
        quote:
          'E, no dia seguinte, partiu com Barnabé para Derbe. E, tendo anunciado o evangelho naquela cidade e feito muitos discípulos, voltaram para Listra...',
        bible:
          'Cidade onde Paulo encontrou refúgio pacífico, colheu muitos frutos de conversão e estabeleceu novos crentes antes do retorno.',
        geo: 'Cidade de fronteira da província da Galácia, situada no sopé oriental das montanhas de Karadağ.',
        arch: 'Inscrições epigráficas confirmando a existência histórica e o bispado de Kerti Hüyük.',
        modelType: 'scroll',
        modelName: 'Pergaminho de Derbe',
      },
    ],
  },
  paulo_roma: {
    id: 'paulo_roma',
    title: 'Viagem de Paulo a Roma',
    description:
      'A jornada épica do Apóstolo Paulo sob prisão romana, enfrentando tormentas, naufrágio em Malta e desembarque final na Itália até sua prisão domiciliar em Roma.',
    waypoints: [
      {
        title: 'Jerusalém (Prisão)',
        step: 'Passo 1',
        coords: [31.7683, 35.2137],
        img: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 21:30-33',
        quote:
          'E alvoroçou-se toda a cidade... e, prendendo-o, mandou o tribuno amarrá-lo com duas cadeias...',
        bible:
          'O tumulto no pátio do Templo e a prisão de Paulo pelas autoridades romanas.',
        geo: 'Cidade sagrada e centro cultural judaico, com a guarnição romana estacionada na Fortaleza Antonia.',
        arch: 'A Fortaleza Antonia construída por Herodes adjacente ao monte do Templo.',
        modelType: 'scroll',
        modelName: 'Cadeias de Ferro',
      },
      {
        title: 'Cesareia Marítima',
        step: 'Passo 2',
        coords: [32.5036, 34.9028],
        img: 'https://images.unsplash.com/photo-1544085311-11a028465b03?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 25:11-12',
        quote:
          'Apelo para César. Então Festo... respondeu: Apelaste para César? Para César irás.',
        bible:
          'Prisão de dois anos, discursos diante dos governadores romanos Félix, Festo e Rei Agripa, culminando no apelo supremo ao Imperador.',
        geo: 'Grande porto artificial romano e sede do palácio do governador romano na província da Judeia.',
        arch: 'O aqueduto monumental, o teatro, o hipódromo e a famosa inscrição de Pôncio Pilatos.',
        modelType: 'scroll',
        modelName: 'Palácio de Herodes',
      },
      {
        title: 'Sidom',
        step: 'Passo 3',
        coords: [33.5631, 35.3689],
        img: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 27:3',
        quote:
          'E no dia seguinte chegamos a Sidom; e Júlio, tratando Paulo humanamente, permitiu-lhe ir ver os amigos para que dele cuidassem.',
        bible:
          'Primeira escala marítima onde o centurião Júlio demonstrou benevolência incomum para com Paulo, permitindo-lhe comunhão fraterna.',
        geo: 'Antiga e florescente cidade portuária fenícia na costa ocidental do Levante (atual Líbano).',
        arch: 'O Castelo do Mar de Sidom de época posterior, edificado sobre ilha rochosa de fundações fenícias antigas.',
        modelType: 'ship',
        modelName: 'Porto Fenício',
      },
      {
        title: 'Mira (Lícia)',
        step: 'Passo 4',
        coords: [36.2575, 29.9847],
        img: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 27:5-6',
        quote:
          'E... chegamos a Mira, na Lícia. E achando ali o centurião um navio de Alexandria, que navegava para a Itália, nos fez embarcar nele.',
        bible:
          'O local onde a tripulação militar romana confiscou um grande navio graneleiro alexandrino para a travessia direta.',
        geo: 'Ponto chave de rotas comerciais marítimas, situado no sopé sul das colinas da província da Lícia (Anatólia).',
        arch: 'O colossal teatro romano esculpido em rocha e os monumentais túmulos lícios rupestres.',
        modelType: 'ship',
        modelName: 'Navio de Trigo',
      },
      {
        title: 'Bons Portos (Creta)',
        step: 'Passo 5',
        coords: [34.9333, 24.8167],
        img: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 27:8-10',
        quote:
          'E... chegamos a um lugar chamado Bons Portos, junto do qual estava a cidade de Laseia. E Paulo advertia-os: Senhores, vejo que a viagem vai ser com perigo...',
        bible:
          'Estadia prolongada em Creta e a advertência profética de Paulo contra o prosseguimento da navegação devido ao início do inverno.',
        geo: 'Baía natural abrigada na costa meridional da ilha de Creta, próxima a Laseia.',
        arch: 'Vestígios de construções costeiras helenísticas e capelas comemorativas cristãs antigas.',
        modelType: 'ship',
        modelName: 'Baía de Bons Portos',
      },
      {
        title: 'Malta (Naufrágio)',
        step: 'Passo 6',
        coords: [35.9375, 14.3754],
        img: 'https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 28:1-5',
        quote:
          'E, sabendo nós que estávamos salvos, soubemos então que a ilha se chamava Malta. E os bárbaros trataram-nos com não pouca humanidade...',
        bible:
          'O terrível naufrágio na baía de São Paulo sem perda de vidas, a fogueira dos nativos e a picada da víbora sem efeito em Paulo.',
        geo: 'Ilha de localização estratégica no centro do Mar Mediterrâneo, ao sul da ilha da Sicília.',
        arch: 'A baía de São Paulo exibe âncoras de chumbo romanas e ruínas de vilas de governadores locais da ilha.',
        modelType: 'ship',
        modelName: 'Âncora Romana',
      },
      {
        title: 'Siracusa',
        step: 'Passo 7',
        coords: [37.0755, 15.2866],
        img: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 28:12',
        quote:
          'E, chegando a Siracusa, ficamos ali três dias, de onde rodeando a costa fomos a Régio.',
        bible:
          'Breve e calma parada comercial de três dias a bordo de outro navio alexandrino que trazia o brasão de Castor e Pólux.',
        geo: 'Grande e influente cidade portuária fortificada na costa sudeste da Sicília.',
        arch: 'As monumentais pedreiras clássicas de Siracusa, o teatro grego e a fonte mítica de Arethusa.',
        modelType: 'ship',
        modelName: 'Brasão de Castor',
      },
      {
        title: 'Régio',
        step: 'Passo 8',
        coords: [38.1105, 15.6476],
        img: 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 28:13',
        quote:
          'E daí, costeando, chegamos a Régio; e, soprando um vento sul, no dia seguinte chegamos a Pozzuoli.',
        bible:
          'Estação de trânsito costeiro na entrada do Estreito de Messina à espera de ventos favoráveis para seguir rumo ao norte.',
        geo: 'Cidade estratégica localizada no extremo sul da península italiana (Calábria), de frente para a Sicília.',
        arch: 'Assentamentos arqueológicos clássicos de muralhas gregas antigas e mosaicos termais.',
        modelType: 'ship',
        modelName: 'Estreito de Messina',
      },
      {
        title: 'Pozzuoli',
        step: 'Passo 9',
        coords: [40.8268, 14.1205],
        img: 'https://images.unsplash.com/photo-1499933374294-4584851497cc?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 28:13-14',
        quote:
          'E daí... chegamos a Pozzuoli, onde, achando alguns irmãos, fomos convidados a ficar com eles sete dias; e assim fomos para Roma.',
        bible:
          'O porto definitivo de desembarque na península italiana e a hospitalidade desfrutada com os cristãos locais.',
        geo: 'O maior porto comercial internacional de importação de grãos de Roma antiga, situado na baía de Nápoles.',
        arch: 'O colossal anfiteatro Flaviano de Pozzuoli e o templo mercado de Serápis semi-submerso.',
        modelType: 'ship',
        modelName: 'Porto de Puteoli',
      },
      {
        title: 'Roma',
        step: 'Passo 10',
        coords: [41.9028, 12.4964],
        img: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80',
        verse: 'Atos 28:16-30',
        quote:
          'E, chegando a Roma... permitiu-se a Paulo morar por sua conta... E Paulo ficou dois anos inteiros na sua própria habitação alugada...',
        bible:
          'O apogeu da viagem de Paulo e o encerramento do livro de Atos, pregando livremente o Reino de Deus na capital do Império.',
        geo: 'A capital e o coração do vasto Império Romano, conectada por todas as estradas consulares da bacia mediterrânea.',
        arch: 'A monumental Via Ápia antiga, o Fórum Romano, o Coliseu e as catacumbas paleocristãs.',
        modelType: 'scroll',
        modelName: 'Prisão de São Paulo',
      },
    ],
  },
  terra_prometida: {
    id: 'terra_prometida',
    title: 'Terra Prometida, 12 Tribos, Divisão dos Reinos',
    description:
      'A conquista e estabelecimento em Canaã sob Josué, a distribuição da herança tribal de Israel e a posterior divisão nos reinos do Norte (Israel) e do Sul (Judá).',
    waypoints: [
      {
        title: 'Jericó (Travessia do Jordão)',
        step: 'Passo 1',
        coords: [31.8625, 35.4608],
        img: 'https://images.unsplash.com/photo-1544085311-11a028465b03?auto=format&fit=crop&w=800&q=80',
        verse: 'Josué 6:20',
        quote:
          'Gritou, pois, o povo, soprando os sacerdotes as buzinas; e aconteceu que... o muro caiu abaixo, e o povo subiu à cidade... e tomaram a cidade.',
        bible:
          'A conquista miraculosa da primeira grande fortaleza em Canaã sob a liderança de Josué.',
        geo: 'Situada no Vale do Jordão, a 258 metros abaixo do nível do mar, sendo uma das cidades mais antigas habitadas continuamente no mundo.',
        arch: 'Escavações em Tell es-Sultan revelam fortificações massivas de tijolos de barro da Idade do Bronze.',
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
          'E toda a congregação dos filhos de Israel se reuniu em Siló, e ali armaram a tenda da congregação; e a terra estava sujeita diante deles.',
        bible:
          'O estabelecimento do Tabernáculo de reunião como centro espiritual da confederação tribal e a partilha do restante da Terra Prometida entre as tribos de Israel.',
        geo: 'Localizada na região montanhosa de Efraim, ao norte de Betel e ao sul de Lebona.',
        arch: 'Escavações arqueológicas em Khirbet Seilun revelaram evidências substanciais de culto e cerâmicas do Bronze Tardio e Idade do Ferro.',
        modelType: 'ark',
        modelName: 'O Tabernáculo de Siló',
      },
      {
        title: 'Siquém (Renovação da Aliança)',
        step: 'Passo 3',
        coords: [32.2134, 35.2789],
        img: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80',
        verse: 'Josué 24:25',
        quote:
          'Assim fez Josué aliança com o povo naquele dia, e lhes pôs por estatuto e juízo em Siquém.',
        bible:
          'O grande discurso de despedida de Josué convocando as doze tribos a escolherem a quem servir, e a ereção da grande pedra memorial sob o carvalho de Siquém.',
        geo: 'Uma localização geográfica estratégica crucial no vale profundo entre o Monte Gerizim e o Monte Ebal.',
        arch: 'A presença da famosa "grande pedra de Josué" (estela ereta) encontrada próxima ao templo da Idade do Bronze em Tell Balata.',
        modelType: 'pillar',
        modelName: 'Pedra do Testemunho',
      },
      {
        title: 'Jerusalém (Reino Unificado)',
        step: 'Passo 4',
        coords: [31.7683, 35.2137],
        img: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=800&q=80',
        verse: '2 Samuel 5:7',
        quote:
          'Todavia Davi tomou a fortaleza de Sião; esta é a cidade de Davi.',
        bible:
          'A unificação definitiva de todas as tribos de Israel sob o rei Davi, que capturou Jerusalém dos jebuseus e a estabeleceu como a capital política e espiritual.',
        geo: 'Situada nas montanhas da Judeia, entre o mar Mediterrâneo e o mar Morto, cercada por vales profundos (Cidrom e Hinom).',
        arch: 'A Cidade de Davi (sítio arqueológico) revela a Grande Estrutura de Pedra e o canal de água jebuseu.',
        modelType: 'altar',
        modelName: 'Fortaleza de Sião',
      },
      {
        title: 'Samaria (Reino do Norte)',
        step: 'Passo 5',
        coords: [32.277, 35.1897],
        img: 'https://images.unsplash.com/photo-1542224566-6e85f2e6772f?auto=format&fit=crop&w=800&q=80',
        verse: '1 Reis 12:25',
        quote:
          'E Jeroboão edificou a Siquém, no monte de Efraim, e habitou ali; e saiu dali, e edificou a Penuel.',
        bible:
          'A divisão dramática do reino de Salomão. Dez tribos revoltaram-se e formaram o Reino de Israel (do Norte) sob Jeroboão, estabelecendo posteriormente sua capital em Samaria.',
        geo: 'Uma colina proeminente com encostas íngremes na região montanhosa de Samaria, controlando passagens cruciais do comércio.',
        arch: 'A acrópole real de Samaria (Sebaste) exibe magníficas ruínas de alvenaria fina de pedra e os famosos marfins de Samaria do palácio de Acabe.',
        modelType: 'scroll',
        modelName: 'Palácio de Samaria',
      },
      {
        title: 'Hebrom (Reino do Sul - Judá)',
        step: 'Passo 6',
        coords: [31.5298, 35.0998],
        img: 'https://images.unsplash.com/photo-1544085311-11a028465b03?auto=format&fit=crop&w=800&q=80',
        verse: '2 Crônicas 11:5-10',
        quote:
          'E Roboão habitou em Jerusalém, e edificou cidades para fortalezas em Judá... E edificou a Hebrom...',
        bible:
          'O estabelecimento do Reino do Sul (Judá) governado pela dinastia davídica. Roboão fortaleceu Hebrom e outras cidades como defesas chave contra invasões externas.',
        geo: 'Situada em altitude elevada no sul da Judéia, Hebrom era o principal nó urbano da dinastia de Davi.',
        arch: 'Fortificações e silos da Idade do Ferro revelados em Tell Rumeida comprovam o forte controle militar administrativo judaico.',
        modelType: 'altar',
        modelName: 'Fortaleza de Hebrom',
      },
    ],
  },
  exilio_assirio: {
    id: 'exilio_assirio',
    title: 'Exílio Assírio e Dispersão',
    description:
      'O cativeiro e espalhamento das dez tribos de Israel (Reino do Norte) pelas forças imperiais da Assíria em 722 a.C.',
    waypoints: [
      {
        title: 'Samaria (Cerco Assírio)',
        step: 'Passo 1',
        coords: [32.277, 35.1897],
        img: 'https://images.unsplash.com/photo-1542224566-6e85f2e6772f?auto=format&fit=crop&w=800&q=80',
        verse: '2 Reis 17:5-6',
        quote:
          'Porque o rei da Assíria subiu por toda a terra, e veio até Samaria, e a cercou três anos. No ano nono de Oséias, o rei da Assíria tomou a Samaria...',
        bible:
          'O cerco implacável de três anos que culminou com a queda de Samaria e o fim do Reino do Norte como punição pela idolatria persistente.',
        geo: 'Localizada no topo de uma colina na região central da Palestina montanhosa, controlando passagens cruciais do comércio.',
        arch: 'As ruínas revelam muralhas espessas de cerco e vestígios de destruição maciça de cinzas do final da Idade do Ferro II.',
        modelType: 'altar',
        modelName: 'Muralhas de Samaria',
      },
      {
        title: 'Nínive (Império Assírio)',
        step: 'Passo 2',
        coords: [36.36, 43.15],
        img: 'https://images.unsplash.com/photo-1608958416629-106ab0e5c9b7?auto=format&fit=crop&w=800&q=80',
        verse: 'Jonas 3:3',
        quote:
          'E levantou-se Jonas, e foi a Nínive, segundo a palavra do Senhor. Ora, Nínive era uma cidade mui grande, de três dias de caminho.',
        bible:
          'A capital do temível Império Assírio, símbolo da opressão militar e o local da relutante missão profética de Jonas.',
        geo: 'Situada na margem oriental do rio Tigre, no norte da Mesopotâmia (próxima à moderna Mossul, Iraque).',
        arch: 'O espetacular palácio de Senaqueribe com relevos monumentais retratando campanhas e cerco a cidades judias como Laquis.',
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
          '...e transportou a Israel para a Assíria, e os fez habitar em Hala e em Habor, junto ao rio de Gozã, e nas cidades dos medos.',
        bible:
          'O local geográfico definitivo na Mesopotâmia superior onde as dez tribos do norte foram forçosamente reinstaladas e assimiladas pelos assírios.',
        geo: 'O rio Habor (moderno Khabur) é o maior afluente perene do rio Eufrates na Síria oriental.',
        arch: 'Escavações arqueológicas em Tell Halaf (Gozã antiga) revelam uma rica colônia administrativa da Idade do Ferro sob domínio assírio.',
        modelType: 'pillar',
        modelName: 'Coluna de Dispersão',
      },
    ],
  },
  exilio_babilonico: {
    id: 'exilio_babilonico',
    title: 'Exílio Babilônico e Nova Aliança',
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
          'E queimou a casa do Senhor e a casa do rei, como também todas as casas de Jerusalém; e todas as casas dos grandes queimou a fogo.',
        bible:
          'A queda trágica e destruição completa de Jerusalém e do Templo de Salomão em 586 a.C. devido ao abandono da Aliança.',
        geo: 'Região montanhosa da Judeia, cercada pelos vales de Cidrom e Hinom.',
        arch: 'A espessa camada de cinzas e carvão contendo pontas de flechas babilônicas escavadas na Cidade de Davi atesta o incêndio da cidade.',
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
          'O quartel-general de Nabucodonosor na Síria, onde o rei Zedequias de Judá foi forçado a ver o massacre de seus filhos antes de ser cegado.',
        geo: 'Localizada no vale do rio Oronte, uma planície estratégica de passagem de exércitos entre o Egito e a Mesopotâmia.',
        arch: 'Ruínas de fortificações militares antigas da Idade do Ferro II e posições estratégicas de comando em Tell Rifeh.',
        modelType: 'scroll',
        modelName: 'Cadeias de Cativeiro',
      },
      {
        title: 'Rio Quebar (Visões de Ezequiel)',
        step: 'Passo 3',
        coords: [32.4833, 44.4333],
        img: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80',
        verse: 'Ezequiel 1:1',
        quote:
          'Aconteceu no trigésimo ano... estando eu no meio dos cativos, junto ao rio Quebar, que se abriram os céus, e eu vi visões de Deus.',
        bible:
          'O local do cativeiro judaico próximo a Nipur, onde o profeta Ezequiel contemplou a glória divina e profetizou a ressurreição nacional e o novo templo.',
        geo: 'O canal de irrigação real de Shatt en-Nil, derivado do rio Eufrates próximo à antiga cidade mesopotâmica de Nipur.',
        arch: 'Tabletes cuneiformes conhecidos como Arquivos Murashu provam a presença de nomes e assentamentos judaicos no canal Quebar.',
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
          'Então o rei engrandeceu a Daniel, e lhe deu muitos e grandes dons, e o pôs por governador de toda a província de Babilônia...',
        bible:
          'A magnífica capital do Império Neobabilônico, onde o profeta Daniel serviu na corte real e interpretou as visões da soberania de Deus.',
        geo: 'Situada às margens do rio Eufrates, na Baixa Mesopotâmia (atual Iraque central).',
        arch: 'A espetacular Porta de Ishtar revestida de azulejos azuis vitrificados e a fundação do zigurate Etemenanki (Torre de Babel).',
        modelType: 'scroll',
        modelName: 'Porta de Ishtar',
      },
      {
        title: 'Susa (Império Persa)',
        step: 'Passo 5',
        coords: [32.1894, 48.2433],
        img: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80',
        verse: 'Neemias 1:1',
        quote:
          'Aconteceu no mês de Quisleu... estando eu na cidadela de Susa, que veio Hanani... e me contaram dos judeus...',
        bible:
          'A cidadela de inverno persa de onde Neemias serviu como copeiro e partiu com permissão real para reconstruir Jerusalém.',
        geo: 'Localizada no sudoeste do Irã, nas planícies abaixo das montanhas de Zagros, próxima ao rio Choaspes.',
        arch: 'O grandioso palácio de Dario I e o palácio onde ocorreram os eventos narrados no livro de Ester.',
        modelType: 'scroll',
        modelName: 'Decreto de Artaxerxes',
      },
    ],
  },
};
