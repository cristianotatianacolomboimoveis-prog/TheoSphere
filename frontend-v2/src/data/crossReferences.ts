export interface CrossReference {
  from: string;
  to: string[];
  type: "parallel" | "quotation" | "allusion" | "thematic";
}

export const CROSS_REFERENCES: CrossReference[] = [
  // ── Genesis ──
  { from: "Genesis 1:1", to: ["John 1:1", "Hebrews 11:3", "Psalm 33:6", "Colossians 1:16"], type: "thematic" },
  { from: "Genesis 1:26-27", to: ["Genesis 5:1", "1 Corinthians 11:7", "Colossians 3:10", "James 3:9"], type: "thematic" },
  { from: "Genesis 3:15", to: ["Romans 16:20", "Galatians 4:4", "Revelation 12:9", "1 John 3:8"], type: "allusion" },
  { from: "Genesis 12:1-3", to: ["Acts 7:2-3", "Hebrews 11:8", "Galatians 3:8", "Genesis 22:18"], type: "quotation" },
  { from: "Genesis 15:6", to: ["Romans 4:3", "Galatians 3:6", "James 2:23", "Hebrews 11:8"], type: "quotation" },
  { from: "Genesis 22:1-18", to: ["Hebrews 11:17-19", "James 2:21", "Romans 8:32", "John 3:16"], type: "allusion" },
  // ── Exodus ──
  { from: "Exodus 3:14", to: ["John 8:58", "Revelation 1:8", "Isaiah 41:4", "John 6:35"], type: "thematic" },
  { from: "Exodus 12:1-14", to: ["1 Corinthians 5:7", "John 1:29", "1 Peter 1:19", "Revelation 5:6"], type: "allusion" },
  { from: "Exodus 20:1-17", to: ["Deuteronomy 5:6-21", "Matthew 5:17-48", "Romans 13:9", "Mark 10:19"], type: "parallel" },
  // ── Psalms ──
  { from: "Psalm 22:1", to: ["Matthew 27:46", "Mark 15:34"], type: "quotation" },
  { from: "Psalm 23:1", to: ["John 10:11", "Hebrews 13:20", "1 Peter 2:25", "Revelation 7:17"], type: "thematic" },
  { from: "Psalm 110:1", to: ["Matthew 22:44", "Acts 2:34-35", "Hebrews 1:13", "1 Corinthians 15:25"], type: "quotation" },
  { from: "Psalm 51:1-4", to: ["Romans 3:4", "2 Samuel 12:13", "1 John 1:9", "Isaiah 1:18"], type: "thematic" },
  // ── Isaiah ──
  { from: "Isaiah 7:14", to: ["Matthew 1:23", "Luke 1:31"], type: "quotation" },
  { from: "Isaiah 9:6", to: ["Luke 2:11", "John 1:1", "Titus 2:13", "Revelation 19:16"], type: "thematic" },
  { from: "Isaiah 40:3", to: ["Matthew 3:3", "Mark 1:3", "Luke 3:4", "John 1:23"], type: "quotation" },
  { from: "Isaiah 53:1-12", to: ["1 Peter 2:24", "Acts 8:32-35", "Romans 4:25", "Matthew 8:17"], type: "quotation" },
  { from: "Isaiah 61:1-2", to: ["Luke 4:18-19", "Matthew 11:5", "Acts 10:38"], type: "quotation" },
  // ── Jeremiah ──
  { from: "Jeremiah 31:31-34", to: ["Hebrews 8:8-12", "Hebrews 10:16-17", "Luke 22:20", "2 Corinthians 3:6"], type: "quotation" },
  // ── Daniel ──
  { from: "Daniel 7:13-14", to: ["Matthew 24:30", "Mark 14:62", "Revelation 1:7", "Acts 1:9"], type: "allusion" },
  // ── Matthew ──
  { from: "Matthew 5:3-12", to: ["Luke 6:20-23", "Psalm 1:1", "Isaiah 61:1-3", "Revelation 21:4"], type: "parallel" },
  { from: "Matthew 16:16", to: ["John 6:69", "John 11:27", "Mark 8:29", "Luke 9:20"], type: "parallel" },
  { from: "Matthew 28:18-20", to: ["Mark 16:15", "Luke 24:47", "Acts 1:8", "John 20:21"], type: "parallel" },
  // ── John ──
  { from: "John 1:1", to: ["Genesis 1:1", "1 John 1:1", "Revelation 19:13", "Hebrews 1:2"], type: "thematic" },
  { from: "John 1:14", to: ["1 Timothy 3:16", "Colossians 2:9", "Philippians 2:6-8", "Hebrews 2:14"], type: "thematic" },
  { from: "John 3:16", to: ["Romans 5:8", "1 John 4:9", "Ephesians 2:4-5", "Romans 8:32"], type: "thematic" },
  { from: "John 14:6", to: ["Acts 4:12", "1 Timothy 2:5", "Hebrews 10:19-20", "John 10:9"], type: "thematic" },
  { from: "John 10:10", to: ["John 6:35", "John 8:12", "Romans 6:23", "1 John 5:12"], type: "thematic" },
  // ── Romans ──
  { from: "Romans 1:16-17", to: ["1 Corinthians 1:18", "Habakkuk 2:4", "Galatians 3:11", "Mark 8:38"], type: "thematic" },
  { from: "Romans 3:23", to: ["1 Kings 8:46", "Ecclesiastes 7:20", "1 John 1:8", "Psalm 14:3"], type: "thematic" },
  { from: "Romans 5:1", to: ["Ephesians 2:14", "Colossians 1:20", "John 14:27", "Isaiah 32:17"], type: "thematic" },
  { from: "Romans 5:8", to: ["John 3:16", "1 John 4:10", "Ephesians 2:4-5", "Titus 3:4-5"], type: "thematic" },
  { from: "Romans 6:23", to: ["Genesis 2:17", "James 1:15", "John 3:16", "Ephesians 2:8"], type: "thematic" },
  { from: "Romans 8:28", to: ["Ephesians 1:11", "Jeremiah 29:11", "Genesis 50:20", "2 Corinthians 4:17"], type: "thematic" },
  { from: "Romans 8:38-39", to: ["John 10:28-29", "Ephesians 3:18-19", "2 Timothy 1:12", "Jude 1:24"], type: "thematic" },
  { from: "Romans 12:1-2", to: ["Ephesians 4:22-24", "Colossians 3:2", "1 Peter 1:14-16", "2 Corinthians 3:18"], type: "thematic" },
  // ── Ephesians ──
  { from: "Ephesians 2:8-9", to: ["Romans 3:24", "Titus 3:5", "2 Timothy 1:9", "Galatians 2:16"], type: "thematic" },
  { from: "Ephesians 6:10-18", to: ["Romans 13:12", "2 Corinthians 10:4", "1 Thessalonians 5:8", "1 Peter 5:8-9"], type: "thematic" },
  // ── Philippians ──
  { from: "Philippians 2:5-11", to: ["John 1:1-14", "Colossians 1:15-20", "Hebrews 1:3", "2 Corinthians 8:9"], type: "thematic" },
  { from: "Philippians 4:13", to: ["2 Corinthians 12:9-10", "John 15:5", "Isaiah 40:31", "2 Timothy 4:17"], type: "thematic" },
  // ── Hebrews ──
  { from: "Hebrews 4:12", to: ["Ephesians 6:17", "Revelation 1:16", "Isaiah 55:11", "Jeremiah 23:29"], type: "thematic" },
  { from: "Hebrews 11:1", to: ["Romans 8:24", "2 Corinthians 5:7", "2 Corinthians 4:18", "1 Peter 1:8"], type: "thematic" },
  // ── 1 John ──
  { from: "1 John 1:9", to: ["Psalm 32:5", "Proverbs 28:13", "Psalm 51:1-4", "2 Chronicles 7:14"], type: "thematic" },
  // ── Revelation ──
  { from: "Revelation 3:20", to: ["John 14:23", "Song of Solomon 5:2", "Luke 12:36", "James 5:9"], type: "allusion" },
  { from: "Revelation 21:1-4", to: ["Isaiah 65:17", "2 Peter 3:13", "Isaiah 25:8", "Isaiah 35:10"], type: "thematic" },
  { from: "Revelation 22:13", to: ["Isaiah 44:6", "Revelation 1:8", "Isaiah 41:4", "Isaiah 48:12"], type: "thematic" },
];

export function getCrossReferences(reference: string): CrossReference | undefined {
  return CROSS_REFERENCES.find(cr => cr.from.toLowerCase() === reference.toLowerCase());
}

export function findRelatedReferences(reference: string): string[] {
  const related: string[] = [];
  for (const cr of CROSS_REFERENCES) {
    if (cr.from.toLowerCase() === reference.toLowerCase()) {
      related.push(...cr.to);
    }
    if (cr.to.some(t => t.toLowerCase() === reference.toLowerCase())) {
      related.push(cr.from);
    }
  }
  return [...new Set(related)];
}
