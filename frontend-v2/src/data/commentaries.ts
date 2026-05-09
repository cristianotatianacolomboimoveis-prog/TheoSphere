export interface CommentaryEntry {
  id: string;
  author: string;
  title: string;
  tradition: string;
  year: string;
  text: string;
  /** Internal matching key — kept in English to match Bible book identifiers in the store. */
  reference: string;
}

export const COMMENTARIES: CommentaryEntry[] = [
  // ─── João 3:16 ────────────────────────────────────────────────────────────
  {
    id: "calvin-john-3-16",
    author: "João Calvino",
    title: "Comentários sobre o Evangelho de João",
    tradition: "Reformada",
    year: "1553",
    reference: "John 3:16",
    text: "Pois Deus amou o mundo de tal maneira. Cristo declarou uma causa especial deste amor: porque Deus amou o mundo. O mundo aqui se refere não apenas aos judeus, mas a todos os povos da terra. Ele usa o termo 'mundo' para que ninguém seja excluído, desde que acredite. Contudo, foi necessário acrescentar 'todo aquele que nele crê', para que a promessa não seja estendida indiscriminadamente a todos. Porque ainda que Cristo tenha sido oferecido ao mundo todo para trazer a salvação, nem todos recebem Cristo por fé.",
  },
  {
    id: "henry-john-3-16",
    author: "Matthew Henry",
    title: "Comentário Bíblico Completo",
    tradition: "Puritana/Não-conformista",
    year: "1706",
    reference: "John 3:16",
    text: "De tal maneira Deus amou o mundo — o 'mundo' aqui significa toda a raça humana. O imenso amor de Deus se revelou no dom de seu Filho unigênito; não um servo, não um anjo, mas seu Filho — seu Filho unigênito, que repousa em seu seio. Este dom foi dado livremente; Deus o enviou por sua própria iniciativa. A condição exigida é apenas crer nele. O bendito fim e propósito disto é que todos os que creem não pereçam, mas tenham vida eterna. O inferno é perecer; o céu é vida eterna.",
  },
  {
    id: "spurgeon-john-3-16",
    author: "Charles Spurgeon",
    title: "Sermões do Tabernáculo Metropolitano",
    tradition: "Batista Particular",
    year: "1885",
    reference: "John 3:16",
    text: "Se queres ver o amor de Deus em todo o seu esplendor, contempla a cruz de Cristo. 'De tal maneira Deus amou o mundo' — tanto, tão imensamente, tão maravilhosamente, tão imensuravelmente. Todo aquele que nele crê — não uns poucos selecionados, não os refinados, não os intelectuais — mas todo aquele; uma palavra de alcance universal. Aquele que crer não perecerá. Aí está o resgate. Terá vida eterna — aí está a recompensa. Oh, a largura e a profundidade deste texto de ouro!",
  },
  {
    id: "wesley-john-3-16",
    author: "John Wesley",
    title: "Notas Explicativas sobre o Novo Testamento",
    tradition: "Arminiana/Metodista",
    year: "1755",
    reference: "John 3:16",
    text: "De tal maneira Deus amou o mundo — isto é, todos os homens debaixo do céu; tanto judeus quanto gentios. Deu seu Filho unigênito — verdadeira e seriamente, incluindo todas as bênçãos que necessariamente fluem de sua encarnação. Para que todo aquele que nele crê não pereça — esta é a condição sob a qual Deus oferece a salvação. É o termo mais abrangente possível — todo aquele, sem qualquer exceção.",
  },
  {
    id: "barnes-john-3-16",
    author: "Albert Barnes",
    title: "Notas de Barnes sobre o Novo Testamento",
    tradition: "Presbiteriana",
    year: "1832",
    reference: "John 3:16",
    text: "De tal maneira Deus amou o mundo — a palavra 'mundo' não pode ser limitada aos eleitos ou a um povo em particular. Ela significa claramente toda a humanidade. O 'de tal maneira' aqui denota o modo, a qualidade e a intensidade do amor — ele amou o mundo de tal maneira, em tal grau, que deu seu Filho unigênito. Pereça — a palavra usada aqui denota punição e destruição, em oposição à 'vida eterna' prometida aos que creem.",
  },
  {
    id: "clarke-john-3-16",
    author: "Adam Clarke",
    title: "Comentário Bíblico de Clarke",
    tradition: "Metodista",
    year: "1826",
    reference: "John 3:16",
    text: "Porque Deus amou o mundo de tal maneira — o amor de Deus é a causa de nossa salvação. Ele amou o mundo — toda a raça humana; não somente os judeus, mas também os gentios. Deu seu Filho unigênito — seu dom mais excelente, o dom de si mesmo em natureza humana. Não pereça — não seja destruído; escape da ruína que o pecado mereceu. Tenha vida eterna — uma participação na natureza divina na vida presente, e glória com Deus na vida por vir.",
  },

  // ─── João 1:1 ─────────────────────────────────────────────────────────────
  {
    id: "calvin-john-1-1",
    author: "João Calvino",
    title: "Comentários sobre o Evangelho de João",
    tradition: "Reformada",
    year: "1553",
    reference: "John 1:1",
    text: "No princípio era o Verbo — João afirma que o Verbo existia antes que o mundo fosse criado. Ao usar o termo 'Verbo', ele proclama que Cristo é a Sabedoria eterna e a Vontade de Deus. 'Era' aqui significa existência eterna, não uma existência que teve começo. E o Verbo era Deus — João não diz que o Verbo era 'um deus' nem que tinha natureza divina secundária, mas afirma de forma absoluta que ele é Deus, participando de toda a essência divina.",
  },
  {
    id: "henry-john-1-1",
    author: "Matthew Henry",
    title: "Comentário Bíblico Completo",
    tradition: "Puritana/Não-conformista",
    year: "1706",
    reference: "John 1:1",
    text: "No princípio era o Verbo — antes de todo o tempo, antes de existir o mundo, o Verbo já existia. O Verbo estava com Deus — pessoa distinta do Pai, em união íntima com ele, em seu seio. O Verbo era Deus — não uma divindade subordinada, mas verdadeira e essencialmente Deus, da mesma substância do Pai. Por 'o Verbo', João designa Cristo, a segunda pessoa da Trindade, que na plenitude dos tempos assumiu sobre si a natureza humana.",
  },
  {
    id: "spurgeon-john-1-1",
    author: "Charles Spurgeon",
    title: "Sermões do Tabernáculo Metropolitano",
    tradition: "Batista Particular",
    year: "1880",
    reference: "John 1:1",
    text: "O evangelista vai além de toda criação, além de todo tempo, ao estado eterno das coisas. 'No princípio era o Verbo.' Quando as primeiras coisas começaram, o Verbo já estava ali, perfeito e completo em si mesmo. O Verbo era Deus — não uma grande criatura, não um ser semidivino, mas Deus verdadeiro de Deus verdadeiro. Esta é a grande confissão do cristão: que Jesus Cristo, que se fez carne, não é outro senão o Deus eterno.",
  },

  // ─── Romanos 3:23 ─────────────────────────────────────────────────────────
  {
    id: "henry-romans-3-23",
    author: "Matthew Henry",
    title: "Comentário Bíblico Completo",
    tradition: "Puritana/Não-conformista",
    year: "1706",
    reference: "Romans 3:23",
    text: "Todos pecaram e estão destituídos da glória de Deus — esta é uma acusação universal. Ninguém é exceção. Judeus e gentios estão igualmente sob culpa. 'Destituídos da glória de Deus' significa que falharam em alcançar a santidade e a perfeição que Deus pretendia para a humanidade, e estão privados da honra de serem aprovados por Deus. O pecado original de Adão lançou esta queda sobre toda a raça.",
  },
  {
    id: "calvin-romans-3-23",
    author: "João Calvino",
    title: "Comentários sobre a Epístola de Paulo aos Romanos",
    tradition: "Reformada",
    year: "1540",
    reference: "Romans 3:23",
    text: "Todos pecaram e estão privados da glória de Deus. Paulo afirma que todos os homens estão sujeitos à condenação, sem nenhuma exceção. A palavra 'glória' aqui se refere ao reconhecimento justo que Deus daria ao homem se ele fosse reto. Uma vez que toda a raça humana é corrompida, ninguém pode apresentar-se diante de Deus como merecedor de aprovação. Este versículo destrói toda presunção de mérito humano.",
  },
  {
    id: "clarke-romans-3-23",
    author: "Adam Clarke",
    title: "Comentário Bíblico de Clarke",
    tradition: "Metodista",
    year: "1826",
    reference: "Romans 3:23",
    text: "Porque todos pecaram — todo indivíduo da raça humana, judeu e gentio igualmente. E estão destituídos da glória de Deus — a palavra ὑστεροῦνται (husterountai) significa estar carente de, faltar, ficar atrás. Todos carecem da justiça e santidade que Deus exige, daquela imagem de Deus na qual o homem foi originalmente criado. O estado da humanidade caída é de uma deficiência moral universal.",
  },

  // ─── Romanos 5:8 ──────────────────────────────────────────────────────────
  {
    id: "henry-romans-5-8",
    author: "Matthew Henry",
    title: "Comentário Bíblico Completo",
    tradition: "Puritana/Não-conformista",
    year: "1706",
    reference: "Romans 5:8",
    text: "Mas Deus prova o seu amor para conosco em que, sendo nós ainda pecadores, Cristo morreu por nós. Esta é a expressão mais elevada do amor — morrer pelos que são inimigos, não por amigos e benfeitores. Sendo nós ainda pecadores — não depois de termos nos tornado justos, não quando tínhamos algum mérito, mas no abismo de nossa indignidade. A demonstração do amor de Deus consiste neste próprio contraste: objetos tão indignos, amor tão indizível.",
  },
  {
    id: "spurgeon-romans-5-8",
    author: "Charles Spurgeon",
    title: "Sermões do Tabernáculo Metropolitano",
    tradition: "Batista Particular",
    year: "1871",
    reference: "Romans 5:8",
    text: "Sendo nós ainda pecadores — aí está a maravilha. Não enquanto éramos santos, não enquanto chorávamos, não enquanto buscávamos a Deus, mas enquanto éramos rebeldes, traidores, inimigos. Cristo morreu pelos ímpios. O amor de Deus não é despertado por qualquer beleza em nós; flui espontaneamente do grande coração de Deus. A cruz é o argumento de Deus contra o desespero — se ele nos amou então, não nos amará agora?",
  },
  {
    id: "wesley-romans-5-8",
    author: "John Wesley",
    title: "Notas Explicativas sobre o Novo Testamento",
    tradition: "Arminiana/Metodista",
    year: "1755",
    reference: "Romans 5:8",
    text: "Deus recomenda — isto é, dá uma prova ilustre de — seu amor para conosco em que, sendo nós ainda pecadores, Cristo morreu por nós. O amor de Deus é plenamente demonstrado no dom de seu Filho para morrer por aqueles que não eram meramente ignorantes, mas voluntariamente rebeldes. Este é o fundamento da nossa confiança e segurança: que o amor de Deus precedeu a nossa conversão e não dependeu da nossa dignidade.",
  },

  // ─── Romanos 8:28 ─────────────────────────────────────────────────────────
  {
    id: "gill-romans-8-28",
    author: "John Gill",
    title: "Exposição da Bíblia Inteira",
    tradition: "Batista Calvinista",
    year: "1763",
    reference: "Romans 8:28",
    text: "E sabemos que todas as coisas concorrem para o bem daqueles que amam a Deus, daqueles que são chamados segundo o seu propósito. Todas as coisas — prosperidade e adversidade, saúde e doença, vida e morte, coisas presentes e coisas vindouras — todas estão sob o governo da divina Providência e são feitas para servir aos melhores interesses dos eleitos. Esta é uma garantia das mais abrangentes e consoladoras, fundamentada não nas circunstâncias, mas no propósito soberano de Deus.",
  },
  {
    id: "wesley-romans-8-28",
    author: "John Wesley",
    title: "Notas Explicativas sobre o Novo Testamento",
    tradition: "Arminiana/Metodista",
    year: "1755",
    reference: "Romans 8:28",
    text: "Aos que amam a Deus — todos os que amam a Deus possuem uma convicção interior de que suas aflições resultarão em seu benefício final. 'Segundo o seu propósito' refere-se ao seu desígnio universal de salvar todos os que creem. Deus opera todas as coisas — mesmo tribulações, perdas, lutos — para o benefício espiritual e eterno de seus filhos. Não é otimismo cego, mas convicção fundamentada no caráter de uma Providência amorosa.",
  },
  {
    id: "henry-romans-8-28",
    author: "Matthew Henry",
    title: "Comentário Bíblico Completo",
    tradition: "Puritana/Não-conformista",
    year: "1706",
    reference: "Romans 8:28",
    text: "Todas as coisas concorrem para o bem — não cada uma isoladamente, mas em sua operação combinada sob um Deus sábio e governante. A própria cruz operou para o bem. A corrupção da natureza humana opera para o bem ao nos humilhar. As aflições da vida operam para o bem ao desprender nossas afeições do mundo. Deus é o grande alquimista que transforma os metais vis do sofrimento em ouro. Aos que são chamados — esta promessa não é universal; pertence aos que foram eficazmente chamados pela graça divina.",
  },

  // ─── Romanos 8:38-39 ──────────────────────────────────────────────────────
  {
    id: "calvin-romans-8-38-39",
    author: "João Calvino",
    title: "Comentários sobre a Epístola de Paulo aos Romanos",
    tradition: "Reformada",
    year: "1540",
    reference: "Romans 8:38-39",
    text: "Estou convicto de que nem morte, nem vida... poderão separar-nos do amor de Deus. Paulo aqui levanta uma muralha de segurança em torno da salvação dos eleitos. Ao enumerar todas as categorias de ameaças possíveis — morte, vida, anjos, principados, potestades, coisas presentes, coisas futuras — ele demonstra que nenhum poder no universo pode anular o amor de Deus pelos seus escolhidos. A segurança do crente não repousa em si mesmo, mas na imutável vontade de Deus.",
  },
  {
    id: "spurgeon-romans-8-38-39",
    author: "Charles Spurgeon",
    title: "Sermões do Tabernáculo Metropolitano",
    tradition: "Batista Particular",
    year: "1869",
    reference: "Romans 8:38-39",
    text: "Paulo empilha montanha sobre montanha nesta passagem, nomeando todo adversário concebível — morte, vida, anjos, principados, potestades, coisas presentes, coisas vindouras, altura, profundidade, qualquer outra criatura — e então desafia a todos. Nenhum deles, nem isolados nem combinados, pode romper o vínculo entre Cristo e seus remidos. Esta é a carta de garantia do cristão. Podemos ser separados do conforto, da saúde, dos amigos; mas nunca do amor de Deus que está em Cristo Jesus, nosso Senhor.",
  },

  // ─── Gênesis 1:1 ──────────────────────────────────────────────────────────
  {
    id: "henry-genesis-1-1",
    author: "Matthew Henry",
    title: "Comentário Bíblico Completo",
    tradition: "Puritana/Não-conformista",
    year: "1706",
    reference: "Genesis 1:1",
    text: "No princípio criou Deus os céus e a terra. O primeiro versículo da Bíblia é uma verdade das mais abrangentes e gloriosas: que o universo teve um começo; que esse começo foi uma criação divina; e que o Criador é Deus. Demole o ateísmo — porque há um Deus. Demole o politeísmo — porque há um só Deus. Derruba a matéria eterna — porque a matéria teve um começo. Resolve a questão da origem de todas as coisas: não pelo acaso, não pela necessidade, mas pelo ato livre de um Deus infinito, eterno e todo-poderoso.",
  },
  {
    id: "calvin-genesis-1-1",
    author: "João Calvino",
    title: "Comentários sobre o Gênesis",
    tradition: "Reformada",
    year: "1554",
    reference: "Genesis 1:1",
    text: "No princípio criou Deus os céus e a terra. Moisés não começa com argumentos filosóficos para provar a existência de Deus, mas simplesmente proclama que Deus é o Criador de todas as coisas. A palavra hebraica 'bara' designa criação a partir do nada — Deus não usou material preexistente. Este versículo também revela que o mundo tem uma idade: ele teve um início, não existiu desde sempre. A criação reflete a glória e a sabedoria infinita do Criador.",
  },
  {
    id: "clarke-genesis-1-1",
    author: "Adam Clarke",
    title: "Comentário Bíblico de Clarke",
    tradition: "Metodista",
    year: "1826",
    reference: "Genesis 1:1",
    text: "No princípio — בְּרֵאשִׁית (bereshith). A palavra 'princípio' não determina necessariamente o período exato, mas anuncia que este mundo teve um começo. Deus — אֱלֹהִים (Elohim), substantivo plural, que comentadores judeus referem à majestade divina; comentadores cristãos em sua maioria entendem como implicando uma pluralidade de pessoas na Divindade. Criou — בָּרָא (bara), palavra usada exclusivamente para a criação divina, e sempre sem menção de qualquer material preexistente.",
  },

  // ─── Efésios 2:8-9 ────────────────────────────────────────────────────────
  {
    id: "calvin-ephesians-2-8-9",
    author: "João Calvino",
    title: "Comentários sobre a Epístola aos Efésios",
    tradition: "Reformada",
    year: "1548",
    reference: "Ephesians 2:8-9",
    text: "Pela graça sois salvos, por meio da fé; e isto não vem de vós — é dom de Deus; não vem das obras, para que ninguém se glorie. Paulo está aqui excluindo completamente todo mérito humano da salvação. A graça é a causa eficiente; a fé é o instrumento pelo qual a recebemos; Cristo é a matéria ou substância da salvação. Mesmo a fé em si é um dom de Deus — não é uma contribuição humana que merece recompensa, mas é operada pelo Espírito Santo no coração do eleito.",
  },
  {
    id: "henry-ephesians-2-8-9",
    author: "Matthew Henry",
    title: "Comentário Bíblico Completo",
    tradition: "Puritana/Não-conformista",
    year: "1706",
    reference: "Ephesians 2:8-9",
    text: "Pela graça sois salvos, mediante a fé; e isto não vem de vós, é dom de Deus. A graça é a fonte e a nascente; a fé é o meio ou canal designado. A própria fé pela qual abraçamos a Cristo não vem de nós; é dom de Deus. Não vem das obras — obras de qualquer tipo, cerimoniais ou morais, antes ou depois da conversão. Para que ninguém se glorie — pois se a salvação fosse pelas obras, os homens teriam motivo para se gloriar; mas a graça exclui toda jactância e abate o homem, para que somente Deus seja exaltado.",
  },
  {
    id: "spurgeon-ephesians-2-8-9",
    author: "Charles Spurgeon",
    title: "Sermões do Tabernáculo Metropolitano",
    tradition: "Batista Particular",
    year: "1858",
    reference: "Ephesians 2:8-9",
    text: "A salvação é pela graça — pura, soberana, imerecida, não conquistada. Mediante a fé — não pela fé como ato meritório, mas por meio dela como instrumento de recepção. E isto não vem de vós — nem a salvação nem a fé vêm da vontade ou esforço humanos; ambas são dom de Deus. Não vem das obras, para que ninguém se glorie. No céu haverá um único hino, e nele não haverá nota alguma de mérito humano. Cada voz cantará: 'Digno é o Cordeiro.'",
  },
  {
    id: "wesley-ephesians-2-8-9",
    author: "John Wesley",
    title: "Notas Explicativas sobre o Novo Testamento",
    tradition: "Arminiana/Metodista",
    year: "1755",
    reference: "Ephesians 2:8-9",
    text: "Pela graça sois salvos mediante a fé — pelo favor livre e imerecido, por meio de uma confiança divina em Cristo. E isto — toda esta salvação — não vem de vós. Vossa fé, arrependimento e novo nascimento não vêm do vosso próprio poder; Deus os opera em vós. Não das obras — não de quaisquer obras boas anteriores ou justiça natural. Para que ninguém se glorie — o desígnio da graça é abater inteiramente o orgulho humano, para que só Deus tenha toda a glória.",
  },

  // ─── Hebreus 11:1 ─────────────────────────────────────────────────────────
  {
    id: "henry-hebrews-11-1",
    author: "Matthew Henry",
    title: "Comentário Bíblico Completo",
    tradition: "Puritana/Não-conformista",
    year: "1706",
    reference: "Hebrews 11:1",
    text: "Ora, a fé é a certeza das coisas que se esperam, a convicção de fatos que se não veem. A fé é a substância — a ὑπόστασις (hypostasis), o fundamento, a confiança segura, o terreno firme sobre o qual nos colocamos quando esperamos a salvação e a vida eterna. A convicção de coisas que não se veem — é o sentido espiritual que discerne as realidades espirituais, como o olho discerne os objetos materiais. A fé faz pela alma o que os sentidos fazem pelo corpo: torna presentes as coisas ausentes e certas as coisas futuras.",
  },
  {
    id: "spurgeon-hebrews-11-1",
    author: "Charles Spurgeon",
    title: "Sermões do Tabernáculo Metropolitano",
    tradition: "Batista Particular",
    year: "1866",
    reference: "Hebrews 11:1",
    text: "A fé é a certeza das coisas que se esperam — confere realidade presente às bênçãos futuras; traz-as para baixo e as torna tangíveis na alma agora. A convicção de fatos que se não veem — a fé é o dom da própria visão de Deus para o mundo invisível. O olho natural vê o que é; a fé vê o que será. A fé não especula nem adivinha; repousa na palavra de Deus, e nesse repouso torna o invisível tão real quanto o visível.",
  },
  {
    id: "barnes-hebrews-11-1",
    author: "Albert Barnes",
    title: "Notas de Barnes sobre o Novo Testamento",
    tradition: "Presbiteriana",
    year: "1832",
    reference: "Hebrews 11:1",
    text: "Ora, a fé é a substância das coisas que se esperam — a palavra ὑπόστασις (hypostasis) significa aqui aquilo que sustenta por baixo; daí, confiança, certeza. A fé é aquilo que confere existência real às coisas esperadas; é uma persuasão tão firme das bênçãos prometidas que elas se tornam tão reais para nós como se já estivessem possuídas. A convicção de fatos que se não veem — a fé funciona como evidência das realidades invisíveis: Deus, o céu, a ressurreição, a vida eterna. Não é credulidade cega, mas confiança racional no testemunho divino.",
  },

  // ─── Salmos 23:1 ──────────────────────────────────────────────────────────
  {
    id: "henry-psalms-23-1",
    author: "Matthew Henry",
    title: "Comentário Bíblico Completo",
    tradition: "Puritana/Não-conformista",
    year: "1706",
    reference: "Psalms 23:1",
    text: "O Senhor é o meu pastor — Davi, embora rei, não se envergonha de chamar a Deus de seu pastor. Isto implica dependência, orientação e cuidado. Um pastor conduz, alimenta, protege e busca a ovelha perdida. Deus exerce todos esses ofícios para com seu povo. Nada me faltará — não, 'nada me falta agora', mas 'nada me faltará no tempo por vir'. É a linguagem de uma confiança santa e bem fundamentada. Quem tem a Deus por pastor está nas melhores mãos; certamente nada lhe faltará que seja verdadeiramente bom para si.",
  },
  {
    id: "spurgeon-psalms-23-1",
    author: "Charles Spurgeon",
    title: "O Tesouro de Davi",
    tradition: "Batista Particular",
    year: "1865",
    reference: "Psalms 23:1",
    text: "O Senhor é o meu pastor. Que título — Jeová-Roí! O nome divino em conexão com o ofício pastoral assegura cuidado e poder infinitos. Meu pastor — personalizando a relação. Não é 'um pastor' nem 'o pastor de Israel', mas 'meu pastor', apropriando-se da bênção em toda a sua plenitude. Nada me faltará — sentença de ouro da mais abrangente espécie. Se Jeová é meu pastor, então a necessidade, a fome, o perigo, a solidão e a morte são todos vencidos. Este versículo é o Salmo inteiro em miniatura.",
  },
  {
    id: "calvin-psalms-23-1",
    author: "João Calvino",
    title: "Comentários sobre os Salmos",
    tradition: "Reformada",
    year: "1557",
    reference: "Psalms 23:1",
    text: "O Senhor é o meu pastor; nada me faltará. Davi, refletindo sobre a bondade de Deus em dirigi-lo e sustentá-lo, usa a figura do pastor, que era bem conhecida por sua experiência pessoal. A comparação implica que somos semelhantes às ovelhas — criaturas fracas, sem orientação, propensas a se perder — e que Deus se condescende a ser o nosso guia. 'Nada me faltará' não significa ausência de toda privação, mas que Deus nos dará tudo o que for necessário para o nosso bem.",
  },

  // ─── Isaías 53:5 ──────────────────────────────────────────────────────────
  {
    id: "henry-isaiah-53-5",
    author: "Matthew Henry",
    title: "Comentário Bíblico Completo",
    tradition: "Puritana/Não-conformista",
    year: "1706",
    reference: "Isaiah 53:5",
    text: "Mas ele foi traspassado pelas nossas transgressões, foi moído pelas nossas iniquidades; o castigo que nos traz a paz estava sobre ele, e pelas suas pisaduras fomos sarados. Este é o próprio coração do evangelho, escrito em profecia sete séculos antes do evento. Nossas transgressões causaram suas feridas; nossas iniquidades causaram suas contusões. O castigo que produz a nossa paz foi posto sobre ele. A pena legal de nossos pecados caiu sobre o Cordeiro inocente de Deus, para que a justiça fosse satisfeita e a misericórdia fluísse sobre nós.",
  },
  {
    id: "spurgeon-isaiah-53-5",
    author: "Charles Spurgeon",
    title: "Sermões do Tabernáculo Metropolitano",
    tradition: "Batista Particular",
    year: "1877",
    reference: "Isaiah 53:5",
    text: "Traspassado pelas nossas transgressões — não pelas suas próprias; ele não tinha nenhuma. A palavra traduzida 'traspassado' (מְחֹלָל, mecholal) implica não um mero arranhão, mas um perfurar de lado a lado. Ele foi traspassado de lado a lado pelas nossas transgressões. A substituição se apresenta aqui tão clara quanto a linguagem pode tornar. As palavras 'pelas nossas' não significam 'por causa de' algum pecado geral, mas 'em nosso lugar, como nosso substituto'. Pelas suas pisaduras — os açoites do flagelo romano — fomos sarados. Nossa enfermidade espiritual é curada por sua agonia física.",
  },
  {
    id: "calvin-isaiah-53-5",
    author: "João Calvino",
    title: "Comentários sobre Isaías",
    tradition: "Reformada",
    year: "1559",
    reference: "Isaiah 53:5",
    text: "Ele foi traspassado pelas nossas transgressões. Isaías aqui apresenta o verdadeiro fundamento do nosso perdão: a satisfação vicária. Cristo suportou em nosso lugar os castigos que devíamos suportar. 'O castigo da nossa paz estava sobre ele' — nossa reconciliação com Deus foi obtida não pela nossa penitência, mas pelo sofrimento de Cristo como nosso representante. Esta é a base da doutrina da expiação substitutiva, tão central para a teologia reformada.",
  },

  // ─── 1 Coríntios 13:4-7 ───────────────────────────────────────────────────
  {
    id: "henry-1cor-13-4-7",
    author: "Matthew Henry",
    title: "Comentário Bíblico Completo",
    tradition: "Puritana/Não-conformista",
    year: "1706",
    reference: "1 Corinthians 13:4-7",
    text: "O amor é sofredor — paciente sob injúrias e provocações. E é benigno — manifesta-se em ações benevolentes. O amor não é invejoso — não se queixa da prosperidade alheia. O amor não se vangloria — não se ufana. Não se ensoberbece — não se enche de orgulho. Não se porta inconvenientemente — age com decoro para com todos. Não busca os seus interesses — não somente vantagem privada. Tudo sofre — cobre as imperfeições com um véu de amor. Tudo suporta — persevera sob todas as provações. Este é um retrato do próprio Cristo.",
  },
  {
    id: "spurgeon-1cor-13-4-7",
    author: "Charles Spurgeon",
    title: "Sermões do Tabernáculo Metropolitano",
    tradition: "Batista Particular",
    year: "1874",
    reference: "1 Corinthians 13:4-7",
    text: "Esta grande passagem é uma fotografia de Jesus Cristo. Lê-a outra vez substituindo 'amor' por 'Cristo': 'Cristo é sofredor e benigno; Cristo não é invejoso; Cristo não se vangloria, não se ensoberbece.' Cada sílaba se encaixa nele perfeitamente. E porque descreve Cristo, descreve também o que cada cristão deve ser em medida crescente. O amor não é mero sentimento; é toda a disposição da alma trazida em conformidade com o caráter do próprio Deus.",
  },
  {
    id: "barnes-1cor-13-4-7",
    author: "Albert Barnes",
    title: "Notas de Barnes sobre o Novo Testamento",
    tradition: "Presbiteriana",
    year: "1832",
    reference: "1 Corinthians 13:4-7",
    text: "O amor é sofredor — o grego ἀγάπη (agape) makrothumei: é longânime, lento para a ira e o ressentimento. É benigno — χρηστεύεται: é ativamente benevolente, fazendo o bem aos outros. Não é invejoso — não é movido por espírito de rivalidade ou má vontade diante do sucesso alheio. Não se vangloria — não se exibe com ostentação. Não se ensoberbece — não se torna arrogante ou presunçoso. Tudo suporta — στέγει: cobre, abriga, protege — lança um véu sobre as faltas dos outros. Esta agape é a graça suprema, sobrepujando todos os dons do Espírito.",
  },

  // ─── Filipenses 4:13 ──────────────────────────────────────────────────────
  {
    id: "henry-philippians-4-13",
    author: "Matthew Henry",
    title: "Comentário Bíblico Completo",
    tradition: "Puritana/Não-conformista",
    year: "1706",
    reference: "Philippians 4:13",
    text: "Tudo posso naquele que me fortalece. O contexto é o contentamento e a suficiência em meio a circunstâncias variadas. Paulo não reivindica onipotência para si mesmo, mas afirma que em todo estado — humilhado ou abundante, em necessidade ou em fartura — Cristo provê a força necessária. Em Cristo — não pela própria resolução ou estoicismo, mas por uma união viva com Cristo, que continuamente lhe infunde força. Este é o fundamento de toda suficiência cristã.",
  },
  {
    id: "spurgeon-philippians-4-13",
    author: "Charles Spurgeon",
    title: "Sermões do Tabernáculo Metropolitano",
    tradition: "Batista Particular",
    year: "1876",
    reference: "Philippians 4:13",
    text: "Tudo posso — que afirmação espantosa! Mas observe a qualificação: naquele que me fortalece. Sem Cristo ele nada poderia fazer; com Cristo ele podia tudo o que fosse necessário. O apóstolo não fala de feitos miraculosos, mas da tarefa moral e espiritual de manter-se contente sob todas as circunstâncias. Estar contente na prisão e no palácio, com fome e bem alimentado, sozinho e em companhia — isto requer uma força que vem somente do alto.",
  },
  {
    id: "clarke-philippians-4-13",
    author: "Adam Clarke",
    title: "Comentário Bíblico de Clarke",
    tradition: "Metodista",
    year: "1826",
    reference: "Philippians 4:13",
    text: "Tudo posso naquele que me fortalece — ἐν τῷ ἐνδυναμοῦντί με Χριστῷ. O particípio grego ἐνδυναμοῦντι (endunamoûnti) significa 'aquele que constantemente infunde força'. Paulo declara um fortalecimento perpétuo e presente que vem de Cristo. Isto não é a força da resolução humana, mas da capacitação divina. A lição é esta: em nós mesmos somos inadequados para tudo; em Cristo somos adequados para tudo o que Deus nos chama a suportar ou empreender.",
  },

  // ─── Jeremias 29:11 ───────────────────────────────────────────────────────
  {
    id: "henry-jeremiah-29-11",
    author: "Matthew Henry",
    title: "Comentário Bíblico Completo",
    tradition: "Puritana/Não-conformista",
    year: "1706",
    reference: "Jeremiah 29:11",
    text: "Porque eu bem sei os pensamentos que penso de vós, diz o Senhor; pensamentos de paz, e não de mal, para vos dar o fim que esperais. Foi dito aos exilados judeus na Babilônia, que estiveram setenta anos em cativeiro. Deus lhes assegura que mesmo no exílio seus planos para eles não eram de juízo, mas de esperança. O 'fim que esperais' (תִּקְוָה, tikvah) significa esperança e futuro. Os pensamentos de Deus para com seu povo não são de mal; as providências mais sombrias ocultam os propósitos mais brilhantes.",
  },
  {
    id: "calvin-jeremiah-29-11",
    author: "João Calvino",
    title: "Comentários sobre Jeremias",
    tradition: "Reformada",
    year: "1563",
    reference: "Jeremiah 29:11",
    text: "Porque eu sei os planos que tenho para vós, diz o Senhor. Deus aqui se dirige aos exilados em Babilônia para confirmar que mesmo o cativeiro faz parte de seus planos benevolentes. A catividade foi um justo castigo, mas Deus não abandonou os seus. Os planos de Deus são de paz (שָׁלוֹם, shalom) — bem-estar, prosperidade, integridade. A esperança aqui prometida é concreta e futura: após setenta anos, Deus restauraria Israel. O texto nos ensina a confiar na soberania bondosa de Deus mesmo nas circunstâncias mais adversas.",
  },

  // ─── Mateus 5:3-12 (Bem-aventuranças) ────────────────────────────────────
  {
    id: "henry-matthew-5-3-12",
    author: "Matthew Henry",
    title: "Comentário Bíblico Completo",
    tradition: "Puritana/Não-conformista",
    year: "1706",
    reference: "Matthew 5:3-12",
    text: "Bem-aventurados os pobres de espírito — esta é a primeira bem-aventurança e o fundamento de todas as outras. A pobreza de espírito é um sentido profundo da própria pobreza espiritual; um esvaziamento de autossuficiência, orgulho e autojustiça. É o oposto do orgulho espiritual. Deles é o Reino dos céus — presente e futuro. As Bem-aventuranças não descrevem diferentes classes de cristãos, mas as graças que todos os cristãos devem possuir em seu pleno desenvolvimento. São a descrição do caráter cristão como um todo.",
  },
  {
    id: "spurgeon-matthew-5-3-12",
    author: "Charles Spurgeon",
    title: "Sermões do Tabernáculo Metropolitano",
    tradition: "Batista Particular",
    year: "1872",
    reference: "Matthew 5:3-12",
    text: "Cristo abre seu grande Sermão do Monte com oito bem-aventuranças — oito descrições da vida bem-aventurada. Pobreza de espírito, lamento, mansidão, fome de justiça, misericórdia, pureza de coração, pacificação, sofrimento por causa da justiça — estas são as marcas dos cidadãos do Reino. O mundo chama os pobres, os que choram e os perseguidos de infelizes; Cristo os chama de bem-aventurados. Ele inverte o sistema de valores do mundo, como o Reino de Deus sempre faz.",
  },
  {
    id: "calvin-matthew-5-3-12",
    author: "João Calvino",
    title: "Harmonia dos Evangelhos",
    tradition: "Reformada",
    year: "1555",
    reference: "Matthew 5:3-12",
    text: "Bem-aventurados os pobres de espírito — Cristo aqui corrige a falsa concepção de felicidade que os homens geralmente têm. Os homens julgam felizes os ricos, os poderosos, os que gozam de prazer e paz. Cristo declara felizes os que o mundo considera miseráveis. A pobreza de espírito é o reconhecimento da própria insuficiência e miséria diante de Deus — é o oposto do orgulho farisaico. Tais pessoas recebem o reino dos céus porque, sendo vazias de si mesmas, estão prontas para ser preenchidas por Deus.",
  },
  {
    id: "barnes-matthew-5-3-12",
    author: "Albert Barnes",
    title: "Notas de Barnes sobre o Novo Testamento",
    tradition: "Presbiteriana",
    year: "1832",
    reference: "Matthew 5:3-12",
    text: "Bem-aventurados os pobres de espírito — a palavra 'bem-aventurados' (μακάριοι, makarioi) denota um estado de felicidade e bem-estar. 'Pobres de espírito' denota humildade — os que não são autossuficientes ou orgulhosos, mas que sentem sua destituição espiritual e dependência de Deus. Deles é o Reino dos céus — o Reino do Messias pertence aos humildes, não aos orgulhosos. As Bem-aventuranças formam uma cadeia: a humildade produz lamento pelo pecado, o lamento produz mansidão, a mansidão produz fome de justiça, e assim por diante.",
  },
];

export function getCommentariesForReference(ref: string): CommentaryEntry[] {
  const lowerRef = ref.toLowerCase();
  return COMMENTARIES.filter(c =>
    lowerRef.includes(c.reference.toLowerCase()) ||
    c.reference.toLowerCase().includes(lowerRef.split(':')[0])
  );
}

/**
 * Busca comentários por relevância de palavras-chave para uso no fallback do RAG.
 * Retorna até `limit` entradas ordenadas por número de palavras-chave encontradas.
 */
export function searchCommentariesByKeywords(
  query: string,
  limit = 3,
): CommentaryEntry[] {
  const queryWords = query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3);

  if (queryWords.length === 0) return COMMENTARIES.slice(0, limit);

  const scored = COMMENTARIES.map((c) => {
    const haystack = `${c.reference} ${c.author} ${c.text} ${c.tradition}`.toLowerCase();
    const score = queryWords.reduce(
      (acc, word) => acc + (haystack.includes(word) ? 1 : 0),
      0,
    );
    return { entry: c, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.entry);
}
