import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-service")

app = FastAPI(
    title="TheoSphere AI & GIS Service",
    version="1.0.0",
    description="Serviço de suporte em Python para operações espaciais, linguísticas e pipelines de RAG avançados."
)

# Enable CORS for internal services
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas
class SpatialOperationRequest(BaseModel):
    coordinates: List[List[float]]
    operation: str
    params: Dict[str, Any] = {}

class RAGQueryRequest(BaseModel):
    query: str
    context_documents: List[str] = []

@app.get("/health", tags=["Monitoring"])
def health_check():
    logger.info("Health check endpoint hit")
    return {
        "status": "healthy",
        "service": "ai-service",
        "version": "1.0.0"
    }

@app.post("/api/v1/spatial/analyze", tags=["GIS"])
def analyze_spatial(data: SpatialOperationRequest):
    logger.info(f"Processing spatial operation '{data.operation}' on {len(data.coordinates)} points")
    try:
        if not data.coordinates:
            raise HTTPException(status_code=400, detail="Coordinates list cannot be empty")

        if data.operation == "centroid":
            lons = [c[0] for c in data.coordinates]
            lats = [c[1] for c in data.coordinates]
            centroid = [sum(lons) / len(lons), sum(lats) / len(lats)]
            return {
                "success": True,
                "operation": data.operation,
                "result": {"centroid": centroid}
            }
        
        elif data.operation == "bounding_box":
            lons = [c[0] for c in data.coordinates]
            lats = [c[1] for c in data.coordinates]
            min_lon, max_lon = min(lons), max(lons)
            min_lat, max_lat = min(lats), max(lats)
            return {
                "success": True,
                "operation": data.operation,
                "result": {
                    "min_lon": min_lon,
                    "min_lat": min_lat,
                    "max_lon": max_lon,
                    "max_lat": max_lat
                }
            }

        raise HTTPException(
            status_code=400, 
            detail=f"Spatial operation '{data.operation}' is not supported yet."
        )

    except Exception as e:
        logger.error(f"Error during spatial operation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/ai/rag", tags=["AI"])
def process_rag(data: RAGQueryRequest):
    logger.info(f"Received RAG request: query='{data.query}'")
    try:
        # Mock responsive logic representing future complex python RAG processing
        response_msg = f"Python AI Engine response for query: '{data.query}' utilizing {len(data.context_documents)} docs."
        return {
            "success": True,
            "answer": response_msg,
            "sources_used": len(data.context_documents)
        }
    except Exception as e:
        logger.error(f"Error processing RAG query: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
