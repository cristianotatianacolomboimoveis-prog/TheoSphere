"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";

// ─── Eventos Históricos e Bíblicos (Timeline Completa) ─────────────────────
export interface TimelineEvent {
  year: number;
  label: string;
  category: "criacao" | "patriarcas" | "exodo" | "monarquia" | "profetas" | "exilio" | "intertestamento" | "jesus" | "igreja" | "historia" | "moderno";
  icon?: string;
  description?: string;
  location?: [number, number]; // [longitude, latitude]
  locationName?: string;
  imageUrl?: string;
  summary?: string;
}

export const TIMELINE_EVENTS: TimelineEvent[] = [
  // ── História Primordial (Gênesis 1-11) ──
  { year: -4000, label: "A Criação", category: "criacao", icon: "🌌", description: "Criação do Cosmos e Humanidade", summary: "O relato de Gênesis 1-2 descreve a criação do universo e da humanidade (Adão e Eva). Diferente dos mitos mesopotâmicos (como o Enuma Elish), Gênesis apresenta um Deus único criando tudo pela palavra, dando propósito e dignidade ao ser humano como 'imagem de Deus'.", location: [43.0, 31.0], locationName: "Éden (Tradicional: Mesopotâmia)", imageUrl: "/assets/atlas/eden.png" },
  { year: -3900, label: "A Queda", category: "criacao", icon: "🍎", description: "O Pecado Original (Gn 3)", summary: "A rebelião de Adão e Eva quebrou a harmonia perfeita com Deus, com a natureza e entre si. Ocorreu a expulsão do Éden, mas o texto já traz o 'Protoevangelho' (Gênesis 3:15) — a primeira promessa de que um descendente da mulher esmagaria a serpente, apontando para a futura redenção.", location: [43.5, 31.5], locationName: "A Leste do Éden", imageUrl: "/assets/atlas/galilee.png" },
  { year: -3200, label: "A Era Antediluviana", category: "criacao", icon: "⚒️", description: "Civilização e Corrupção (Gn 4-6)", summary: "O período entre a Criação e o Dilúvio viu o surgimento da primeira civilização: Caim fundou cidades, enquanto Lameque, Jabal e Tubalcaim desenvolveram a agricultura, a música e a metalurgia do bronze e ferro (Gênesis 4). Ao mesmo tempo, a linhagem de Sete manteve o temor a Deus (Enoque). Porém, a violência e a corrupção humana atingiram níveis irreversíveis (Gênesis 6), levando ao julgamento divino.", location: [45.0, 32.0], locationName: "Planícies da Mesopotâmia", imageUrl: "/assets/atlas/babylon.png" },
  { year: -2500, label: "O Dilúvio", category: "criacao", icon: "🌊", description: "O Julgamento e a Arca de Noé", summary: "A narrativa do Dilúvio Universal (Gênesis 6-9) tem paralelos literários no Épico de Gilgamesh e Atrahasis, mas traz uma teologia moral distinta: o dilúvio bíblico é um julgamento contra a violência humana, seguido pela Aliança de Deus com toda a criação.", location: [44.29, 39.70], locationName: "Monte Ararat, Turquia Oriental", imageUrl: "/assets/atlas/flood.png" },
  { year: -2200, label: "Torre de Babel", category: "criacao", icon: "🗼", description: "A Dispersão das Nações (Gn 11)", summary: "A construção da Torre de Babel (Gênesis 11) reflete a edificação de zigurates na antiga Mesopotâmia (provavelmente Eridu ou Babilônia). O evento explica teologicamente a origem e dispersão dos idiomas, marcando o fim da História Primordial e preparando o palco para o chamado de Abraão.", location: [44.42, 32.53], locationName: "Sinar (Babilônia), Iraque", imageUrl: "/assets/atlas/babel.png" },

  // ── Era do Bronze (Contexto dos Patriarcas) ──
  { year: -2000, label: "Era dos Patriarcas", category: "patriarcas", icon: "⭐", description: "Contexto do Bronze Médio em Canaã", summary: "Abraão, Isaque e Jacó viveram no período do Bronze Médio (2000–1550 a.C.). Evidências arqueológicas em Siquém e Hebrém confirmam a presença de povos semitas nômades migrando pela região de Canaã. As narrativas dos patriarcas refletem costumes documentados em textos de Nuzi e Mari.", location: [35.28, 32.21], locationName: "Siquém, Samaria, Israel", imageUrl: "/assets/atlas/galilee.png" },
  { year: -1876, label: "Descida ao Egito", category: "patriarcas", icon: "🌾", description: "Israelitas se estabelecem em Gósen", summary: "A descida de Jacó e seus 70 descendentes ao Egito ocorreu durante o período Hicso (1650–1550 a.C.), quando governantes semitas controlavam o Delta do Nilo. A região de Gósen (Wadi Tumilat) foi identificada por arqueólogos como área de pastoreio semita, coerente com o texto bíblico (Gn 47:6).", location: [31.86, 30.73], locationName: "Gósen, Delta do Nilo, Egito", imageUrl: "/assets/atlas/egypt.png" },

  // ── O Êxodo e Emergência de Israel (c. 1250 a.C.) ──
  { year: -1250, label: "O Êxodo (Era de Ramsés)", category: "exodo", icon: "🔥", description: "Datação arqueológica (Cidades de Ramessés)", summary: "A datação majoritária entre arqueólogos situa o Êxodo no reinado de Ramsés II (1279–1213 a.C.). As escavações em Tell el-Dab'a revelaram a cidade de Ramessés (Êx 1:11) e evidências de uma grande população semita na região. A destruição de Hazor (Js 11) e os assentamentos no planalto de Canaã corroboram este período.", location: [32.55, 29.98], locationName: "Mar Vermelho, Sinai, Egito", imageUrl: "/assets/atlas/egypt.png" },
  { year: -1208, label: "Estela de Merneptah", category: "exodo", icon: "📜", description: "1ª menção histórica de 'Israel' fora da Bíblia", summary: "A Estela de Merneptah (1208 a.C.), descoberta em 1896 por Flinders Petrie, contém a frase 'Israel está arrasado, sua semente não mais existe.' É a mais antiga referência extrabiblica ao nome Israel, provando que o povo já existia como grupo étnico distinto em Canaã antes de 1208 a.C.", location: [31.23, 30.04], locationName: "Tebas, Luxor, Egito", imageUrl: "/assets/atlas/egypt.png" },
  { year: -1200, label: "Assentamentos em Canaã", category: "exodo", icon: "⚔️", description: "Surgimento de vilas israelitas nas montanhas", summary: "Arqueólogos como Israel Finkelstein documentaram o surgimento de centenas de pequenas aldeias no planalto central de Canaã por volta de 1200 a.C. As habitações de quatro cômodos (four-room house) e a ausência de ossos de porco são marcadores arqueológicos que distinguem estes sítios como israelitas.", location: [35.20, 31.85], locationName: "Samaria, Israel", imageUrl: "/assets/atlas/galilee.png" },

  // ── Monarquia e Arqueologia (c. 1010 - 931 a.C.) ──
  { year: -1010, label: "Reinado de Davi", category: "monarquia", icon: "🎵", description: "Confirmado pela Estela de Tel Dan", summary: "A Estela de Tel Dan (século IX a.C.), descoberta em 1993, menciona 'a Casa de Davi' (beit David), confirmando que Davi foi um rei histórico. Davi unificou as tribos de Israel e Judá, estabelecendo sua capital em Hebrom e depois em Jerusalém. A Bíblia e a arqueologia convergem neste ponto central.", location: [35.10, 31.53], locationName: "Hebrom, Judéia, Israel", imageUrl: "/assets/atlas/jerusalem.png" },
  { year: -1000, label: "Jerusalém de Davi", category: "monarquia", icon: "🏙️", description: "Centro administrativo (Khirbet Qeiyafa)", summary: "As escavações na Cidade de Davi, conduzidas por Eilat Mazar, revelaram estruturas monumentais do século X a.C., incluindo o possível Palácio de Davi. Khirbet Qeiyafa, uma fortaleza judaíta com dois portões, data de 1020–980 a.C. e apoia a existência de um estado organizado no período davidico.", location: [35.23, 31.77], locationName: "Cidade de Davi, Jerusalém, Israel", imageUrl: "/assets/atlas/jerusalem.png" },
  { year: -960, label: "Templo de Salomão", category: "monarquia", icon: "🕍", description: "Primeiro Templo (1Rs 6)", summary: "O Templo de Salomão foi construído no Monte Moriá por volta de 960 a.C. (1Rs 6:1). Seu design — com ulam, hekal e debir — é idêntico a templos siríacos do Bronze Final descobertos em Ain Dara e Ebla. Os capitéis de lírio (yotvat) descritos em 1Rs 7 foram encontrados em sítios israelitas da época.", location: [35.23, 31.77], locationName: "Monte Moriá, Jerusalém, Israel", imageUrl: "/assets/atlas/jerusalem.png" },
  { year: -931, label: "Divisão do Reino", category: "monarquia", icon: "💔", description: "Sincronismo com a campanha de Sisaque", summary: "Após a morte de Salomão, o reino se dividiu em Israel (Norte) e Judá (Sul). A campanha do faraó Sisaque (Sheshonq I) por volta de 926 a.C., registrada em Karnak e na Bíblia (1Rs 14:25), marca o início desta era. A lista de Sisaque inclui dezenas de cidades conquistadas, confirmando o colapso político do período.", location: [35.28, 32.21], locationName: "Siquém, Samaria, Israel", imageUrl: "/assets/atlas/galilee.png" },

  // ── Registros Assírios e Babilônicos (Sincronismo Total) ──
  { year: -841, label: "Jeú paga Tributo", category: "profetas", icon: "📜", description: "Obelisco Negro de Salmanaser III", summary: "O Obelisco Negro de Salmanaser III (descoberto em 1846) mostra o rei israelita Jeú ajoelhado diante do soberano assírio em 841 a.C. É a única representação pictórica conhecida de um rei bíblico. A inscrição confirma o nome 'Jeú, filho de Onri', sincronizando perfeitamente com 2Rs 9-10.", location: [43.16, 36.10], locationName: "Nínive, Mossul, Iraque", imageUrl: "/assets/atlas/babylon.png" },
  { year: -722, label: "Queda de Samaria", category: "profetas", icon: "⚡", description: "Destruída por Sargão II da Assíria", summary: "Os Anais de Sargão II registram a conquista de Samaria em 722 a.C. e a deportação de 27.290 israelitas para a Assíria. As escavações em Samaria confirmam uma camada de destruição datada do final do século VIII. Este evento marcou o fim do Reino do Norte e o começo das Dez Tribos Perdidas.", location: [35.19, 32.27], locationName: "Samaria, Reino de Israel, Israel", imageUrl: "/assets/atlas/galilee.png" },
  { year: -701, label: "Cerco de Ezequias", category: "profetas", icon: "🛡️", description: "Invasão de Senaqueribe (Prisma de Taylor)", summary: "O Prisma de Taylor (Museu Britânico) narra como Senaqueribe 'encerrou Ezequias em Jerusalém como um pássaro em gaiola'. As escavações em Laquis revelaram a destruição total da cidade assíria. A Bíblia (2Rs 19) e o Prisma concordam: Senaqueribe não conquistou Jerusalém, confirmando o milagre relatado.", location: [35.23, 31.77], locationName: "Jerusalém, Judá, Israel", imageUrl: "/assets/atlas/jerusalem.png" },
  { year: -586, label: "Queda de Jerusalém", category: "exilio", icon: "💥", description: "Destruição por Nabucodonosor II", summary: "As Crônicas Babilônicas (Museu Britânico) datam a queda de Jerusalém em agosto de 586 a.C. As escavações na Cidade de Davi revelaram uma camada de cinzas e pontas de flecha com inscrições hebraicas. As Cartas de Laquis, escritas momentos antes da queda, descrevem o pânico final dos soldados judaítas.", location: [35.23, 31.77], locationName: "Jerusalém, Judá, Israel", imageUrl: "/assets/atlas/babylon.png" },
  { year: -538, label: "Cilindro de Ciro", category: "exilio", icon: "📃", description: "Decreto de liberdade para os exilados", summary: "O Cilindro de Ciro (559–530 a.C.), descoberto em 1879 em Babilônia, registra o decreto do rei persa libertando povos deportados e permitindo o retorno a seus territórios. Este documento corrobora Esdras 1:1-4, onde Ciro autoriza os judeus a retornarem a Jerusalém e reconstruírem o Templo.", location: [44.42, 32.53], locationName: "Babilônia, Hila, Iraque", imageUrl: "/assets/atlas/babylon.png" },
  { year: -516, label: "Dedicação do 2º Templo", category: "exilio", icon: "🕍", description: "Restauração do culto em Jerusalém", summary: "O Segundo Templo foi dedicado em 516 a.C., exatamente 70 anos após a destruição do Primeiro (586 a.C.), cumprindo a profecia de Jeremias (Jr 25:11). Construído sob Zorobabel e o sumo sacerdote Josué, o templo restaurou o culto levítico em Jerusalém, marcando o fim do exílio babilônico.", location: [35.23, 31.77], locationName: "Jerusalém, Judá, Israel", imageUrl: "/assets/atlas/jerusalem.png" },

  // ── Período Greco-Romano ──
  { year: -332, label: "Alexandre o Grande", category: "intertestamento", icon: "🏛️", description: "Início do período helenístico", summary: "Alexandre Magno conquistou a Judeia sem resistência em 332 a.C. O historiador Josefo relata que Alexandre visitou Jerusalém e reverenciou o sumo sacerdote. A helenização que se seguiu — língua grega, cultura, arquitetura — moldou profundamente o contexto cultural do Novo Testamento e a tradução da Septuaginta.", location: [35.23, 31.77], locationName: "Celessíria, Israel", imageUrl: "/assets/atlas/jerusalem.png" },
  { year: -164, label: "Vitória Macabeia", category: "intertestamento", icon: "🕎", description: "Purificação do Templo (Hanukkah)", summary: "Judas Macabeu liderou a revolta contra o rei selêucida Antíoco IV Epifânio, que havia profanado o Templo com um altar a Zeus (167 a.C.). A vitória em 164 a.C. e a purificação do Templo são comemoradas até hoje no Hanukkah. Os livros de 1 e 2 Macabeus e Josefo documentam detalhadamente estes eventos.", location: [35.23, 31.77], locationName: "Jerusalém, Israel", imageUrl: "/assets/atlas/jerusalem.png" },
  { year: -63, label: "Pompeu conquista Judeia", category: "intertestamento", icon: "🦅", description: "Início da ocupação romana", summary: "O general romano Pompeu sitiou Jerusalém por três meses e entrou no Santo dos Santos em 63 a.C. — mas não roubou o tesouro. A Judeia tornou-se um estado cliente de Roma. Este evento prepara o cenário para o nascimento de Jesus sob César Augusto e a administração de governadores romanos como Pôncio Pilatos.", location: [35.23, 31.77], locationName: "Judéia, Palestina, Israel", imageUrl: "/assets/atlas/jerusalem.png" },

  // ── Era Cristã (História Documentada) ──
  { year: -4, label: "Nascimento de Jesus", category: "jesus", icon: "⭐", description: "Morte de Herodes o Grande", summary: "Jesus nasceu durante o reinado de Herodes o Grande, que morreu em 4 a.C. (Josefo, Antiguidades XVII). Belém foi identificada como o local do nascimento por Justino Mártir (150 d.C.) e Orígenes. O Censo de Quirino (Lc 2:2) refere-se provavelmente ao censo provincial anterior ao de 6 d.C., corroborado por fontes romanas.", location: [35.20, 31.70], locationName: "Belém, Judéia, Israel", imageUrl: "/assets/atlas/galilee.png" },
  { year: 27, label: "Ministério Público", category: "jesus", icon: "🕊️", description: "Batismo no Jordão", summary: "O ministério de Jesus iniciou com seu batismo por João Batista no Rio Jordão (Lc 3:1-3), datado de ~27 d.C. pelo 15º ano de Tibério César. O historiador Flávio Josefo menciona João Batista (Ant. XVIII.5.2) como pregador que 'atraía multidões'. A duração do ministério de Jesus (~3 anos) é apoiada pelas três Páscoas mencionadas em João.", location: [35.54, 31.83], locationName: "Betânia, Rio Jordão, Israel", imageUrl: "/assets/atlas/galilee.png" },
  { year: 30, label: "Crucificação de Jesus", category: "jesus", icon: "✝️", description: "Sob Pôncio Pilatos (Tácito/Josefo)", summary: "A crucificação de Jesus foi registrada pelo historiador romano Tácito (Anais XV.44): 'Cristo sofreu a pena capital durante o reinado de Tibério, sob Pôncio Pilatos.' Uma inscrição com o nome de Pilatos foi descoberta em Cesareia em 1961. O Ossário de Caifás (1990) confirma o sumo sacerdote que ordenou o julgamento (Mt 26:57).", location: [35.23, 31.77], locationName: "Gólgota, Jerusalém, Israel", imageUrl: "/assets/atlas/jerusalem.png" },
  { year: 70, label: "Destruição do Templo", category: "igreja", icon: "💥", description: "Fim do Judaísmo Bíblico (Cerco de Tito)", summary: "O Arco de Tito em Roma (82 d.C.) representa os soldados carregando o menorá. Josefo (Guerra Judaica VI) descreve o cerco sob o general Tito. Este evento separou definitivamente o Cristianismo do Judaísmo, forçando a Igreja a se expandir pelo mundo greco-romano (Diáspora).", location: [35.23, 31.77], locationName: "Jerusalém, Província de Judéia", imageUrl: "/assets/atlas/jerusalem.png" },
  
  // ── História da Igreja, Heresias e Pensamento Cristão (Ref: Tillich / Cairns) ──
  { year: 150, label: "Os Apologistas e Irineu", category: "igreja", icon: "🛡️", description: "Combate ao Gnosticismo", summary: "No século II, Pais Apologistas (Justino Mártir, Tertuliano) usaram a doutrina do Logos grego para explicar Cristo. Irineu de Lyon escreveu 'Contra as Heresias', refutando o Gnosticismo dualista. A teologia consolidou a bondade da Criação, a Encarnação e a 'Regra de Fé' apostólica.", location: [4.83, 45.76], locationName: "Lyon, Gália (atual França)", imageUrl: "/assets/atlas/rome.png" },
  { year: 250, label: "A Escola de Alexandria", category: "igreja", icon: "📜", description: "Orígenes e o Método Alegórico", summary: "Orígenes e Clemente fundaram o pensamento intelectual cristão unindo o neoplatonismo à fé. Orígenes desenvolveu a interpretação alegórica das Escrituras e a ideia da 'geração eterna do Filho'. Segundo Tillich, Orígenes foi o primeiro grande teólogo sistemático do Cristianismo.", location: [29.91, 31.20], locationName: "Alexandria, Egito", imageUrl: "/assets/atlas/egypt.png" },
  { year: 313, label: "Edito de Constantino", category: "historia", icon: "🏛️", description: "Fim das Perseguições (Edito de Milão)", summary: "O Edito de Milão proclamou tolerância religiosa no Império Romano. A Igreja deixou as catacumbas e se tornou uma instituição imperial. Paul Tillich aponta este como o momento crítico onde a Igreja precisou unificar dogmas para manter a coesão do Império.", location: [9.19, 45.46], locationName: "Milão, Itália", imageUrl: "/assets/atlas/rome.png" },
  { year: 325, label: "Concílio de Niceia", category: "historia", icon: "⚖️", description: "Atanásio contra o Arianismo", summary: "O concílio definiu o dogma central da fé: Cristo é 'consubstancial' (homoousios) ao Pai, refutando o Arianismo (que reduzia Jesus a uma criatura subordinada). Para Tillich, Niceia salvou o conceito cristão de salvação: apenas o próprio Deus poderia reconciliar a humanidade consigo mesmo.", location: [29.71, 40.42], locationName: "Niceia (Iznik), Turquia", imageUrl: "/assets/atlas/rome.png" },
  { year: 381, label: "Os Padres Capadócios", category: "historia", icon: "🕊️", description: "A Estrutura da Trindade", summary: "Basílio o Grande, Gregório de Nissa e Gregório de Nazianzo refinaram o vocabulário trinitário: Deus é uma essência (ousia) em três pessoas (hypostasis). Eles consolidaram a divindade do Espírito Santo no Concílio de Constantinopla, completando a base do pensamento cristão clássico.", location: [34.71, 38.63], locationName: "Capadócia, Turquia", imageUrl: "/assets/atlas/babel.png" },
  { year: 430, label: "Agostinho de Hipona", category: "historia", icon: "📖", description: "Graça, Predestinação e a Queda", summary: "O ápice teológico do Ocidente. Agostinho combateu o Pelagianismo (que afirmava a salvação pelo livre-arbítrio), defendendo a soberania absoluta da Graça e o Pecado Original. Em 'A Cidade de Deus', ele forneceu a primeira teologia da história, separando a Igreja atemporal do império em colapso.", location: [7.76, 36.90], locationName: "Hipona, Norte da África (Argélia)", imageUrl: "/assets/atlas/egypt.png" },
  { year: 451, label: "Concílio de Calcedônia", category: "historia", icon: "🔗", description: "A União Hipostática", summary: "O coroamento da Cristologia. Calcedônia definiu que Cristo possui duas naturezas (divina e humana) em uma única pessoa, 'sem confusão, sem mudança, sem divisão, sem separação'. Este evento encerrou os embates das escolas de Antioquia e Alexandria.", location: [29.02, 40.98], locationName: "Calcedônia (Istambul), Turquia", imageUrl: "/assets/atlas/rome.png" },
  { year: 1054, label: "O Grande Cisma", category: "historia", icon: "💔", description: "Divisão: Oriente vs Ocidente", summary: "O rompimento entre a Igreja Católica e a Igreja Ortodoxa, motivado por política, idioma e a teologia da Cláusula 'Filioque' (procedência do Espírito). O Oriente manteve uma teologia mística e litúrgica (Palamismo), enquanto o Ocidente rumou para o racionalismo jurídico da Escolástica.", location: [28.97, 41.00], locationName: "Constantinopla (Istambul), Turquia", imageUrl: "/assets/atlas/babel.png" },
  { year: 1093, label: "Anselmo de Cantuária", category: "historia", icon: "🔑", description: "A Teoria da Satisfação e a Ontologia", summary: "Anselmo iniciou o método escolástico no Ocidente. Em 'Cur Deus Homo', formulou a teoria da satisfação penal (Cristo morreu para pagar a dívida infinita da honra divina ofendida). Também criou o famoso 'Argumento Ontológico' para a existência de Deus: 'Aquilo do qual nada maior pode ser pensado'.", location: [1.08, 51.28], locationName: "Cantuária (Canterbury), Inglaterra", imageUrl: "/assets/atlas/rome.png" },
  { year: 1273, label: "A Escolástica de Aquino", category: "historia", icon: "📚", description: "Suma Teológica e a Síntese Aristotélica", summary: "Tomás de Aquino sintetizou Aristóteles com a doutrina cristã cristã, provando que 'a Graça não destrói a Natureza, mas a aperfeiçoa'. Sua teologia estruturou argumentos empírico-racionais para Deus (As Cinco Vias). Tillich considerava Aquino o mestre absoluto do método teológico integrativo medieval.", location: [14.26, 40.85], locationName: "Nápoles, Itália", imageUrl: "/assets/atlas/rome.png" },
  { year: 1350, label: "O Nominalismo de Ockham", category: "historia", icon: "✂️", description: "A Navalha de Ockham e o Fim da Idade Média", summary: "Guilherme de Ockham separou radicalmente a razão da fé. Ensinava que os 'universais' são apenas nomes (nominalismo), destruindo a síntese tomista. Ao afirmar que Deus só pode ser conhecido pela fé (e não pela razão), Ockham abriu caminho filosófico para a Reforma Protestante e para a Ciência Moderna.", location: [-1.25, 51.75], locationName: "Oxford, Inglaterra", imageUrl: "/assets/atlas/galilee.png" },
  { year: 1517, label: "Lutero e a Reforma", category: "historia", icon: "📌", description: "A Justificação pela Fé (Sola Fide)", summary: "Lutero quebrou a estrutura sacramental romana, afirmando que a salvação vem unicamente pela fé e Graça de Deus, sem mediação institucional. Para Tillich, o 'Princípio Protestante' de Lutero foi o maior protesto profético contra qualquer instituição que tentasse se colocar no lugar de Deus absoluto.", location: [12.64, 51.87], locationName: "Wittenberg, Alemanha", imageUrl: "/assets/atlas/galilee.png" },
  { year: 1536, label: "As Institutas de Calvino", category: "historia", icon: "🖋️", description: "A Majestade de Deus e a Soberania", summary: "João Calvino organizou o pensamento protestante de forma enciclopédica. Sua teologia centrava-se na glória e soberania de Deus, na Total Depravação humana e na obra interna do Espírito Santo. O Calvinismo forneceu a ética de trabalho e a estrutura política (presbiterianismo) que moldariam o mundo democrático moderno.", location: [6.14, 46.20], locationName: "Genebra, Suíça", imageUrl: "/assets/atlas/eden.png" },
  
  // ── Pensamento Moderno e Contemporâneo ──
  { year: 1799, label: "Schleiermacher", category: "moderno", icon: "🌿", description: "O Pai da Teologia Moderna", summary: "Em resposta ao Iluminismo e ao Racionalismo (Kant), Schleiermacher definiu a religião não como dogma ou moralidade, mas como um 'Sentimento de Dependência Absoluta'. Ele mudou o eixo da teologia objetiva para a experiência subjetiva, inaugurando a Teologia Liberal Protestante.", location: [13.40, 52.52], locationName: "Berlim, Alemanha", imageUrl: "/assets/atlas/galilee.png" },
  { year: 1843, label: "Kierkegaard", category: "moderno", icon: "⚡", description: "O Existencialismo e o Salto da Fé", summary: "Opondo-se à filosofia de Hegel e à frieza da Igreja estatal dinamarquesa, Søren Kierkegaard fundou o existencialismo cristão. Ele ensinava que a fé não é uma conclusão lógica, mas um 'salto no escuro' e uma relação apaixonada com a subjetividade e o sofrimento individual diante de Deus.", location: [12.56, 55.67], locationName: "Copenhague, Dinamarca", imageUrl: "/assets/atlas/rome.png" },
  { year: 1932, label: "Karl Barth e a Neo-Ortodoxia", category: "moderno", icon: "📖", description: "Deus como o 'Totalmente Outro'", summary: "Com a publicação de sua Dogmática da Igreja, Karl Barth demoliu a Teologia Liberal do séc XIX. Barth reinvindicou a transcendência de Deus (O Totalmente Outro) e a supremacia da Revelação de Cristo contra qualquer teologia natural, inspirando a oposição teológica a Hitler na Declaração de Barmen.", location: [7.58, 47.55], locationName: "Basileia, Suíça", imageUrl: "/assets/atlas/babel.png" },
  { year: 1944, label: "Dietrich Bonhoeffer", category: "moderno", icon: "⛓️", description: "A Graça Cara e a Resistência", summary: "Teólogo mártir executado pelo regime Nazista. Bonhoeffer escreveu 'O Custo do Discipulado', opondo-se à 'Graça Barata' (perdão sem arrependimento) que dominava as igrejas da Alemanha. Sua teologia focava em um Cristo encarnado que convoca o crente ao sofrimento no mundo real ('Cristianismo sem religião').", location: [12.00, 49.00], locationName: "Campo de Concentração de Flossenbürg", imageUrl: "/assets/atlas/galilee.png" },
  { year: 1948, label: "Independência de Israel", category: "moderno", icon: "🇮🇱", description: "Restabelecimento do Estado Geopolítico", summary: "O renascimento da nação judaica após o Holocausto. Para o pensamento teológico pós-guerra, este evento forçou a teologia ocidental a repensar a Teologia da Substituição (supersessionismo) e reconhecer a permanência da aliança divina e as complexidades proféticas/escandalosas da história de Israel.", location: [35.23, 31.77], locationName: "Tel Aviv, Estado de Israel", imageUrl: "/assets/atlas/jerusalem.png" },
  { year: 1951, label: "Paul Tillich", category: "moderno", icon: "🧠", description: "O Método da Correlação e o Ser", summary: "Em sua Teologia Sistemática, Paul Tillich uniu existencialismo, psicanálise e fé. O 'Método da Correlação' diz que a teologia deve responder às perguntas existenciais do ser humano (ansiedade, falta de sentido). Para ele, Deus é o 'Fundamento do Ser' (Ground of Being) e Cristo o 'Novo Ser' que restaura nossa essência alienada.", location: [-73.96, 40.81], locationName: "Nova York, EUA", imageUrl: "/assets/atlas/rome.png" },
  { year: 2026, label: "TheoSphere 4D", category: "moderno", icon: "📍", description: "O Presente: Geo-Teologia Digital", summary: "O TheoSphere representa a vanguarda tecnológica aplicada à teologia. É um Atlas hiper-histórico mapeando milênios de geografia bíblica e todo o fluxo intelectual descrito pelos grandes pensadores, do Éden ao Existencialismo de Tillich.", location: [35.23, 31.77], locationName: "TheoSphere Global", imageUrl: "/assets/atlas/jerusalem.png" },
];


