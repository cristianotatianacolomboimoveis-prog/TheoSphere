#!/bin/bash

# TheoSphere Render Deployment Script
# Usage: ./scripts/deploy-render.sh <RENDER_API_KEY> <SERVICE_ID>

API_KEY=$1
SERVICE_ID=$2

if [ -z "$API_KEY" ] || [ -z "$SERVICE_ID" ]; then
    echo "Usage: $0 <RENDER_API_KEY> <SERVICE_ID>"
    exit 1
fi

echo "Triggering deployment for service $SERVICE_ID..."

RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Accept: application/json" \
  "https://api.render.com/v1/services/$SERVICE_ID/deploys")

if [[ $RESPONSE == *"\"id\":"* ]]; then
    DEPLOY_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    echo "Successfully triggered deployment! Deploy ID: $DEPLOY_ID"
else
    echo "Failed to trigger deployment."
    echo "Response: $RESPONSE"
    exit 1
fi
