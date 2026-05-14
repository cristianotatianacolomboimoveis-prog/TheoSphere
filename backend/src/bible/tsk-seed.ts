/**
 * TSK seed corpus — hand-picked cross-references for the most quoted verses.
 *
 * Why this exists:
 *   The full TSK dataset (openbible.info CSV) is ~340k rows and ~30 MB —
 *   too large to commit. This file ships ~30 high-value sources covering
 *   the verses most commonly opened by users (justification, gospel
 *   summaries, theological landmarks). It guarantees the UI has data on
 *   day one; the full dataset comes from running `npm run tsk:import`.
 *
 *   Each `target` list is curated, NOT exhaustive — purposefully limited
 *   to ~6-12 strong cross-refs per source so the popover stays readable
 *   without paging. The full corpus override these with the canonical
 *   TSK ranks once imported.
 *
 * Format:
 *   Source ref is canonical English short form ("John 3:16") to match
 *   `useTheoStore.activeBook` which stores English book names. The
 *   frontend translates to pt-BR for display.
 *
 * Public domain: TSK was published 1834 (R.A. Torrey). Our curation
 * notes are CC0.
 */

export interface TSKSeedEntry {
  source: string;
  targets: string[];
}

export const TSK_SEED: TSKSeedEntry[] = [
  // ─── Gospel landmarks ─────────────────────────────────────────────────
  {
    source: 'John 3:16',
    targets: [
      'John 1:14',
      'John 3:15',
      'John 3:17',
      'John 3:36',
      'John 5:24',
      'John 6:40',
      'John 17:3',
      'Romans 5:8',
      'Romans 8:32',
      '1 John 4:9',
      '1 John 4:10',
      '1 John 5:11',
    ],
  },
  {
    source: 'John 1:1',
    targets: [
      'Genesis 1:1',
      'Proverbs 8:22',
      'John 1:14',
      'John 17:5',
      'Philippians 2:6',
      'Colossians 1:15',
      'Hebrews 1:8',
      'Revelation 19:13',
      '1 John 1:1',
    ],
  },
  {
    source: 'John 1:14',
    targets: [
      'Matthew 1:23',
      'Luke 1:35',
      'John 1:1',
      'John 14:9',
      'Romans 8:3',
      'Galatians 4:4',
      'Philippians 2:7',
      'Colossians 2:9',
      '1 Timothy 3:16',
      'Hebrews 2:14',
    ],
  },
  {
    source: 'Romans 3:23',
    targets: [
      '1 Kings 8:46',
      'Psalms 14:3',
      'Psalms 51:5',
      'Ecclesiastes 7:20',
      'Isaiah 53:6',
      'Romans 3:9',
      'Romans 5:12',
      'Galatians 3:22',
      '1 John 1:8',
      '1 John 1:10',
    ],
  },
  {
    source: 'Romans 5:8',
    targets: [
      'John 3:16',
      'John 15:13',
      'Romans 4:25',
      'Romans 5:6',
      'Romans 5:10',
      'Ephesians 2:4',
      '1 Peter 3:18',
      '1 John 3:16',
      '1 John 4:10',
    ],
  },
  {
    source: 'Romans 6:23',
    targets: [
      'Genesis 2:17',
      'Ezekiel 18:4',
      'John 3:36',
      'John 10:28',
      'Romans 5:12',
      'Romans 5:21',
      'Galatians 6:7',
      'James 1:15',
      '1 John 5:11',
    ],
  },
  {
    source: 'Romans 8:28',
    targets: [
      'Genesis 50:20',
      'Psalms 25:10',
      'Psalms 73:24',
      'Jeremiah 24:5',
      'Romans 8:30',
      'Romans 9:11',
      'Ephesians 1:11',
      'Hebrews 12:6',
      '2 Peter 1:10',
    ],
  },
  {
    source: 'Romans 8:38',
    targets: [
      'Psalms 23:4',
      'Isaiah 25:8',
      'John 10:28',
      'Romans 8:35',
      'Romans 8:39',
      '1 Corinthians 3:22',
      '1 Corinthians 15:55',
      '2 Timothy 1:12',
      'Hebrews 2:14',
    ],
  },
  {
    source: 'Romans 10:9',
    targets: [
      'Matthew 10:32',
      'Luke 12:8',
      'John 6:40',
      'Acts 8:37',
      'Acts 16:31',
      'Romans 1:4',
      'Romans 4:24',
      '1 Corinthians 12:3',
      '1 John 4:2',
      '1 John 4:15',
    ],
  },

  // ─── Justification / faith ─────────────────────────────────────────────
  {
    source: 'Ephesians 2:8',
    targets: [
      'Romans 3:24',
      'Romans 4:16',
      'Romans 5:1',
      'Romans 6:23',
      'Romans 11:6',
      '2 Corinthians 9:15',
      'Galatians 2:16',
      'Ephesians 2:5',
      'Titus 2:11',
      'Titus 3:5',
    ],
  },
  {
    source: 'Ephesians 2:9',
    targets: [
      'Romans 3:20',
      'Romans 3:27',
      'Romans 4:2',
      'Romans 9:11',
      '1 Corinthians 1:29',
      '2 Timothy 1:9',
      'Titus 3:5',
    ],
  },
  {
    source: 'Galatians 2:20',
    targets: [
      'Romans 6:6',
      'Romans 8:37',
      '2 Corinthians 5:14',
      '2 Corinthians 5:15',
      'Galatians 5:24',
      'Galatians 6:14',
      'Ephesians 5:2',
      'Colossians 3:3',
      'Titus 2:14',
    ],
  },

  // ─── Old Testament cornerstones ────────────────────────────────────────
  {
    source: 'Genesis 1:1',
    targets: [
      'Job 38:4',
      'Psalms 33:6',
      'Psalms 89:11',
      'Psalms 102:25',
      'Psalms 136:5',
      'Proverbs 8:22',
      'Isaiah 40:21',
      'Isaiah 45:18',
      'John 1:1',
      'John 1:3',
      'Acts 17:24',
      'Colossians 1:16',
      'Hebrews 1:10',
      'Hebrews 11:3',
      'Revelation 4:11',
      'Revelation 10:6',
    ],
  },
  {
    source: 'Genesis 3:15',
    targets: [
      'Matthew 1:23',
      'Luke 1:31',
      'John 12:31',
      'Romans 16:20',
      'Galatians 4:4',
      'Colossians 2:15',
      'Hebrews 2:14',
      '1 John 3:8',
      'Revelation 12:7',
      'Revelation 12:17',
    ],
  },
  {
    source: 'Isaiah 53:5',
    targets: [
      'Isaiah 53:6',
      'Romans 4:25',
      'Romans 5:8',
      '1 Corinthians 15:3',
      '2 Corinthians 5:21',
      'Galatians 3:13',
      'Ephesians 2:13',
      'Colossians 1:20',
      '1 Peter 2:24',
      '1 Peter 3:18',
    ],
  },
  {
    source: 'Isaiah 53:6',
    targets: [
      'Psalms 119:176',
      'Isaiah 53:5',
      'Matthew 9:36',
      'Luke 15:4',
      'Romans 3:12',
      'Romans 5:6',
      '1 Peter 2:25',
    ],
  },
  {
    source: 'Psalms 23:1',
    targets: [
      'Genesis 48:15',
      'Psalms 80:1',
      'Isaiah 40:11',
      'Ezekiel 34:11',
      'Ezekiel 34:23',
      'John 10:11',
      'John 10:14',
      'Hebrews 13:20',
      '1 Peter 2:25',
      '1 Peter 5:4',
      'Revelation 7:17',
    ],
  },
  {
    source: 'Proverbs 3:5',
    targets: [
      'Psalms 37:3',
      'Psalms 62:8',
      'Psalms 125:1',
      'Isaiah 26:3',
      'Jeremiah 17:7',
      'Romans 4:18',
    ],
  },
  {
    source: 'Jeremiah 29:11',
    targets: [
      'Numbers 23:19',
      'Psalms 40:5',
      'Isaiah 55:8',
      'Lamentations 3:25',
      'Romans 8:28',
      'Ephesians 3:20',
    ],
  },

  // ─── Sermon-on-the-Mount staples ──────────────────────────────────────
  {
    source: 'Matthew 5:3',
    targets: [
      'Psalms 34:18',
      'Psalms 51:17',
      'Isaiah 57:15',
      'Isaiah 61:1',
      'Isaiah 66:2',
      'Luke 6:20',
      'Luke 18:13',
      'James 2:5',
    ],
  },
  {
    source: 'Matthew 6:33',
    targets: [
      '1 Kings 3:11',
      'Psalms 27:4',
      'Psalms 37:4',
      'Proverbs 8:17',
      'Luke 12:31',
      'Romans 14:17',
      '1 Timothy 6:6',
    ],
  },
  {
    source: 'Matthew 11:28',
    targets: [
      'Isaiah 11:10',
      'Isaiah 45:22',
      'Jeremiah 6:16',
      'John 6:37',
      'John 7:37',
      'Hebrews 4:1',
      'Hebrews 4:3',
    ],
  },

  // ─── Faith and works ──────────────────────────────────────────────────
  {
    source: 'Hebrews 11:1',
    targets: [
      'Romans 8:24',
      '2 Corinthians 4:18',
      '2 Corinthians 5:7',
      'Hebrews 3:14',
      'Hebrews 6:11',
      'Hebrews 11:7',
      '1 Peter 1:8',
    ],
  },
  {
    source: 'James 2:17',
    targets: [
      'Matthew 7:21',
      'Matthew 25:42',
      'James 2:14',
      'James 2:20',
      'James 2:24',
      '1 John 3:17',
    ],
  },

  // ─── Christology cornerstone ──────────────────────────────────────────
  {
    source: 'Philippians 2:6',
    targets: [
      'John 1:1',
      'John 5:18',
      'John 10:33',
      'John 17:5',
      '2 Corinthians 4:4',
      'Colossians 1:15',
      'Colossians 2:9',
      'Hebrews 1:3',
    ],
  },
  {
    source: 'Philippians 2:7',
    targets: [
      'Isaiah 53:2',
      'Matthew 20:28',
      'Mark 10:45',
      'John 1:14',
      'Romans 8:3',
      'Galatians 4:4',
      'Hebrews 2:14',
      'Hebrews 2:17',
    ],
  },
  {
    source: 'Colossians 1:15',
    targets: [
      'John 1:18',
      'John 14:9',
      'Romans 8:29',
      '2 Corinthians 4:4',
      'Philippians 2:6',
      'Hebrews 1:3',
      'Revelation 3:14',
    ],
  },
  {
    source: 'Colossians 1:16',
    targets: [
      'Genesis 1:1',
      'Psalms 33:6',
      'Proverbs 8:22',
      'John 1:3',
      'John 1:10',
      'Romans 11:36',
      '1 Corinthians 8:6',
      'Ephesians 3:9',
      'Hebrews 1:2',
      'Revelation 4:11',
    ],
  },

  // ─── Revelation / eschatology landmarks ───────────────────────────────
  {
    source: 'Revelation 21:4',
    targets: [
      'Isaiah 25:8',
      'Isaiah 35:10',
      'Isaiah 65:19',
      'Jeremiah 31:16',
      '1 Corinthians 15:26',
      '1 Corinthians 15:54',
      'Revelation 7:17',
      'Revelation 20:14',
    ],
  },
  {
    source: 'Revelation 22:13',
    targets: [
      'Isaiah 41:4',
      'Isaiah 44:6',
      'Isaiah 48:12',
      'Revelation 1:8',
      'Revelation 1:17',
      'Revelation 2:8',
      'Revelation 21:6',
    ],
  },
];
