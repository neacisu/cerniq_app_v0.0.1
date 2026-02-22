"""MCP Service - Cerniq.app"""
import os
from fastapi import FastAPI

app = FastAPI(title="MCP Service", version="0.0.1")
PORT = int(os.getenv("PORT", "64078"))

@app.get("/health")
async def health():
    return {"status": "ok", "service": "python-mcp"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
