import { Injectable } from '@nestjs/common';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

@Injectable()
export class DomainClassifierService {
  /**
   * Sanitiza o input para prevenir Prompt Injection e caracteres maliciosos.
   */
  sanitizeInput(input: string): string {
    if (!input) return '';
    return (
      input
        .replace(
          /System:|User:|Assistant:|Assistant Instruction:|Ignore previous instructions/gi,
          '',
        ) // Blindagem básica
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove caracteres de controle
        .trim()
        .substring(0, 1000)
    ); // Limite de 1k chars para evitar DoS por tokens
  }

  /**
   * Classifica se uma query está dentro do domínio teológico, bíblico ou histórico da TheoSphere.
   */
  isTheologicalDomain(
    query: string,
    _conversationHistory: ChatMessage[] = [],
    structuredMode = false,
  ): boolean {
    // Sempre verifica a query atual contra o filtro de domínio,
    // independentemente do histórico de conversa (previne bypass por contexto).
    // Sem acentos: normaliza NFD para evitar divergência de digitação.
    const q = query
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    // 1. Blacklist explícita (assuntos puramente mundanos/off-topic)
    const blacklistKeywords = [
      'motor de carro',
      'consertar carro',
      'trocar pneu',
      'receita de bolo',
      'programar em javascript',
      'código python',
      'desenvolvimento web',
      'campeonato de futebol',
      'fórmula 1',
      'previsão do tempo',
      'ações da bolsa',
      'como assar',
      'jogos eletrônicos',
      'smartphone',
    ];

    const semAcento = (t: string) =>
      t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const hasBlacklistKeyword = blacklistKeywords.some((keyword) =>
      q.includes(semAcento(keyword)),
    );
    if (hasBlacklistKeyword) {
      return false;
    }

    // Prompts estruturados (Factbook, Exegese) são montados pela própria aplicação.
    // A blacklist acima continua valendo; a whitelist é dispensada.
    if (structuredMode) {
      return true;
    }

    // 2. Whitelist abrangente de termos teológicos, bíblicos, apologéticos e filosóficos
    const inDomainKeywords = [
      // Teologia e Escritura
      'deus',
      'jesus',
      'cristo',
      'bíblia',
      'biblia',
      'escritura',
      'versículo',
      'versiculo',
      'teologia',
      'fé',
      'salvação',
      'graça',
      'pecado',
      'perdão',
      'espirito',
      'igreja',
      'pastor',
      'exegese',
      'léxico',
      'lexico',
      'grego',
      'hebraico',
      'aramaico',
      'strong',
      'análise',
      'analise',
      'comentário',
      'comentario',
      'calvino',
      'lutero',
      'agostinho',
      'tomás',
      'spurgeon',
      'wesley',
      'henry',
      'clarke',
      'dogma',
      'doutrina',
      'trindade',
      'criação',
      'criacao',
      'fim dos tempos',
      'apocalipse',
      'gênesis',
      'genesis',
      'evangelho',
      'epístola',
      'epistola',
      'profeta',
      'salmo',
      'provérbio',
      'proverbio',
      'exílio',
      'exilio',
      'templo',
      'aliança',
      'alianca',
      'testamento',
      'hermenêutica',
      'hermeneutica',
      'homilética',
      'homiletica',
      'sermão',
      'sermao',
      'pregação',
      'pregacao',
      'justificação',
      'justificacao',
      'santificação',
      'santificacao',
      'redenção',
      'redencao',
      'escatologia',
      'eclesiologia',
      'cristologia',
      'pneumatologia',
      'soteriologia',
      'teodiceia',
      'sofrimento',
      'mortalidade',
      'ressurreição',
      'ressurreicao',
      'milagre',
      'parábola',
      'parabola',
      'sefaria',
      'hebrew',
      // Figuras Bíblicas Importantes
      'paulo',
      'pedro',
      'joão',
      'joao',
      'lucas',
      'mateus',
      'marcos',
      'tiago',
      'moisés',
      'moises',
      'abraão',
      'abraao',
      'isaque',
      'jacó',
      'jaco',
      'davi',
      'salomão',
      'salomao',
      'elias',
      'eliseu',
      'isaías',
      'isaias',
      'jeremias',
      'ezequiel',
      'daniel',
      'maria',
      'josé',
      'jose',
      // Sacramentos e Práticas (Batismo, Aspersão, Imersão)
      'batismo',
      'aspersão',
      'imersão',
      'aspersao',
      'imersao',
      'ceia',
      'comunhão',
      'comunhao',
      'sacramento',
      'culto',
      'liturgia',
      'oração',
      'oracao',
      'jejum',
      'adoração',
      'adoracao',
      'santo',
      'santidade',
      // Tradições (Arminianismo, Calvinismo, Apologética)
      'arminiana',
      'arminiano',
      'arminianismo',
      'armínio',
      'arminio',
      'calvinista',
      'calvinismo',
      'reformada',
      'puritano',
      'protestante',
      'luterana',
      'anglicana',
      'católica',
      'catolica',
      'ortodoxa',
      'apologética',
      'apologetica',
      'apologista',
      'apologia',
      'apologético',
      'apologetico',
      // Filosofia e Razão
      'filosofia',
      'filosófico',
      'filosofico',
      'metafísica',
      'metafisica',
      'epistemologia',
      'ontologia',
      'ética',
      'etica',
      'moral',
      'razão',
      'razao',
      'lógica',
      'logica',
      'existencialismo',
      'existencial',
      'platão',
      'platao',
      'aristóteles',
      'aristoteles',
      'descartes',
      'kant',
      'hegel',
      'nietzsche',
      'sartre',
      'kierkegaard',
      'ciência',
      'ciencia',
      'cosmovisão',
      'cosmovisao',
      'ateísmo',
      'ateismo',
      'agnosticismo',
      'teísmo',
      'teismo',
      'deísmo',
      'deismo',
      'panteísmo',
      'panteismo',
      'livre-arbítrio',
      'livre arbitrio',
      'determinismo',
      'vontade',
    ];

    const inDomainExtra = [
      'dom',
      'dons',
      'carisma',
      'apostol',
      'cessacion',
      'continuism',
      'pentecost',
      'lingua',
      'glossolalia',
      'profecia',
      'milagre',
      'escatolog',
      'soteriolog',
      'cristolog',
      'pneumatolog',
      'eclesiolog',
      'hermeneutic',
      'homiletic',
      'patristic',
      'reforma',
      'puritan',
      'concilio',
      'credo',
      'catecismo',
      'confissao',
      'sacramento',
      'batismo',
      'ceia',
      'expiacao',
      'justificacao',
      'santificacao',
      'regeneracao',
      'arrependimento',
      'aliança',
      'alianca',
      'messias',
      'ressurreicao',
      'encarnacao',
      'canon',
      'canonic',
      'manuscrito',
      'septuaginta',
      'vulgata',
      'targum',
      'talmude',
      'midrash',
      'qumran',
      'parabola',
      'salmo',
      'evangelist',
      'discipul',
      'ministerio',
      'pregacao',
      'sermao',
      'oracao',
      'jejum',
      'idolatria',
      'pecado',
      'salvacao',
    ];

    const hasInDomainKeyword = [...inDomainKeywords, ...inDomainExtra].some(
      (keyword) => q.includes(semAcento(keyword)),
    );

    // 3. Padrões de referências bíblicas (ex: "Jo 3:16", "Genesis 1:1")
    const bibleRefRegex =
      /\b([1-3]\s+)?[A-Za-záéíóúçêôãõü]{2,15}\s+\d+([\s:,]+\d+)?\b/i;
    const hasBibleRef = bibleRefRegex.test(q);

    if (hasInDomainKeyword || hasBibleRef) {
      return true;
    }

    // 4. Indicadores de perguntas gerais de caráter reflexivo/filosófico
    const generalQuestionIndicators = [
      'quem',
      'como',
      'onde',
      'quando',
      'porque',
      'por que',
      'qual',
      'quais',
      'o que',
      'explique',
      'responda',
      'continue',
      'comente',
      'fale',
      'diga',
      'descreva',
      'prossiga',
    ];
    const isGeneralQuestion = generalQuestionIndicators.some((ind) =>
      q.includes(semAcento(ind)),
    );

    if (isGeneralQuestion) {
      return true;
    }

    return false;
  }
}
