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
  exodo: {
    id: 'exodo',
    title: 'Rota do Êxodo',
    description: 'A jornada de libertação do Egito até a Terra Prometida.',
    waypoints: [
      {
        title: 'Ramessés (Egito)',
        step: 'Passo 1',
        coords: [30.7963, 31.8347],
        img: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
        verse: 'Êxodo 12:37',
        quote: 'Assim partiram os filhos de Israel de Ramessés para Sucote...',
        bible: 'O ponto de partida do êxodo marca o fim de 430 anos de permanência no Egito.',
        geo: 'Localizada no fértil Delta do Nilo (a terra de Gósen).',
        arch: 'Identificada historicamente com a cidade de Pi-Ramessés.',
        modelType: 'altar',
        modelName: 'Altar de Tijolos (Egito)'
      },
      {
        title: 'Travessia do Mar Vermelho',
        step: 'Passo 2',
        coords: [28.8500, 32.8500],
        img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
        verse: 'Êxodo 14:21-22',
        quote: 'Moisés estendeu a mão sobre o mar... e as águas se dividiram.',
        bible: 'O momento central de livramento do Antigo Testamento.',
        geo: 'Provavelmente no Golfo de Suez ou no Golfo de Aqaba.',
        arch: 'Debates intensos sobre a tradução Yam Suph (Mar de Juncos).',
        modelType: 'pillar',
        modelName: 'Coluna de Fogo / Nuvem'
      },
      {
        title: 'Monte Sinai (Horebe)',
        step: 'Passo 3',
        coords: [28.5385, 33.9753],
        img: 'https://images.unsplash.com/photo-1682687220063-4742bd7fd538?auto=format&fit=crop&w=800&q=80',
        verse: 'Êxodo 19:20',
        quote: 'O Senhor desceu ao topo do monte Sinai e chamou Moisés...',
        bible: 'O nascimento de Israel como nação sob a Aliança.',
        geo: 'Tradicionalmente associado a Jebel Musa no sul do Sinai.',
        arch: 'No sopé deste monte fica o Mosteiro de Santa Catarina.',
        modelType: 'ark',
        modelName: 'A Arca da Aliança'
      }
    ]
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
        modelName: 'Pergaminhos das Epístolas'
      }
    ]
  }
};
