"""Graph Service - Cerniq.app"""
import os
from fastapi import FastAPI

app = FastAPI(title="Graph Service", version="0.0.1")
PORT = int(os.getenv("PORT", "64077"))

@app.get("/health")
async def health():
    return {"status": "ok", "service": "python-graph"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