// Cores por categoria
export const CATEGORY_COLORS: Record<TimelineEvent["category"], string> = {
  criacao: "#10b981",       // Emerald
  patriarcas: "#f59e0b",    // Amber
  exodo: "#ef4444",         // Red
  monarquia: "#8b5cf6",     // Violet
  profetas: "#3b82f6",      // Blue
  exilio: "#64748b",        // Slate
  intertestamento: "#6366f1", // Indigo
  jesus: "#fbbf24",         // Gold
  igreja: "#f97316",        // Orange
  historia: "#a855f7",      // Purple
  moderno: "#22d3ee",       // Cyan
};

// Duração e Informação dos Períodos
export const CATEGORY_INFO: Record<TimelineEvent["category"], { name: string; duration: string }> = {
  criacao: { name: "Origens", duration: "Período Primordial" },
  patriarcas: { name: "Era dos Patriarcas", duration: "Duração: ~400 anos" },
  exodo: { name: "Êxodo e Conquista", duration: "Duração: ~200 anos" },
  monarquia: { name: "Monarquia (Unida/Dividida)", duration: "Duração: ~424 anos" },
  profetas: { name: "Era dos Profetas", duration: "Duração: ~450 anos" },
  exilio: { name: "Exílio Babilônico", duration: "Duração: 70 anos" },
  intertestamento: { name: "Período Intertestamental", duration: "Duração: ~400 anos" },
  jesus: { name: "Vida de Cristo", duration: "Duração: 33 anos" },
  igreja: { name: "Igreja Primitiva", duration: "Duração: ~70 anos" },
  historia: { name: "História Cristã", duration: "Duração: ~1900 anos" },
  moderno: { name: "Estado Moderno", duration: "Desde 1948" },
};

