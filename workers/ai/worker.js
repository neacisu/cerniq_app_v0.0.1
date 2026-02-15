const http = require("http");

// Minimal placeholder worker that exposes /health.
const status = {
  service: "cerniq-worker-ai",
  status: "idle",
  placeholder: true,
  queues: ["ai-scoring", "negotiation-suggestions", "llm-processing"],
  processedJobs: 0,
};

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ...status, timestamp: new Date().toISOString() }));
    return;
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: "AI Worker - Use /health for status" }));
});

server.listen(3000, "0.0.0.0", () => {
  console.log("AI Worker placeholder running on port 3000");
});

setInterval(() => {
  status.processedJobs += 0;
  console.log(`AI Worker heartbeat - Status: ${status.status} - Jobs: ${status.processedJobs}`);
}, 30000);

