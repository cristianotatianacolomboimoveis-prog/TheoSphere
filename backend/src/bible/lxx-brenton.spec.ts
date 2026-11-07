import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { hasLemmatizedDefect } from '../../scripts/ingest-lxx-brenton';

interface LxxVerse {
  id: string;
  book: string;
  bookId: number;
  chapter: number;
  verse: number;
  text: string;
  translation: string;
}

interface LxxDataset {
  source: string;
  edition: string;
  license: string;
  totalSourceLines: number;
  totalSubVersesMerged: number;
  totalVerses: number;
  bookStats: Array<{
    bookId: number;
    book: string;
    sourceLines: number;
    mergedVerses: number;
    subVersesMerged: number;
  }>;
  verses: LxxVerse[];
}

describe('Septuaginta Grega (LXX Brenton — Domínio Público)', () => {
  let dataset: LxxDataset;
  const verseIndex = new Map<string, LxxVerse>();

  beforeAll(() => {
    const filePath = path.join(
      __dirname,
      '../../prisma/data/lxx-brenton-verses.json.gz',
    );
    const raw = fs.readFileSync(filePath);
    const json = zlib.gunzipSync(raw).toString('utf-8');
    dataset = JSON.parse(json) as LxxDataset;
    for (const v of dataset.verses) {
      verseIndex.set(`${v.bookId}:${v.chapter}:${v.verse}`, v);
    }
  });

  it('deve conter os 39 livros canônicos do AT com soma exata de linhas e sub-versos mesclados', () => {
    expect(dataset.license).toBe('Public Domain');
    expect(dataset.bookStats).toHaveLength(39);
    expect(dataset.totalSourceLines).toBe(23228);
    expect(dataset.totalSubVersesMerged).toBe(286);
    expect(dataset.totalVerses).toBe(22942);
    expect(dataset.verses).toHaveLength(22942);

    for (const stat of dataset.bookStats) {
      expect(stat.sourceLines - stat.subVersesMerged).toBe(stat.mergedVerses);
    }
  });

  it('deve apresentar texto grego flexionado real em Gn 1:1, Sl 9:2, Sl 21:2 (KJV 22:1) e Is 7:14', () => {
    const gen1_1 = verseIndex.get('1:1:1');
    expect(gen1_1?.text).toBe(
      'ἘΝ ἀρχῇ ἐποίησεν ὁ Θεὸς τὸν οὐρανὸν καὶ τὴν γῆν.',
    );

    const ps9_2 = verseIndex.get('19:9:2');
    expect(ps9_2?.text).toBe(
      'Ἐξομολογήσομαι σοι Κύριε ἐν ὅλῃ καρδίᾳ μου, διηγήσομαι πάντα τὰ θαυμάσιά σου.',
    );

    const ps21_2 = verseIndex.get('19:21:2');
    expect(ps21_2?.text).toBe(
      'Ὁ Θεός ὁ Θεός μου, πρόσχες μοι, ἱνατί ἐγκατέλιπές με; μακρὰν ἀπὸ τῆς σωτηρίας μου οἱ λόγοι τῶν παραπτωμάτων μου.',
    );

    const isa7_14 = verseIndex.get('23:7:14');
    expect(isa7_14?.text).toBe(
      'Διατοῦτο δώσει Κύριος αὐτὸς ὑμῖν σημεῖον· ἰδοὺ ἡ παρθένος ἐν γαστρὶ λήψεται, καὶ τέξεται υἱὸν, καὶ καλέσεις τὸ ὄνομα αὐτοῦ Ἐμμανουήλ.',
    );
  });

  it('não deve conter nenhuma junção quebrada de lema (ex.: ἐκὁ ou διαἡ) nos 22.942 versículos', () => {
    const defective = dataset.verses.filter((v) => hasLemmatizedDefect(v.text));
    expect(defective).toHaveLength(0);
  });

  it('deve detectar e falhar quando exposto a texto lematizado ou junções quebradas da bolls.life (caminho de falha)', () => {
    expect(hasLemmatizedDefect('ἐκὁμολογέω σύ κύριος ἐν ὅλος καρδία ἐγώ')).toBe(
      true,
    );
    expect(hasLemmatizedDefect('διαἡ ἁμαρτία')).toBe(true);
    expect(hasLemmatizedDefect('καθὁράω')).toBe(true);
    expect(
      hasLemmatizedDefect(
        'Ἐξομολογήσομαι σοι Κύριε ἐν ὅλῃ καρδίᾳ μου, διηγήσομαι πάντα τὰ θαυμάσιά σου.',
      ),
    ).toBe(false);
  });
});
