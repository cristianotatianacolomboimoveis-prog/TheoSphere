#!/bin/bash
set -e

echo "🌍 Iniciando configuração do Valhalla 4D para TheoSphere..."

# Criar diretório para os dados do mapa
mkdir -p ./valhalla_data

# URL do extract do OpenStreetMap (Usando Israel/Palestina como base teológica, 
# mas pode ser trocado para Geofabrik/South America/Brazil se for para trânsito moderno)
OSM_URL="https://download.geofabrik.de/asia/israel-and-palestine-latest.osm.pbf"
FILE_NAME="israel-and-palestine-latest.osm.pbf"

echo "📥 Baixando mapa OSM ($FILE_NAME)..."
if [ ! -f "./valhalla_data/$FILE_NAME" ]; then
    curl -L $OSM_URL -o "./valhalla_data/$FILE_NAME"
    echo "✅ Download concluído!"
else
    echo "⚡ Arquivo já existe, pulando download."
fi

# Avisando sobre CSVs de trânsito
echo "🚗 O motor de trânsito histórico está ativado. Para adicionar dados do UTD19,
coloque o arquivo traffic.tar na pasta valhalla_data/ antes de subir o docker."

echo "🚀 Subindo motor Valhalla (Na primeira execução ele vai compilar o mapa, isso pode levar alguns minutos)..."
docker compose -f docker-compose.valhalla.yml up -d

echo "
======================================================
✅ Valhalla configurado e iniciando na porta 8002!
Acompanhe os logs de construção com: 
docker logs -f theosphere-valhalla
======================================================"
