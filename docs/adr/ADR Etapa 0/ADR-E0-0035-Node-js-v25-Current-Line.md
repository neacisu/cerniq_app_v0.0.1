# ADR-E0-0035: Node.js v25 Current Line pentru workspace

**Status:** Accepted
**Data:** 2026-03-12
**Deciders:** Alex (1-Person-Team)
**Supersedes:** ADR-0002

## Context

Workspace-ul Cerniq.app a fost standardizat initial pe Node.js v24 LTS. La 12 martie 2026, linia curenta Node.js este v25.8.1, iar cerinta operationala pentru workspace este alinierea la ultima versiune disponibila, nu la ultima versiune LTS.

Aceasta schimbare afecteaza:

- fisierele de toolchain locale (`package.json`, `.nvmrc`)
- CI (`actions/setup-node`, `pnpm/action-setup`)
- imaginile Docker pentru aplicatii si workeri
- documentatia canonica si specificatiile active

## Decizie

Standardizam workspace-ul pe:

- **Node.js 25.8.1**
- **pnpm 10.32.1**

Node.js v24 LTS ramane o referinta istorica valida pentru ADR-0002, dar nu mai este versiunea canonica activa a workspace-ului.

## Consecinte

### Pozitive

- toate entrypoint-urile locale, CI si Docker folosesc aceeasi versiune Node
- eliminam drift-ul dintre documentatie, containere si runtime-ul dorit
- folosim ultima versiune disponibila la data deciziei

### Negative

- linia 25.x este **Current**, nu LTS
- validarea locala necesita upgrade-ul mediilor de dezvoltare la Node.js 25.8.1
- unele pachete terte pot avea suport oficial declarat mai intai pentru liniile LTS

## Implementare minima obligatorie

- `.nvmrc` trebuie sa fie `v25.8.1`
- `package.json` trebuie sa declare `node >=25.8.1 <26`
- CI trebuie sa foloseasca `25.8.1`
- toate Dockerfile-urile Node trebuie sa foloseasca `25.8.1`
- documentatia canonica trebuie sa descrie Node.js 25.8.1 ca adevar curent

## Note

Daca proiectul revine ulterior la o politica strict LTS, trebuie emis un ADR nou care sa supersedeze aceasta decizie.
