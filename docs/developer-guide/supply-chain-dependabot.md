# Supply chain: Dependabot și review PR

**Scop:** alinierea configurării [`.github/dependabot.yml`](../../.github/dependabot.yml) cu politica de securitate (actualizări dependențe, review PR, severități).

## Ce urmărește Dependabot în acest repo

| Ecosistem | Directoare / notă |
| --------- | ----------------- |
| `github-actions` | `/` — workflow-uri din `.github/workflows` |
| `npm` | `/` — monorepo pnpm (manifest rădăcină) |
| `docker` | Fiecare subfolder listat în `dependabot.yml` care conține un `Dockerfile` (`apps/*`, `workers/*`, `services/python-*`, `infra/docker/postgres`). **Nu** există imagine la rădăcina repo-ului; configurația anterioară `docker` + `directory: "/"` nu avea efect util. |
| `pip` | `services/python-{mcp,graph,document,pdf}` — `requirements.txt` |

Alte coduri Python (ex. workers cu layout propriu) nu sunt acoperite automat de aceste intrări `pip`; extindeți `dependabot.yml` când există manifest canonic (`requirements.txt` / `pyproject.toml`) în acel pachet.

## Proces recomandat pentru PR-uri Dependabot

1. **Verificați changelog-ul** pachetului sau imaginii de bază; notați breaking changes.
2. **Rulați poarta locală** înainte de merge: `pnpm validate` (sau subset relevant, ex. `pnpm --filter @cerniq/api test --run` după bump API).
3. **CI pe PR** trebuie să rămână verde; nu ignorați eșecuri Trivy/Sonar fără înregistrare în tracking.
4. **Docker / imagini de bază:** după merge, urmăriți și job-ul CD care face `trivy image` cu `--exit-code 1` pe `CRITICAL,HIGH` (vezi [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml)).

## Grupuri și vulnerabilități

În prezent **nu** sunt definite `groups:` în `dependabot.yml`; PR-urile pot fi multiple pe săptămână. Puteți introduce [grouping](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file#groups) (ex. `patterns: ["*"]` per ecosistem) după ce echipa agreează volumul de review.

## `pnpm approve-builds`

Unele dependențe npm declară **build scripts** la instalare; pnpm le poate bloca până la aprobare explicită. În root [`package.json`](../../package.json) există scriptul `approve-builds` → `pnpm approve-builds`. Folosiți-l **doar** după ce ați auditat pachetul (sursă, reproducibility, necesitatea scriptului). Documentați în PR dacă un bump Dependabot necesită acest pas.

## Legături

- [Dependabot configuration reference](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file)
- [CONTRIBUTING.md — Dependabot](../../CONTRIBUTING.md) (rezumat)
