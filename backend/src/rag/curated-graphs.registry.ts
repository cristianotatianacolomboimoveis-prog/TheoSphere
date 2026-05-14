export const CURATED_GRAPHS: Record<string, any> = {
  'Êxodo': {
    nodes: [
      { id: 'Êxodo', group: 1, val: 25, color: '#66fcf1', description: 'O Livro da Redenção e Aliança' },
      { id: 'A Aflição (Egito)', group: 2, val: 15, color: '#e74c3c', description: 'Escravidão e clamor sob o Faraó' },
      { id: 'A Saída (Milagres)', group: 3, val: 15, color: '#3498db', description: 'Libertação pelo braço forte de Deus' },
      { id: 'A Aliança (Sinai)', group: 4, val: 15, color: '#f1c40f', description: 'Recebimento da Lei e Presença' },
      { id: '10 Pragas', group: 2, val: 8, color: '#c0392b', description: 'Juízo sobre os deuses do Egito' },
      { id: 'Moisés', group: 2, val: 10, color: '#ecf0f1', description: 'O libertador escolhido' },
      { id: 'Mar Vermelho', group: 3, val: 10, color: '#2980b9', description: 'O maior livramento' },
      { id: 'Coluna de Fogo', group: 3, val: 8, color: '#e67e22', description: 'Direção divina contínua' },
      { id: 'Dez Mandamentos', group: 4, val: 10, color: '#f39c12', description: 'O padrão moral da Aliança' },
      { id: 'Tabernáculo', group: 4, val: 10, color: '#d35400', description: 'A habitação de Deus no meio do povo' },
      { id: 'Cordeiro Pascal', group: 5, val: 12, color: '#9b59b6', description: 'O substituto que evita a morte' }
    ],
    links: [
      { source: 'Êxodo', target: 'A Aflição (Egito)' },
      { source: 'Êxodo', target: 'A Saída (Milagres)' },
      { source: 'Êxodo', target: 'A Aliança (Sinai)' },
      { source: 'A Aflição (Egito)', target: 'Moisés' },
      { source: 'A Aflição (Egito)', target: '10 Pragas' },
      { source: '10 Pragas', target: 'Cordeiro Pascal' },
      { source: 'A Saída (Milagres)', target: 'Mar Vermelho' },
      { source: 'A Saída (Milagres)', target: 'Coluna de Fogo' },
      { source: 'A Aliança (Sinai)', target: 'Dez Mandamentos' },
      { source: 'A Aliança (Sinai)', target: 'Tabernáculo' },
      { source: 'A Aflição (Egito)', target: 'A Saída (Milagres)' },
      { source: 'A Saída (Milagres)', target: 'A Aliança (Sinai)' }
    ]
  }
};
