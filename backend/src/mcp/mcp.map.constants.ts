export interface CanonicalBiblicalLocation {
  coords: [number, number];
  desc: string;
  verse: string;
}

export const CANONICAL_BIBLICAL_LOCATIONS: Record<
  string,
  CanonicalBiblicalLocation
> = {
  jerusalém: {
    coords: [31.7767, 35.2345],
    desc: 'Cidade Santa, Monte Sião, Monte do Templo, capital do Reino de Davi.',
    verse: 'Salmos 122:6',
  },
  jerusalem: {
    coords: [31.7767, 35.2345],
    desc: 'Cidade Santa, Monte Sião, Monte do Templo, capital do Reino de Davi.',
    verse: 'Salmos 122:6',
  },
  belém: {
    coords: [31.7054, 35.2024],
    desc: 'Belém de Judá (Efrata), cidade natal do Rei Davi e local do nascimento de Jesus.',
    verse: 'Miqueias 5:2',
  },
  belem: {
    coords: [31.7054, 35.2024],
    desc: 'Belém de Judá (Efrata), cidade natal do Rei Davi e local do nascimento de Jesus.',
    verse: 'Miqueias 5:2',
  },
  nazaré: {
    coords: [32.7019, 35.2979],
    desc: 'Nazaré da Galileia, cidade onde Jesus passou sua infância e juventude.',
    verse: 'Lucas 4:16',
  },
  nazare: {
    coords: [32.7019, 35.2979],
    desc: 'Nazaré da Galileia, cidade onde Jesus passou sua infância e juventude.',
    verse: 'Lucas 4:16',
  },
  cafarnaum: {
    coords: [32.8804, 35.5746],
    desc: 'Centro principal do ministério público de Jesus às margens do Mar da Galileia.',
    verse: 'Mateus 4:13',
  },
  jericó: {
    coords: [31.856, 35.463],
    desc: 'Cidade antiga dos oásis no vale do Jordão, primeira conquista de Josué em Canaã.',
    verse: 'Josué 6:20',
  },
  jerico: {
    coords: [31.856, 35.463],
    desc: 'Cidade antiga dos oásis no vale do Jordão, primeira conquista de Josué em Canaã.',
    verse: 'Josué 6:20',
  },
  hebrom: {
    coords: [31.5298, 35.0938],
    desc: 'Cidade dos patriarcas, sepultura de Abraão e Sara na cova de Macpela.',
    verse: 'Gênesis 23:19',
  },
  samaria: {
    coords: [32.277, 35.191],
    desc: 'Capital histórica do Reino do Norte (Israel), construída pelo rei Onri.',
    verse: '1 Reis 16:24',
  },
  'mar da galileia': {
    coords: [32.82, 35.58],
    desc: 'Lago de Genesaré / Mar de Tiberíades, cenário de milagres e ensinamentos de Jesus.',
    verse: 'Marcos 4:39',
  },
  'mar morto': {
    coords: [31.5, 35.5],
    desc: 'Mar Salgado na depressão do Jordão, próximo às antigas cidades de Sodoma e Gomorra.',
    verse: 'Gênesis 14:3',
  },
  'monte sinai': {
    coords: [28.539, 33.975],
    desc: 'Monte Horebe, local da entrega dos Dez Mandamentos e da Aliança da Lei.',
    verse: 'Êxodo 19:20',
  },
  'monte das oliveiras': {
    coords: [31.7786, 35.2447],
    desc: 'Monte das Oliveiras em Jerusalém, local da oração no Getsêmani e da Ascensão.',
    verse: 'Atos 1:12',
  },
  antioquia: {
    coords: [36.2021, 36.1606],
    desc: 'Antioquia da Síria, berço das missões gentílicas e onde os discípulos foram chamados cristãos.',
    verse: 'Atos 11:26',
  },
  roma: {
    coords: [41.9028, 12.4964],
    desc: 'Capital do Império Romano, destino do ministério final e martírio de Paulo e Pedro.',
    verse: 'Atos 28:16',
  },
  éfeso: {
    coords: [37.94, 27.34],
    desc: 'Metrópole da Ásia Menor, centro do ministério prolongado do apóstolo Paulo.',
    verse: 'Atos 19:1',
  },
  efeso: {
    coords: [37.94, 27.34],
    desc: 'Metrópole da Ásia Menor, centro do ministério prolongado do apóstolo Paulo.',
    verse: 'Atos 19:1',
  },
  corinto: {
    coords: [37.906, 22.88],
    desc: 'Importante centro comercial da Acaia, onde Paulo fundou a igreja de Corinto.',
    verse: 'Atos 18:1',
  },
  atenas: {
    coords: [37.9838, 23.7275],
    desc: 'Centro intelectual e filosófico da Grécia, discurso de Paulo no Areópago.',
    verse: 'Atos 17:22',
  },
  babilônia: {
    coords: [32.536, 44.42],
    desc: 'Capital do Império Neobabilônico, local do cativeiro do povo de Judá.',
    verse: 'Daniel 1:1',
  },
  babilonia: {
    coords: [32.536, 44.42],
    desc: 'Capital do Império Neobabilônico, local do cativeiro do povo de Judá.',
    verse: 'Daniel 1:1',
  },
  nínive: {
    coords: [36.36, 43.15],
    desc: 'Grande capital do Império Assírio, destino da missão profética de Jonas.',
    verse: 'Jonas 3:3',
  },
  ninive: {
    coords: [36.36, 43.15],
    desc: 'Grande capital do Império Assírio, destino da missão profética de Jonas.',
    verse: 'Jonas 3:3',
  },
  ur: {
    coords: [30.962, 46.1031],
    desc: 'Ur dos Caldeus, ponto de partida da peregrinação de Abraão na Mesopotâmia.',
    verse: 'Gênesis 11:31',
  },
};
