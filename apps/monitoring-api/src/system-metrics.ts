import os from "node:os";

export function systemMetrics() {
  return {
    collect() {
      const cpus = os.cpus();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();

      return {
        cpu: {
          count: cpus.length,
          model: cpus[0]?.model ?? "unknown",
          loadAvg: os.loadavg(),
        },
        memory: {
          total: totalMem,
          free: freeMem,
          used: totalMem - freeMem,
          usagePercent: (((totalMem - freeMem) / totalMem) * 100).toFixed(1),
        },
        uptime: os.uptime(),
        platform: os.platform(),
        hostname: os.hostname(),
      };
    },
  };
}
