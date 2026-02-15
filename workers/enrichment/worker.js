const http = require("http");

const status = {
  service: "cerniq-worker-enrichment",
  status: "idle",
  placeholder: true,
  queues: ["company-enrichment", "contact-verification", "data-cleansing"],
  processedJobs: 0,
};

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ...status, timestamp: new Date().toISOString() }));
    return;
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: "Enrichment Worker - Use /health for status" }));
});

server.listen(3000, "0.0.0.0", () => {
  console.log("Enrichment Worker placeholder running on port 3000");
});

setInterval(() => {
  status.processedJobs += 0;
  console.log(
    `Enrichment Worker heartbeat - Status: ${status.status} - Jobs: ${status.processedJobs}`,
  );
}, 30000);

