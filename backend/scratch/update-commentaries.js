const fs = require('fs');
const path = '/Users/cristianocolombo/Downloads/TheoSphere/backend/src/rag/classic-commentaries.ts';
let content = fs.readFileSync(path, 'utf8');

const replacements = {
  'Genesis': 'Gênesis',
  'Exodus': 'Êxodo',
  'Leviticus': 'Levítico',
  'Numbers': 'Números',
  'Deuteronomy': 'Deuteronômio',
  'Joshua': 'Josué',
  'Judges': 'Juízes',
  'Ruth': 'Rute',
  'Job': 'Jó',
  'Psalms': 'Salmos',
  'Proverbs': 'Provérbios',
  'Ecclesiastes': 'Eclesiastes',
  'Song of Solomon': 'Cantares',
  'Isaiah': 'Isaías',
  'Jeremiah': 'Jeremias',
  'Lamentations': 'Lamentações',
  'Ezekiel': 'Ezequiel',
  'Daniel': 'Daniel',
  'Hosea': 'Oséias',
  'Joel': 'Joel',
  'Amos': 'Amós',
  'Obadiah': 'Obadias',
  'Jonah': 'Jonas',
  'Micah': 'Miquéias',
  'Nahum': 'Naum',
  'Habakkuk': 'Habacuque',
  'Zephaniah': 'Sofonias',
  'Haggai': 'Ageu',
  'Zechariah': 'Zacarias',
  'Malachi': 'Malaquias',
  'Matthew': 'Mateus',
  'Mark': 'Marcos',
  'Luke': 'Lucas',
  'John': 'João',
  'Acts': 'Atos',
  'Romans': 'Romanos',
  '1 Corinthians': '1 Coríntios',
  '2 Corinthians': '2 Coríntios',
  'Galatians': 'Gálatas',
  'Ephesians': 'Efésios',
  'Philippians': 'Filipenses',
  'Colossians': 'Colossenses',
  '1 Thessalonians': '1 Tessalonicenses',
  '2 Thessalonians': '2 Tessalonicenses',
  '1 Timothy': '1 Timóteo',
  '2 Timothy': '2 Timóteo',
  'Titus': 'Tito',
  'Philemon': 'Filemom',
  'Hebrews': 'Hebreus',
  'James': 'Tiago',
  '1 Peter': '1 Pedro',
  '2 Peter': '2 Pedro',
  '1 John': '1 João',
  '2 John': '2 João',
  '3 John': '3 João',
  'Jude': 'Judas',
  'Revelation': 'Apocalipse'
};

for (const [en, pt] of Object.entries(replacements)) {
  // Replace in reference field: reference: 'John 3:16' -> reference: 'João 3:16'
  const regex = new RegExp(`reference: '${en} `, 'g');
  content = content.replace(regex, `reference: '${pt} `);
  
  // Also replace in works if applicable (already mostly done but to be safe)
  const workRegex = new RegExp(`work: 'Comentários sobre o ${en}`, 'g');
  content = content.replace(workRegex, `work: 'Comentários sobre o ${pt}`);
}

fs.writeFileSync(path, content);
console.log('Successfully updated classic-commentaries.ts');
