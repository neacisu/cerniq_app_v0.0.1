# Audit dependențe — aprilie 2026

**Data rulare:** 2026-04-10  
**Comandă:** `pnpm audit` la rădăcina monorepo.

## Rezumat

| Rezultat final | Acțiune |
| -------------- | ------- |
| Zero CVE după remediere | Override `smol-toml@1.6.1` în `package.json` (`pnpm.overrides`) — vulnerabilitate moderată GHSA-v3rj-xjv7-4jmq în lanțul `markdownlint-cli2` |

## Note

- Fastify și alte dependențe runtime: fără CVE raportate în acest audit.
- Re-audit recomandat la fiecare release sau săptămânal în CI.