interface TimeControllerProps {
  currentTime: number;
  onTimeChange: (year: number, location?: [number, number]) => void;
}

export const TimeController: React.FC<TimeControllerProps> = ({ currentTime, onTimeChange }) => {
  const yearLabel = currentTime < 0 ? `${Math.abs(currentTime)} a.C.` : `${currentTime} d.C.`;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredEvent, setHoveredEvent] = useState<TimelineEvent | null>(null);
  const [expanded, setExpanded] = useState(false);

  const MIN_YEAR = -4000;
  const MAX_YEAR = 2026;
  const RANGE = MAX_YEAR - MIN_YEAR;

  // Posição percentual de um ano na timeline
  const yearToPercent = (year: number) => ((year - MIN_YEAR) / RANGE) * 100;

  // Evento mais próximo do tempo atual
  const nearestEvent = useMemo(() => {
    let closest = TIMELINE_EVENTS[0];
    let minDist = Infinity;
    for (const ev of TIMELINE_EVENTS) {
      const dist = Math.abs(ev.year - currentTime);
      if (dist < minDist) { minDist = dist; closest = ev; }
    }
    return closest;
  }, [currentTime]);

  // Auto-scroll para o evento mais próximo
  useEffect(() => {
    if (scrollRef.current && expanded) {
      const target = scrollRef.current.querySelector(`[data-year="${nearestEvent.year}"]`);
      target?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [nearestEvent, expanded]);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-[92%] max-w-4xl">
      {/* Tooltip do evento em hover */}
      {hoveredEvent && (
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 glass-heavy px-5 py-3 rounded-2xl border border-border-strong shadow-2xl z-20 max-w-sm text-center animate-fade-in pointer-events-none">
          <span className="text-lg mr-2">{hoveredEvent.icon}</span>
          <span className="text-xs font-bold text-white">{hoveredEvent.label}</span>
          <span className="text-[10px] text-amber-400 ml-2 font-mono">
            {hoveredEvent.year < 0 ? `${Math.abs(hoveredEvent.year)} a.C.` : `${hoveredEvent.year} d.C.`}
          </span>
          {hoveredEvent.description && (
            <p className="text-[10px] text-white/50 mt-1 leading-tight">{hoveredEvent.description}</p>
          )}
        </div>
      )}

      <div className="glass-heavy p-5 rounded-[28px] border border-border-strong shadow-[0_30px_80px_rgba(0,0,0,0.7)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                {CATEGORY_INFO[nearestEvent.category]?.name || "Controle Temporal"} 
                <span className="text-amber-500/50">|</span> 
                <span className="text-emerald-400/80">{CATEGORY_INFO[nearestEvent.category]?.duration}</span>
              </span>
              <span className="text-xs font-bold text-white/70">{nearestEvent.icon} {nearestEvent.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border border-border-strong text-white/40 hover:text-white/80 hover:border-white/20 transition-all"
            >
              {expanded ? "Compacto" : "Expandir"}
            </button>
            <div className="px-4 py-1.5 bg-amber-500/10 rounded-xl border border-amber-500/20 shadow-inner">
              <span className="text-xl font-black text-amber-400 font-serif tracking-tight glow-text">
                {yearLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Slider Principal com Marcadores de Eventos */}
        <div className="relative mt-2">
          {/* Event markers on the slider track */}
          <div className="relative h-6 mb-1">
            {TIMELINE_EVENTS.map((ev, i) => {
              const left = yearToPercent(ev.year);
              const isActive = Math.abs(ev.year - currentTime) < 30;
              const isNearest = ev === nearestEvent;
              return (
                <button
                  key={`${ev.year}-${i}`}
                  onClick={() => onTimeChange(ev.year, ev.location)}
                  onMouseEnter={() => setHoveredEvent(ev)}
                  onMouseLeave={() => setHoveredEvent(null)}
                  className="absolute -translate-x-1/2 transition-all duration-300"
                  style={{ left: `${left}%`, top: 0 }}
                  title={`${ev.label} (${ev.year < 0 ? Math.abs(ev.year) + " a.C." : ev.year + " d.C."})`}
                >
                  <div
                    className={`rounded-full transition-all duration-300 ${
                      isNearest
                        ? "w-3.5 h-3.5 shadow-[0_0_12px_rgba(245,158,11,0.8)]"
                        : isActive
                          ? "w-2.5 h-2.5 shadow-[0_0_6px_rgba(255,255,255,0.3)]"
                          : "w-1.5 h-1.5 opacity-40 hover:opacity-100 hover:w-2.5 hover:h-2.5"
                    }`}
                    style={{ backgroundColor: CATEGORY_COLORS[ev.category] }}
                  />
                </button>
              );
            })}
          </div>

          {/* Slider */}
          <input
            type="range"
            min={MIN_YEAR}
            max={MAX_YEAR}
            value={currentTime}
            onChange={(e) => onTimeChange(Number(e.target.value))}
            className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:shadow-[0_0_25px_rgba(245,158,11,0.6)]
              [&::-webkit-slider-thumb]:border-3 [&::-webkit-slider-thumb]:border-[#05080f]
              hover:[&::-webkit-slider-thumb]:scale-115 transition-all"
          />

          {/* Era Labels - Posicionamento Dinâmico baseado nos Anos Reais */}
          <div className="relative h-8 mt-2">
            {[
              { year: -4000, name: "Primordial", dates: "4000-2000 a.C.", color: "text-white/30" },
              { year: -2000, name: "Patriarcas", dates: "2000-1250 a.C.", color: "text-emerald-400/60" },
              { year: -1250, name: "Êxodo", dates: "1250-1010 a.C.", color: "text-red-400/60" },
              { year: -1010, name: "Monarquia", dates: "1010-586 a.C.", color: "text-violet-400/60" },
              { year: -586, name: "Exílio", dates: "586-516 a.C.", color: "text-slate-400/60" },
              { year: -332, name: "Silêncio", dates: "332-4 a.C.", color: "text-indigo-400/60" },
              { year: -4, name: "Jesus", dates: "4 a.C. - 30 d.C.", color: "text-amber-400/80" },
              { year: 70, name: "Igreja", dates: "30 - 313 d.C.", color: "text-orange-400/60" },
              { year: 2026, name: "Hoje", dates: "2026", color: "text-cyan-400/60" },
            ].map((era) => {
              const percent = ((era.year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;
              return (
                <div
                  key={era.name}
                  className={`absolute -translate-x-1/2 flex flex-col items-center text-center transition-all ${era.color}`}
                  style={{ left: `${percent}%` }}
                >
                  <span className="text-[7px] font-black tracking-tighter uppercase whitespace-nowrap drop-shadow-md">
                    {era.name}
                  </span>
                  <span className="text-[5.5px] font-bold tracking-widest opacity-80 whitespace-nowrap mt-0.5">
                    {era.dates}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lista Expandida de Eventos */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-border-subtle">
            <div
              ref={scrollRef}
              className="flex gap-2 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
            >
              {TIMELINE_EVENTS.map((ev, i) => {
                const isNearest = ev === nearestEvent;
                const isActive = Math.abs(ev.year - currentTime) < 50;
                return (
                  <button
                    key={`card-${ev.year}-${i}`}
                    data-year={ev.year}
                    onClick={() => onTimeChange(ev.year, ev.location)}
                    className={`flex-shrink-0 relative overflow-hidden rounded-2xl border transition-all duration-500 text-left group ${
                      isNearest
                        ? "bg-amber-500/20 border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.2)] scale-105"
                        : isActive
                          ? "bg-white/10 border-white/20"
                          : "bg-white/[0.03] border-border-subtle opacity-60 hover:opacity-100"
                    }`}
                    style={{ minWidth: 180, height: 100 }}
                  >
                    {/* Background Image with Blur */}
                    {ev.imageUrl && (
                      <div 
                        className="absolute inset-0 opacity-30 group-hover:opacity-50 transition-all duration-700 group-hover:scale-110"
                        style={{ 
                          backgroundImage: `url(${ev.imageUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                    )}
                    
                    {/* Gradient Overlay for Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#05080f] via-[#05080f]/40 to-transparent" />

                    <div className="relative z-10 p-3 flex flex-col justify-between h-full">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm drop-shadow-md">{ev.icon}</span>
                          <span
                            className="text-[9px] font-black uppercase tracking-widest drop-shadow-md"
                            style={{ color: CATEGORY_COLORS[ev.category] }}
                          >
                            {ev.year < 0 ? `${Math.abs(ev.year)} a.C.` : `${ev.year} d.C.`}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className={`text-[11px] font-black leading-tight drop-shadow-lg ${isNearest ? "text-white" : "text-white/90"}`}>
                          {ev.label}
                        </p>
                        <p className="text-[8px] text-white/50 mt-1 font-bold truncate flex items-center gap-1">
                          <span className="text-amber-500/70">📍</span> {ev.locationName}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
