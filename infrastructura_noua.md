<!-- markdownlint-disable MD007 MD013 MD022 MD029 MD031 MD032 MD034 MD040 MD058 MD060 -->

# Raport audit infrastructura Hetzner + Proxmox

Data: 2026-02-11
Sursa date: loguri audit locale (hetzner_audit_logs/20260211_135424)

Actualizare (executat manual): 2026-02-15

- Scop: inventar + pre-flight real pentru infrastructura noua Cerniq (orchestrator + Proxmox nodes + CT-uri Cerniq).
- Nota: sectiunile de audit din 2026-02-11 raman un snapshot istoric. Recomandarea generica "SSH key-only / disable parole" NU se aplica ca masura globala pe bare-metal in acest proiect (constrangere explicita: parolele SSH nu se elimina/dezactiveaza pe serverele fizice).
- Datele concrete de infra Cerniq (host-uri, CT placement, versiuni, health) sunt documentate in `### Implementare Cerniq.app` -> `#### Inventar + pre-flight (executat 2026-02-15)`.

## Rezumat executiv

- Toate hosturile auditate permit SSH cu parola si login direct ca root, ceea ce expune infrastructura la brute-force si credential stuffing.
- Mai multe servicii de management si RPC sunt expuse public (Proxmox UI 8006, spiceproxy 3128, rpcbind 111, SMTP 25, proxy-uri si servicii aplicative pe porturi custom).
- Politicile de firewall sunt inconsistente intre noduri (unele ACCEPT global, altele UFW/PVEFW). In unele cazuri, expunerea publica este prea larga.
- Clusterul Proxmox principal (hz.215, hz.247, hz.223, orchestrator) apare quorate in logurile nodurilor dedicate, dar orchestratorul are servicii si expuneri publice care il fac vulnerabil ca nod de control.
- Numar semnificativ de update-uri restante pe unele hosturi (ex: 69, 156), indicand un risc crescut de vulnerabilitati nepatchuite.

## Inventar hosturi

- orchestrator (77.42.76.185)
- hz.215 (95.216.36.215)
- hz.247 (95.216.68.247)
- hz.223 (95.217.32.223)
- hz.157 (95.216.225.157)
- hz.118 (95.216.72.118)
- hz.123 (94.130.68.123)
- hz.164 (135.181.183.164)

## Metodologie

- Colectare date prin script local care ruleaza comenzi remote: retele, rute, status Proxmox, configuratie corosync, SSH hardening, firewall, servicii expuse si update-uri.
- Analiza pe host si evaluare riscuri (critical/high/medium/low).
- Observatiile sunt bazate pe snapshot-ul de la momentul auditului.

---

## Detaliu pe hosturi

### orchestrator

Rol probabil: nod de control si servicii aplicative (traefik, openbao, zitadel etc.).

Audit aprofundat (snapshot 2026-02-11 14:08):

- Sistem: Debian 13 cloud, kernel 6.12.57+deb13-cloud-amd64.
- Resurse: 4 vCPU, 7.6 GiB RAM, swap 0, root FS ~38 GiB cu ~23% utilizare.
- Storage: /dev/sda1 (root), /etc/pve pe /dev/fuse (pmxcfs). Docker overlay pe root.
- Retea: eth0 public /32, enp7s0 privat 10.0.0.2/32 (DHCP), MTU 1450; ruta privata 10.0.0.0/16 via 10.0.0.1.
- Proxmox: pve-manager 9.1.5, cluster quorate (4 noduri), corosync activ pe 10.0.0.2.
- Containere Docker: traefik, openbao, zitadel, oauth2-proxy, cloudbeaver, watchtower, **stalwart** (mail server), **roundcube** (webmail) (bridge traefik_default).
- Servicii critice expuse: 22, 25, 80, 143, 443, 465, 587, 993, 4180, 4190, 8080, 8006, 8200/8201, 8888, 3128, 111.
- Storage extern: **Ctera C800-4** (NAS acasa) montat NFS la `/mnt/ctera` (~13 TB), inregistrat ca Proxmox storage `ctera-home`.
- WireGuard VPN: interfata `wg-home` (10.99.0.1/24) configurata pentru tunel spre acasa, service enabled (tunnel inactiv — lipseste peer la acasa).
- Autentificari recente: multiple sesiuni root din IP extern.
- Firewall: PVEFW activ, policy de baza ACCEPT; allowlist pentru 22/8006/3128 prin ipset; expunere depinde de seturile PVEFW.
- Update-uri restante: 19.

Observatii privind scopul:

- Gazduieste gateway-ul de trafic (traefik) + identity (zitadel) + secrets (openbao), deci este un nod critic pentru control si autentificare.
- Rolul de "orchestrator" necesita hardening strict si reducerea expunerilor publice.

Observatii cheie:

- SSH: PermitRootLogin yes, PasswordAuthentication yes, X11Forwarding yes.
- Servicii expuse public: bao 8200/8201, pveproxy 8006, oauth2-proxy 4180, tinyproxy 8888, rpcbind 111, SMTP 25, multiple porturi Docker.
- Firewall: policy ACCEPT cu PVEFW chains; expunerea depinde de reguli interne PVEFW.
- Update-uri restante: ~19.
- Proxmox cluster: quorate in logurile dedicate; corosync activ.

Riscuri:

- Critical: root + parola pe SSH.
- High: expunere publica a serviciilor de management si RPC.
- Medium: update-uri restante.

Recomandari:

- Trecere la SSH key-only, disable root login, disable password auth si X11.
- Restrictionare porturi management (8006, 3128, 111, 25) la IP-uri admin/VPN.
- Inventar complet al porturilor publice si inchidere tot ce nu e necesar.

---

### hz.215 (Cluster 3)

Audit aprofundat (snapshot 2026-02-11 14:09):

- Sistem: Proxmox VE 9.1, kernel 6.17.9-1-pve.
- Resurse: 48 vCPU, 125 GiB RAM, swap 0.
- Storage: RAID1 NVMe (root), /hdd-archive 1.7T montat, /etc/pve pe /dev/fuse.
- Retea: enp98s0f0 public /26, VLAN 4000 pe vmbr4000; IP-uri multiple pe vmbr4000 (10.20.0.11, 10.10.1.1, 10.0.1.9, 10.0.1.11).
- Proxmox: cluster quorate, corosync activ pe 10.0.1.11, 3 VM oprite (104/105/106).
- Servicii expuse: 22, 25, 111, 3128, 8006; rpcbind activ; postfix activ.
- Firewall: PVEFW activ, policy ACCEPT; allowlist management pentru 22/8006/3128 prin ipset; corosync permis intre noduri.
- Update-uri restante: 4.

Observatii privind scopul:

- Nod de compute Proxmox pentru VM-uri; resurse mari, storage local si arhiva separata.
- Are configuratii de retea multiple pe acelasi bridge, ceea ce poate crea ambiguitati de routing.
  Observatii cheie:
- Proxmox cluster: quorate, corosync OK (ring pe 10.0.1.11).
- SSH: PermitRootLogin yes, PasswordAuthentication yes.
- Servicii expuse: pveproxy 8006, spiceproxy 3128, rpcbind 111, postfix 25.
- vmbr4000 cu mai multe IP-uri in acelasi /24 (10.0.1.9 si 10.0.1.11) + alte subnete.
- Update-uri restante: ~4.

Riscuri:

- High: pveproxy public si SSH root+parola.
- Medium: multiplu IP pe bridge poate crea ambiguitate ARP/rute.

Recomandari:

- Restrictionare 8006/3128/111 la IP-uri admin.
- Normalizeaza IP-urile pe vmbr4000.

---

### hz.247 (Cluster 1)

Audit aprofundat (snapshot 2026-02-11 14:09):

- Sistem: Proxmox VE 9.1, kernel 6.17.9-1-pve.
- Resurse: 48 vCPU, 188 GiB RAM, swap 0.
- Storage: RAID1 NVMe (root), /etc/pve pe /dev/fuse.
- Retea: VLAN 4000 pe vmbr4000; IP-uri multiple pe vmbr4000 (10.20.0.10, 10.0.1.7, 10.0.1.10).
- Proxmox: cluster quorate, corosync activ pe 10.0.1.10; 1 LXC pornit (107).
- Servicii expuse: 22, 25, 111, 3128, 8006; rpcbind activ; postfix activ.
- Firewall: PVEFW activ, policy ACCEPT; allowlist management pentru 22/8006/3128 prin ipset; corosync permis intre noduri.
- Update-uri restante: 4.

Observatii privind scopul:

- Nod Proxmox de compute cu resurse mari; participa la clusterul principal.

Observatii cheie:

- Proxmox cluster quorate; corosync pe 10.0.1.10.
- SSH: PermitRootLogin yes, PasswordAuthentication yes.
- Servicii expuse: pveproxy 8006, spiceproxy 3128, rpcbind 111, postfix 25.
- vmbr4000 cu multiple IP-uri (10.0.1.7 si 10.0.1.10).
- Update-uri restante: ~4.

Riscuri:

- High: management public + SSH root cu parola.
- Medium: IP-uri multiple in acelasi /24.

Recomandari:

- Restrictii management + hardening SSH.
- Curatare IP-uri duplicate.

---

### hz.223 (Cluster 2)

Audit aprofundat (snapshot 2026-02-11 14:12):

- Sistem: Proxmox VE 9.1, kernel 6.17.9-1-pve.
- Resurse: 48 vCPU, 125 GiB RAM, swap 0.
- Storage: RAID1 NVMe (root), /nvme-fast 861G, /etc/pve pe /dev/fuse.
- Retea: VLAN 4000 pe vmbr4000; IP-uri multiple pe vmbr4000 (10.20.0.12, 10.0.1.8, 10.0.1.12); public /26 pe enp98s0f0.
- Proxmox: cluster quorate, corosync activ pe 10.0.1.12.
- Servicii expuse: 22, 25, 111, 3128, 8006; rpcbind activ; postfix activ.
- Firewall: PVEFW activ, policy ACCEPT; allowlist management pentru 22/8006/3128 prin ipset; corosync permis intre noduri.
- Update-uri restante: 4.

Observatii privind scopul:

- Nod Proxmox de compute cu storage NVMe local rapid.

Observatii cheie:

- Proxmox cluster quorate; corosync pe 10.0.1.12.
- SSH: PermitRootLogin yes, PasswordAuthentication yes.
- Servicii expuse: pveproxy 8006, spiceproxy 3128, rpcbind 111, postfix 25.
- vmbr4000 cu IP-uri multiple (10.0.1.8 si 10.0.1.12).
- Update-uri restante: ~4.

Riscuri:

- High: management public + SSH root cu parola.
- Medium: multiplu IP in acelasi /24.

Recomandari:

- Restrictionare porturi management la IP-uri admin.
- Unificare IP-urilor pe vmbr4000.

---

### hz.157 (Proxmox standalone)

Audit aprofundat (snapshot 2026-02-11 14:12):

- Sistem: Proxmox VE 7.4, kernel 5.15.131-2-pve.
- Resurse: 16 vCPU, 62 GiB RAM, swap 31 GiB.
- Storage: RAID1 SATA ~436G (root), CIFS storagebox HEL1-BX69 100G.
- Retea: vmbr0 public /32 (95.216.225.157); VLAN 4000 pe enp27s0.4000 cu 10.0.1.3/24.
- Proxmox: standalone (pvecm n/a); VM-uri active 100 si 102, restul oprite.
- Servicii expuse: 22, 111, 3128, 8006; postfix local.
- Firewall: policy ACCEPT pe INPUT/FORWARD/OUTPUT.
- Update-uri restante: 156.

Observatii privind scopul:

- Nod Proxmox standalone cu VM-uri pentru ERP/media.

Observatii cheie:

- pvecm: n/a (nu este in cluster).
- Firewall policy ACCEPT (INPUT/FORWARD/OUTPUT).
- SSH: PermitRootLogin yes, PasswordAuthentication yes.
- Servicii expuse: pveproxy 8006, spiceproxy 3128, rpcbind 111, postfix 25.
- Update-uri restante: ~156.

Riscuri:

- Critical: firewall deschis + SSH root cu parola.
- High: management expus public.
- Medium: patch lag mare.

Recomandari:

- Aplicare firewall strict, limitare porturi la IP admin.
- Hardening SSH si patching urgent.

---

### hz.118 (Proxmox standalone)

Audit aprofundat (snapshot 2026-02-11 14:12):

- Sistem: Proxmox VE 9.1, kernel 6.17.9-1-pve.
- Resurse: 48 vCPU, 125 GiB RAM, swap 4 GiB.
- Storage: RAID1 1.7T (root), /etc/pve pe /dev/fuse.
- Retea: vmbr0 public /32 (95.216.72.118); VLAN 4000 pe enp98s0f0.4000 cu 10.0.1.4/24.
- Proxmox: standalone (pvecm n/a); LXC 100-103 active.
- Servicii expuse: 22, 25, 111, 3128, 8006; rpcbind si postfix active.
- Firewall: policy ACCEPT; regula explicita pentru 8006.
- Update-uri restante: 4.

Observatii privind scopul:

- Nod Proxmox standalone cu mai multe containere LXC.

Observatii cheie:

- pvecm: n/a (standalone).
- Firewall policy ACCEPT.
- SSH: PermitRootLogin yes, PasswordAuthentication yes, X11Forwarding yes.
- Servicii expuse: pveproxy 8006, spiceproxy 3128, rpcbind 111, postfix 25.
- Update-uri restante: ~4.

Riscuri:

- Critical: firewall deschis + SSH root cu parola.
- High: management expus public.

Recomandari:

- Restrictii management + hardening SSH.
- Activare firewall cu allowlist strict.

---

### hz.123 (ERP)

Audit aprofundat (snapshot 2026-02-11 14:12):

- Sistem: Ubuntu 24.04, kernel 6.8.0-84-generic.
- Resurse: 8 vCPU, 62 GiB RAM, swap 31 GiB.
- Storage: RAID1 436G (root), Docker overlay pe root.
- Retea: public /32 (94.130.68.123); VLAN 4000 pe enp0s31f6.4000 cu 10.0.1.5/24.
- Docker: stack-uri flowxify/n8n/postgres/redis/activepieces.
- Servicii expuse: 21 (vsftpd), 631 (cups), 80/443 (nginx), 5432 (postgres), 8000/8080/8081/8443 (docker-proxy).
- Firewall: INPUT ACCEPT, FORWARD DROP (iptables-nft).
- Update-uri restante: 69.

Observatii privind scopul:

- Host aplicativ ERP/automation cu stack Docker public.

Observatii cheie:

- pvecm: n/a (nu in cluster).
- SSH: PermitRootLogin yes, PasswordAuthentication yes.
- Servicii expuse public: vsftpd 21, cupsd 631, postgres 5432, nginx 80/443, docker 8000/8080/8081/8443.
- Firewall INPUT ACCEPT.
- Update-uri restante: ~69.

Riscuri:

- Critical: firewall deschis + SSH root cu parola.
- High: PostgreSQL public si FTP public fara restrictii.
- Medium: patch lag mare.

Recomandari:

- Inchide 5432, 21 si 631 daca nu sunt strict necesare public.
- SSH key-only + disable root/password auth.
- Patching prioritar.

---

### hz.164 (GeniusERP)

Audit aprofundat (snapshot 2026-02-11 14:12):

- Sistem: Ubuntu 24.04, kernel 6.8.0-86-generic.
- Resurse: 64 vCPU, 125 GiB RAM, swap 4 GiB.
- Storage: NVMe 875G (root), Docker overlay pe root.
- Retea: public /32 (135.181.183.164); VLAN 4000 pe enp195s0.4000 cu 10.0.1.6/24.
- Docker: multe containere (traefik/openbao/postgres/kafka/neo4j/grafana/loki/prometheus etc.), mai multe unhealthy.
- Servicii expuse: 22, 80, 443, 5000-5002, plus porturi Docker (64080/64090/650xx/8811/8000/8088/8445/9499).
- Firewall: UFW activ cu allowlist; Fail2Ban activ (sshd/recidive).
- Update-uri restante: 27.

Observatii privind scopul:

- Host aplicativ multi-stack (GeniusERP + observability + OpenBao).

Observatii cheie:

- pvecm: n/a (nu in cluster).
- SSH: PermitRootLogin yes, PasswordAuthentication yes.
- UFW activ cu allowlist, dar multe porturi publice: 80/443/5000-5002/64443/9499 etc.
- Docker expune multiple porturi publice.
- Update-uri restante: ~27.

Riscuri:

- High: porturi publice multiple fara scope clar.
- Medium: patch lag.

Recomandari:

- Revizuire porturi publice si minimizare expunere.
- SSH hardening si allowlist management.

---

## Evaluare cluster Proxmox

- Clusterul cu hz.215/hz.247/hz.223/orchestrator pare functional la momentul auditului (quorum OK pe nodurile dedicate).
- Exista nealiniere potentiala intre rolul de control al orchestratorului si expunerea publica a serviciilor lui.
- Nodurile standalone (hz.157/hz.118) nu sunt administrate central prin corosync.

## Retele si conectivitate

- vSwitch 76934 legat la cloud network cu subnet 10.0.1.0/24, gateway 10.0.1.1.
- Bare-metal folosesc VLAN 4000 pe bridge vmbr4000, cu IP-uri 10.0.1.x.
- Cloud network necesita configurare consistenta a subnets si IP-uri pentru ca orchestratorul sa fie in acelasi segment de Layer 2 cu bare-metal.

## Probleme majore identificate

1. SSH root + password auth pe toate hosturile.
2. Management services expuse public (Proxmox UI, RPC, Spice, SMTP).
3. Firewall inconsistent si uneori complet deschis.
4. Patching inconsistent si uneori intarziat.
5. IP-uri multiple in acelasi /24 pe vmbr4000 (risc de ARP/routing issues).

## Plan de remediere recomandat

Faza 1 (urgent)

- SSH hardening: PermitRootLogin no, PasswordAuthentication no, X11Forwarding no.
- Firewall allowlist strict pentru management (8006, 3128, 111, 25).
- Inchidere porturi publice neesentiale (FTP, Postgres, RPC).

Faza 2 (stabilizare)

- Normalizare IP-uri pe vmbr4000 (un singur IP / subnet coerent).
- Verificare rutare si MTU pe VLAN 4000.
- Patching complet pe toate nodurile.

Faza 3 (hardening avansat)

- VPN management central (WireGuard/Tailscale) si expunere zero la public pentru management.
- Monitorizare centralizata (logs, fail2ban, alerting).
- Backup si policy de rotatie chei SSH.

---

## Proiecte si Aplicatii

Aceasta sectiune defineste o vedere de ansamblu pentru toate proiectele curente si viitoare care ruleaza pe platforma (Hetzner + Proxmox + LXC + orchestrator Docker), cu accent pe separare, rutare (Traefik), secrete (OpenBao) si observabilitate (Grafana/Prometheus/Loki/Tempo).

### Principii (curente si viitoare)

- Separare pe proiect: domenii/subdomenii dedicate, fisiere Traefik dinamice dedicate, paths OpenBao dedicate, label-uri observabilitate dedicate.
- Interventii pe infrastructura partajata: strict aditive (nu se sterg/regandesc reguli existente, nu se schimba politici globale pentru alte proiecte).
- Config reproductibil: versiuni pin-uite (imagini Docker, action-uri GH), fara tag-uri `latest` in componente critice.
- Porturi: se foloseste matricea de porturi pe proiect (ex: range 64000-64099 pentru Cerniq).

### Proiecte curente (snapshot)

| Proiect / Serviciu                                          | Tip                | Locatie                                           | Domenii / Acces                                                                                     | Note                                                                              |
| ----------------------------------------------------------- | ------------------ | ------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Traefik (gateway)                                           | Platforma (shared) | orchestrator (Docker)                             | :443 public (TLS), file+docker provider                                                             | Ingress unic pentru proiecte; configurari aditive per proiect                     |
| OpenBao (secrete)                                           | Platforma (shared) | orchestrator (Docker)                             | expus prin Traefik (HTTPS)                                                                          | Se foloseste centralizat; proiectele NU ruleaza server OpenBao local              |
| Observabilitate (Grafana/Prometheus/Loki/Tempo/Vector/OTel) | Platforma (shared) | orchestrator (Docker)                             | grafana.neanelu.ro / metrics.neanelu.ro / logs.neanelu.ro / traces.neanelu.ro                       | Proiectele se integreaza aditiv (targets/allowlist/dashboards/rules dedicate)     |
| Email triggerra (stalwart + roundcube)                      | Proiect            | orchestrator (Docker)                             | mailadmin.triggerra.app, webmail.triggerra.app + porturi SMTP/IMAP                                  | Documentat in sectiunea urmatoare                                                 |
| Cerniq.app                                                  | Proiect            | CT107/CT108/CT109/CT110 + orchestrator            | cerniq.app + subdomenii; pipeline CI/CD via CT108                                                   | Detaliat mai jos in "Implementare Cerniq.app"                                     |
| Neanelu Shopify (Manager)                                   | Proiect            | CT107/CT111/CT112 (+ CT108 runner) + orchestrator | manager.neanelu.ro + staging.manager.neanelu.ro + otel-neanelu.neanelu.ro + logs-neanelu.neanelu.ro | Detaliat mai jos in "Implementare Neanelu Shopify Manager" (tracking obligatoriu) |

### Proiecte viitoare (model de onboarding)

Pentru orice proiect nou se recomanda:

- Un fisier Traefik dinamic dedicat proiectului (ex: `/opt/traefik/dynamic/<proiect>.yml`) si un merge controlat in `dynamic_conf.yml`.
- Un path OpenBao dedicat proiectului:
  - KV: `secret/<proiect>/...` (KV v1 pe mount-ul `secret/` in prezent)
  - database engine: `-path=<proiect>-db` (unde e cazul)
  - AppRoles: `approle/<proiect>-api`, `approle/<proiect>-workers`, `approle/<proiect>-cicd`
- Observabilitate:
  - labels consistente: `{project="<proiect>", environment="<staging|production>"}`
  - dashboards si alert rules in fisiere separate, aditive
- Daca e proiect cu traffic public: LXC dedicat (staging/prod) + reguli NAT/iptables aditive doar pentru acel proiect.

### Implementare Neanelu Shopify Manager

Aceasta subsectiune documenteaza migrarea Neanelu Shopify pe infrastructura noua, folosind aceleasi pattern-uri ca Cerniq:

- Traefik/OpenBao/observability centralizate pe orchestrator (config aditiv per proiect)
- PostgreSQL centralizat pe CT107 (DB dedicate per env)
- Redis/BullMQ shared pe orchestrator (prefix/ACL per env)
- separare staging vs production (2 LXC: CT112/CT111, 2 aplicatii Shopify, secrete separate)

#### Obiectiv

- Migrare Neanelu fara interferenta cu proiecte existente/viitoare (toate schimbari pe shared infra sunt aditive).
- Observabilitate cu allowlist scoping (ingest-only pe host-uri dedicate; UI ramane restrictionat doar la admin).
- Trasabilitate 1:1: la fiecare `todo` implementat, actualizam aici status + referinte + verificari.

#### CT-uri dedicate (propunere)

- CT 107: PostgreSQL `postgres-main` (shared platform)
- CT 111: Neanelu productie (Docker stack)
- CT 112: Neanelu staging (Docker stack)
- CT 108: CI runner (deploy automat, optional)

#### Domenii

- `manager.neanelu.ro` (prod)
- `staging.manager.neanelu.ro` (staging)
- `otel-neanelu.neanelu.ro` (OTLP ingest-only, allowlist strict pe CT111/CT112)
- `logs-neanelu.neanelu.ro` (Loki push-only, allowlist strict pe CT111/CT112 + path `/loki/api/v1/push`)

#### Conventii cheie (aliniere platforma)

- Traefik: fisier dinamic dedicat: `/opt/traefik/dynamic/neanelu.yml` (merge aditiv in `/opt/traefik/dynamic_conf.yml`)
- OpenBao KV v1: `secret/neanelu/{prod,staging,shared,infra}/*`
- OpenBao DB mounts dedicate: `neanelu-db/` (prod+staging) pentru credidentiale dinamice (PgBouncer auth_query)
- Observability scoping:
  - UI (Grafana/Prometheus): allowlist admin-only (nu includem CT-uri aplicatie)
  - Ingest (Loki push / OTLP): host-uri dedicate `logs-neanelu.*` si `otel-neanelu.*` cu router allowlist strict

#### Raport (as-is) - Implementare curenta (repo Neanelu_Shopify)

Aceasta sectiune este un "baseline report" despre starea curenta a aplicatiei, ca sa evitam drift in timpul migrarii.
Surse primare:

- Repo: `/var/www/Neanelu_Shopify`
- Documentatie: `Docs/*` (in special: `Docs/API_Specification.md`, `Docs/PIM_Sprint_9_Endpointuri.md`, `Docs/Metrics_Reference.md`)
- Runtime local: `docker-compose.yml` + `docker-compose.dev.yml`

##### Scopul aplicatiei

Neanelu Shopify Manager este o aplicatie Shopify **multi-tenant** (SaaS) care ofera:

- conectare OAuth (instalare) pentru magazine Shopify
- ingestie masiva de catalog (Bulk Operations JSONL, streaming) + sincronizari incrementale (webhooks)
- procesare asincrona prin cozi (BullMQ/BullMQ Pro) pentru pipeline-uri lungi si cost-sensitive
- PIM (Product Information Management) pentru enrichment + quality + consensus + similarity matches
- search (inclusiv semantic/vector) si un control-plane (UI) pentru monitorizare si setari

##### Functionalitati principale (high level)

- **Auth**: OAuth flow Shopify (`/auth/shopify`, `/auth/shopify/callback`) + sesiune pentru embedded app.
- **Webhooks**: receiver generic `POST /webhooks/:topic` + deduplicare/HMAC.
- **Bulk operations**: initiere + streaming download/parse + ingest in DB.
- **PIM**:
  - KPI/stats (enrichment progress, quality distribution, source performance, cost tracking)
  - consensus (pending/conflicts/manual review, recompute/export)
  - similarity matches (confirm/reject/extract)
  - webhooks calitate + deliveries + retry
- **Queues/DLQ**: lista cozi, pause/resume, clean failed, replay din DLQ.
- **Settings**: configurari per shop (Serper, xAI, Scraper) + health endpoints.

Nota: strategia AI va fi schimbata prin planurile Kimi (Kimi master + self-hosted search/embeddings), dar capacitatile
operationale (kill-switches, pause queues, audit cost tracking) raman cerinte permanente.

##### Structura tehnica (monorepo)

Repo-ul este un **monorepo pnpm** (workspaces) cu:

- `apps/backend-worker`: Node.js (Fastify) + procesare joburi + API HTTP
- `apps/web-admin`: frontend embedded (React Router v7 / Vite), rute `/app/*`
- `packages/*`: database (Drizzle), queue-manager, shopify-client, ai-engine, config, types, logger, pim, scraper, validation

Din `package.json` (root):

- Node: `>=24.0.0`
- pnpm: `>=10.0.0`
- packageManager: `pnpm@10.28.0`

##### Runtime curent (docker-compose "all-in-one")

In starea curenta, `docker-compose.yml` contine atat aplicatia, cat si infrastructura locala (chiar si pentru "prod-like"):

- **Traefik local**: `traefik:v3.6.6` (entrypoints 80/443), ACME HTTP-01.
  - Observatie: are `providers.docker.constraints` care mentioneaza si `cerniq`, deci exista risc de cuplaj intre proiecte
    daca se ruleaza pe acelasi host (motiv major pentru migrare la Traefik orchestrator + fisier dinamic per proiect).
- **PostgreSQL local**: imagine custom `neanelu-postgres:pg18-pgvector` (build din `./docker/postgres`).
- **Redis local**: `redis:8.4` (AOF on) folosit pentru cozi/caching.
- **Observabilitate locala** (dev/prod-like):
  - Jaeger `jaegertracing/jaeger:2.14.1`
  - OTel Collector `otel/opentelemetry-collector-contrib:0.142.0`
  - Prometheus `prom/prometheus:v3.8.1`
  - Alertmanager `prom/alertmanager:v0.30.0`
  - Loki `grafana/loki:3.6.3` + Promtail `grafana/promtail:3.6.3`
  - Grafana `grafana/grafana:12.3.1`
- **Backend**: `backend-worker` (Fastify) cu health check `/health/ready`.
- **Frontend**: `web-admin` (SPA) servit sub `/app`, cu redirect `/` -> `/app/`.
- **Artefacte bulk**: volum persistent `bulk_artifacts` montat la `/var/lib/neanelu/bulk-artifacts`.

Porturi mentionate in documentatie (in special pentru dev):

- API backend: `65000`
- UI web-admin: `65001`
- Postgres dev: `65010`
- Redis dev: `65011`
- Jaeger UI: `65020`; OTLP gRPC: `65021`; OTel HTTP: `65022`
- Loki: `65023`; Grafana: `65024`; Prometheus: `65025`

##### Mapare componente: as-is -> target (noua infrastructura)

Aceasta mapare este folosita ca ghid in timpul migrarii ca sa fie clar:

- ce eliminam complet (servicii locale care devin shared)
- ce mutam (din container local -> CT dedicat / orchestrator)
- ce pastram local doar pentru dev

| Componenta         | As-is (curent)                                           | Target (noua infrastructura)                                                                     | Note / verificare minima                                 |
| ------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Ingress (HTTP/TLS) | Traefik local (`traefik:v3.6.6`) in `docker-compose.yml` | Traefik **orchestrator** (shared), fisier dinamic dedicat `neanelu.yml`                          | `curl -I https://manager.neanelu.ro/health/ready` -> 200 |
| DNS/TLS            | ACME HTTP-01 local, porturi 80/443 pe host               | Cloudflare proxied + TLS prin Traefik orchestrator (cert resolver Cloudflare)                    | `dig A manager.neanelu.ro` -> `77.42.76.185`             |
| Postgres           | container local `neanelu_postgres`                       | CT107 `postgres-main` (`10.0.1.107:5432`) cu DB per env                                          | `pg_isready -h 10.0.1.107 -p 5432`                       |
| DB pooling         | conexiune directa din app catre DB                       | PgBouncer pe CT111/CT112 + auth_query + OpenBao agent infra (tmpfs)                              | `psql "$DATABASE_URL"` (via PgBouncer)                   |
| Redis              | container local `redis:8.4`                              | Redis shared orchestrator (`10.0.0.2:6379`) cu ACL + prefix per env                              | `redis-cli -u "$REDIS_URL" PING`                         |
| BullMQ/BullMQ Pro  | backend foloseste Redis local                            | backend foloseste redis-shared + prefix/ACL per env                                              | verificare chei: `neanelu:prod:*` / `neanelu:staging:*`  |
| Secrete            | `.env` pe disk (local)                                   | OpenBao centralizat (orchestrator) + AppRoles + agent sidecars (tmpfs)                           | agent container `healthy` + env files in tmpfs           |
| Logs               | Loki/Promtail local                                      | Vector pe CT111/CT112 -> Loki central; host dedicat push-only `logs-neanelu.neanelu.ro`          | `curl` push endpoint (allowlist) nu returneaza 403       |
| Traces             | Jaeger local + collector local                           | OTel local -> collector central prin Traefik; host dedicat ingest-only `otel-neanelu.neanelu.ro` | apare service in Tempo/Grafana Explore                   |
| Metrics            | Prometheus/Grafana locale                                | Prometheus/Grafana central (orchestrator); scrape din CT111/CT112 pe porturi 65xxx               | targets up in Prometheus central                         |
| Dashboards         | Grafana local                                            | Folder dedicat "Neanelu" in Grafana central                                                      | labels `project=neanelu`, `environment=prod\|staging`    |
| Alerting           | Alertmanager local                                       | Alertmanager central + rules aditive per proiect                                                 | fara alerte false dupa cutover                           |
| Bulk artifacts     | volum docker local `bulk_artifacts`                      | volume/path pe CT111/CT112 (cu rotatie/retentie)                                                 | cleanup job + spatiu suficient                           |
| CI/CD              | (potential) manual pe host                               | runner CT108 + workflow-uri (FAZA 1)                                                             | gating pe checks + deploy lock                           |
| Dev local          | compose dev cu tool-uri (pgadmin, redis-commander)       | ramane local (nu migram dev pe LXC)                                                              | `pnpm db:up` continua sa functioneze                     |

##### Observabilitate si metrici (as-is)

Aplicatia expune metrici si semnale OTel, documentate in `Docs/Metrics_Reference.md`:

- HTTP: `http_request_total`, `http_request_duration_seconds`, `http_5xx_total`
- Webhooks: accept/reject/dedup + latente
- Queues: depth/active/latency/duration/retries/failures/DLQ/rate-limit/fairness
- DB pool: active/idle + latente query
- Redis: latente comenzi + erori conectare
- AI/vector: `vector_search_latency_seconds`, cache hit/miss, backlog/batch age, error types
- Shopify API: cost points total + rate limit hits

##### De ce migram (probleme/riscuri in modelul curent)

- Infrastructura locala in acelasi compose (Traefik/DB/Redis/Obs) creste riscul de:
  - drift intre medii
  - secrete in `.env` pe disk (in loc de secret manager central)
  - interferenta multi-proiect (Traefik local + constrangeri cross-project)
- Observability allowlist: modelul platformei cere **scoping** (ingest-only pe host-uri dedicate), nu UI allowlisted cu CT-uri.
- Scalarea reala (888k+ produse) cere:
  - worker concurrency + queue isolation
  - pooling DB (PgBouncer) si dimensionare conexiuni
  - gateway NAT + reguli iptables aditive (platforma) pentru trafic controlat

##### Masuratori baseline (obligatoriu inainte de migrare/cutover)

Inainte de FAZA 0 cutover (dump/restore + DNS switch), colectam un baseline pentru "ce avem azi", ca sa putem demonstra:

- performanta similara sau mai buna dupa migrare
- lipsa regresiilor (queue backlog, latente, erori)
- sizing corect pentru CT111/CT112 + CT107/Redis shared

Checklist (de rulat pe hostul curent / mediul curent, respectiv pe CT111/CT112 dupa deploy):

- **Servicii**:
  - `docker compose ps` (stare + uptime)
  - `docker compose logs --tail 200 backend-worker` (erori recurente)
- **Resurse**:
  - `docker stats --no-stream` (CPU/RAM per container)
  - `free -h`, `df -h` (mem/disk)
  - `uptime` (load)
- **PostgreSQL** (pe DB curenta):
  - dimensiune DB: `SELECT pg_size_pretty(pg_database_size(current_database()));`
  - top tables/index sizes: `SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 20;`
  - conexiuni active/idle: `SELECT state, count(*) FROM pg_stat_activity GROUP BY state;`
- **Redis**:
  - `redis-cli INFO memory` (used_memory, fragmentation)
  - `redis-cli INFO clients` (connected_clients)
- **Queues**:
  - snapshot backlog (waiting/active/failed/delayed) din endpoint `GET /api/queues`
- **Shopify Bulk**:
  - ultimul bulk run (durata, bytes, produse) din UI/logs
- **Observability**:
  - latente: p95/p99 API + webhook + queue duration
  - error rate (5xx)

Nota: comenzi exacte se vor adapta mediului (local dev vs production), dar rezultatele (numerice) se pastreaza aici ca referinta.

#### Necesare viitoare (target) - resurse si dimensionare (orientativ)

Acest sizing este orientativ; trebuie ajustat dupa masuratori (CPU/RAM/disk/IOPS) pe run-uri reale.

- **CT111 (prod)**: 8 vCPU, ~24GB RAM, 100GB disk (aplicatie + logs locali temporari + artefacte bulk).
- **CT112 (staging)**: 4 vCPU, ~16GB RAM, 80GB disk.
- **CT107 (Postgres shared platform)**:
  - DB-uri separate `neanelu_shopify` si `neanelu_shopify_staging`
  - disk dimensionat pentru volum mare (catalog + vectori pgvector + indexes + WAL) + backup/PITR (conform runbook DR).
- **Redis shared (orchestrator)**:
  - ACL/prefix separate per mediu; sizing pe throughput BullMQ + caching (fara vector store primar daca ramanem pe pgvector).
- **Observability (orchestrator)**:
  - ingest endpoints dedicate pentru Neanelu:
    - `otel-neanelu.neanelu.ro` (OTLP ingest-only)
    - `logs-neanelu.neanelu.ro` (Loki push-only)
- **Network**:
  - egress strict 80/443/53; forward strict spre OpenBao/Redis/Obs + Postgres CT107
  - porturi host 65xxx (conform `Docs/Port_Conventions.md`) pentru metrics scrapes (node-exporter/cAdvisor) pe CT111/CT112.

Dimensionare operationala (ce controlam activ):

- **DB connections**: aplicatia trebuie sa foloseasca PgBouncer; limitele `max_connections` raman controlate la CT107.
- **Worker concurrency**: cresterea throughput-ului se face prin scalare orizontala (replici worker) + tuning concurrency per queue,
  nu prin cresterea necontrolata a conexiunilor DB.
- **Bulk artifacts**: `bulk_artifacts` trebuie sa aiba spatiu suficient pentru fisiere JSONL multi-GB (si rotatie/cleanup automat).

#### Pasii urmatori (tranzitie spre infrastructura noua)

Aceasta lista este un rezumat executiv; "source of truth" pentru instructiuni detaliate ramane planul:

`/root/.cursor/plans/kimi_k2.5_master_llm_phases/phase_00_migrare_lxc.plan.md`

Directii:

- Mutam runtime-ul aplicatiei pe 2 LXC (prod+staging), dar pastram shared services pe orchestrator/CT107.
- Toate modificarile pe infrastructura partajata sunt **aditive** (fara schimbari globale care afecteaza alte proiecte).
- Dupa fiecare Pas 0.xxx implementat, completam tabelul de tracking cu referinte (repo path + host path) si verificari.

Executie curenta (audit trail):

- Branch de lucru FAZA 0 (repo Neanelu_Shopify): `phase0/migrare-lxc`
- Regula: nu implementam direct in `main`; toate schimbari se propun din branch + verificari.

#### Tracking progres (obligatoriu)

Tabela se mentine ca “source of truth” pentru status + referinte.

| Todo / Pas                                                            | Status    | Repo path / config                                                                                  | Host path / locatie                                     | Verificare                                                                                                                                                               |
| --------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FAZA 0 - Pas 0.001 (CT111+CT112 create)                               | completed | `infra/scripts/hz215_create_ct111_ct112.sh`                                                         | hz.215                                                  | Verificari succinte in tabel; detalii in “Taskuri implementate (Neanelu) -> phase00-001”                                                                                 |
| FAZA 0 - Pas 0.002 (NAT/FORWARD)                                      | completed | `infra/config/iptables/*neanelu*`                                                                   | hz.247 `/etc/iptables.rules`                            | `iptables -S FORWARD` (reguli CT111/CT112) + egress DNS+443 verificat din CT111/CT112 (python3 getaddrinfo + TCP connect) + VIP allowlist `10.0.1.10:443/6379` verificat |
| FAZA 0 - Pas 0.003 (Backup + rollback plan)                           | completed | `infra/scripts/ct107_backup_postgres_neanelu.sh`, `infra/scripts/ct107_restore_postgres_neanelu.sh` | CT107 + (optional) Storage Box                          | `DRY_RUN=1` precheck ok (psql) + restore guard (CONFIRM_RESTORE) + rulare reala inainte de cutover (Pas 0.017)                                                           |
| FAZA 0 - Pas 0.004 (CT107 DB prod+staging)                            | completed | `infra/scripts/ct107_init_neanelu_db.sh`                                                            | CT107                                                   | DB-uri `neanelu_shopify` + `neanelu_shopify_staging` create, owner `neanelu_app`; extensii `vector`, `pg_stat_statements`, `citext` prezente                             |
| FAZA 0 - Pas 0.004B (SECURITY: elimina pg_hba trust orchestrator)     | completed | (executie controlata) patch `pg_hba.conf` + reload                                                  | CT107                                                   | `pg_hba_file_rules` nu mai contine `trust` (count=0)                                                                                                                     |
| FAZA 0 - Pas 0.005 (OpenBao secrets central)                          | completed | `infra/config/openbao/*`, `infra/scripts/openbao_apply_neanelu.py`                                  | orchestrator OpenBao                                    | policies + AppRoles Neanelu create; KV marker `secret/neanelu/shared/_bootstrap` prezent                                                                                 |
| FAZA 0 - Pas 0.006 (Redis shared: ACL + prefix per env)               | completed | `/opt/redis-shared/redis.conf` (aditiv) + OpenBao KV `secret/neanelu/*/redis`                       | orchestrator Redis                                      | `PING` ca `neanelu-prod`/`neanelu-staging` + NOPERM la chei in afara prefix-ului                                                                                         |
| FAZA 0 - Pas 0.007 (Traefik orchestrator: neanelu.yml)                | pending   | `infra/config/traefik-orchestrator/neanelu.yml`                                                     | orchestrator `/opt/traefik/dynamic/neanelu.yml`         | `sha256sum` match + `curl -I` hostnames                                                                                                                                  |
| FAZA 0 - Pas 0.008 (Eliminare Traefik/Nginx local + refactor compose) | pending   | compose refactor                                                                                    | CT111/CT112 `/opt/neanelu/*`                            | `docker compose config` fara `traefik` local                                                                                                                             |
| FAZA 0 - Pas 0.009 (docker-compose.prod.yml)                          | pending   | `docker-compose.prod.yml`                                                                           | CT111/CT112 `/opt/neanelu/*`                            | `docker compose -f ... config` ok                                                                                                                                        |
| FAZA 0 - Pas 0.010 (PgBouncer + auth_query)                           | pending   | `infra/config/openbao/templates/*pgbouncer*`                                                        | CT111/CT112 tmpfs `/run/neanelu/runtime-secrets/infra/` | `psql` via PgBouncer + `SHOW POOLS;`                                                                                                                                     |
| FAZA 0 - Pas 0.011 (Observabilitate integrare)                        | pending   | vector/otel configs                                                                                 | CT111/CT112 + orchestrator                              | logs in Loki, traces in Tempo, targets up                                                                                                                                |
| FAZA 0 - Pas 0.011B (allowlist scoping ingest-only)                   | pending   | traefik routers + obs                                                                               | orchestrator                                            | `curl` din neallowlist -> 403; allowlist -> 2xx                                                                                                                          |
| FAZA 0 - Pas 0.011C (gateway intern TLS observability)                | pending   | haproxy + iptables                                                                                  | hz.247                                                  | bind `10.0.1.10:443` + allow doar CT111/CT112                                                                                                                            |
| FAZA 0 - Pas 0.012 (Grafana dashboards)                               | pending   | dashboards json                                                                                     | grafana central                                         | dashboard folder "Neanelu" populat                                                                                                                                       |
| FAZA 0 - Pas 0.013 (Cloudflare DNS + SSL)                             | pending   | DNS records                                                                                         | Cloudflare                                              | `dig` + `curl -I` prod+staging+otel+logs                                                                                                                                 |
| FAZA 0 - Pas 0.014 (Shopify Partner: 2 apps)                          | pending   | N/A (UI Shopify)                                                                                    | Shopify Partners                                        | OAuth callback ok prod+staging                                                                                                                                           |
| FAZA 0 - Pas 0.015 (handoff FAZA 1 CI/CD)                             | pending   | `phase_01_ci_cd.plan.md`                                                                            | CT108 runner                                            | PR checks + deploy plan valid                                                                                                                                            |
| FAZA 0 - Pas 0.016 (Actualizare cod/config)                           | pending   | `.env.example` + `packages/config`                                                                  | repo                                                    | config validation + feature flags                                                                                                                                        |
| FAZA 0 - Pas 0.017 (Cutover: dump/restore + migratii + DNS)           | pending   | runbooks + scripts                                                                                  | CT107 + Cloudflare                                      | restore ok + health ok + webhooks ok                                                                                                                                     |
| FAZA 0 - Pas 0.018 (Validare finala)                                  | pending   | checklist                                                                                           | prod+staging                                            | non-interferenta + observability ok                                                                                                                                      |
| DOCS ALIGNMENT (port matrix)                                          | pending   | `Docs/Port_Conventions.md`                                                                          | repo + orchestrator scrape                              | scrape ports 65210/65211 confirmate                                                                                                                                      |
| DOCS ALIGNMENT (deploy checklist)                                     | pending   | `Docs/Production_Deployment_Checklist.md`                                                           | repo                                                    | pasii reflecta CT107/OpenBao/Traefik orch                                                                                                                                |
| DOCS ALIGNMENT (runbooks)                                             | pending   | `Docs/runbooks/*`                                                                                   | repo                                                    | fara referinte la DB/Redis/OpenBao locale                                                                                                                                |
| DOCS ALIGNMENT (runbook) - database-migration                         | pending   | `Docs/runbooks/database-migration.md`                                                               | repo                                                    | fara `localhost:65010`; PgBouncer/CT107 clar                                                                                                                             |
| DOCS ALIGNMENT (runbook) - openbao-recovery                           | pending   | `Docs/runbooks/openbao-recovery.md`                                                                 | repo                                                    | OpenBao orchestrator; fara `docker exec openbao` local                                                                                                                   |
| DOCS ALIGNMENT (runbook) - DR_Runbook                                 | pending   | `Docs/runbooks/DR_Runbook.md`                                                                       | repo                                                    | CT107 + redis-shared + CT111/CT112 (nu db local)                                                                                                                         |
| DOCS ALIGNMENT (runbook) - database-failover                          | pending   | `Docs/runbooks/database-failover.md`                                                                | repo                                                    | clar future vs aplicabil; comenzi corecte                                                                                                                                |
| DOCS ALIGNMENT (runbook) - bulk-operation-stuck                       | pending   | `Docs/runbooks/bulk-operation-stuck.md`                                                             | repo                                                    | redis-shared prefix/ACL + alternative prin API                                                                                                                           |
| DOCS ALIGNMENT (runbook) - rate-limit-emergency                       | pending   | `Docs/runbooks/rate-limit-emergency.md`                                                             | repo                                                    | prefera control-plane; chei prefixate                                                                                                                                    |
| DOCS ALIGNMENT (runbook) - ai-pipeline-operations                     | pending   | `Docs/runbooks/ai-pipeline-operations.md`                                                           | repo                                                    | noua topologie + tranzitie Kimi                                                                                                                                          |
| DOCS ALIGNMENT (runbook) - pim-api-budget-exceeded                    | pending   | `Docs/runbooks/pim-api-budget-exceeded.md`                                                          | repo                                                    | runbook_url din alerts valid + actiuni ok                                                                                                                                |
| DOCS ALIGNMENT (runbook) - logql-queries                              | pending   | `Docs/runbooks/logql-queries.md`                                                                    | repo                                                    | queries functioneaza cu labels `project/environment`                                                                                                                     |
| DOCS ALIGNMENT (runbook) - runbooks index                             | pending   | `Docs/runbooks/README.md`                                                                           | repo                                                    | lista completa + status tested/untested                                                                                                                                  |
| SECURITY FINAL (secret cleanup)                                       | pending   | `Docs/*` + repo                                                                                     | repo                                                    | `rg` nu gaseste tokenuri/chei/parole                                                                                                                                     |
| OPS (pre-cutover) code freeze + TTL                                   | pending   | release notes                                                                                       | Cloudflare + git                                        | tag ok + TTL 60 inainte de cutover                                                                                                                                       |
| OPS (host readiness)                                                  | pending   | checklist                                                                                           | CT111/CT112                                             | Docker>=27, disk ok, time sync ok                                                                                                                                        |
| OPS (backup verification)                                             | pending   | backup scripts                                                                                      | CT107 + staging                                         | restore staging ok                                                                                                                                                       |
| OPS (migratii DB)                                                     | pending   | runbook migrations                                                                                  | CT107                                                   | expand/contract verificat                                                                                                                                                |
| OPS (smoke tests)                                                     | pending   | smoke scripts                                                                                       | prod+staging                                            | OAuth/webhooks/queues ok                                                                                                                                                 |
| OPS (post-cutover log/cleanup)                                        | pending   | deployment log                                                                                      | repo                                                    | log complet + prune/retention                                                                                                                                            |
| GAP FIX (Traefik /auth + /health)                                     | pending   | `infra/config/traefik-orchestrator/neanelu.yml`                                                     | orchestrator                                            | `curl -I /auth/shopify` -> 302; `curl /health/ready` -> 200                                                                                                              |
| OBS ALIGNMENT (prom targets + alert rules 1:1)                        | pending   | prom config + rules files                                                                           | orchestrator                                            | targets up + alerts ok + runbook_url ok                                                                                                                                  |
| OBS ALIGNMENT (rules) - queue-alerts                                  | pending   | `Docs/Observability_Alerting.md`                                                                    | orchestrator                                            | `QueueStalledJobsHigh` etc active                                                                                                                                        |
| OBS ALIGNMENT (rules) - shopify-alerts                                | pending   | `Docs/Observability_Alerting.md`                                                                    | orchestrator                                            | `ShopifyAPICostSpike`, `ShopifyRateLimitHit` active                                                                                                                      |
| OBS ALIGNMENT (rules) - infra-alerts                                  | pending   | `Docs/Observability_Alerting.md`                                                                    | orchestrator                                            | Redis/Postgres/Disk/Memory alerts active                                                                                                                                 |
| OBS ALIGNMENT (rules) - bulk-alerts                                   | pending   | `Docs/Observability_Alerting.md`                                                                    | orchestrator                                            | `BulkOperationStuck` active                                                                                                                                              |
| OBS ALIGNMENT (rules) - pim-cost-alerts                               | pending   | `Docs/Observability_Alerting.md`                                                                    | orchestrator                                            | `PimApiBudgetWarning/Exceeded` active                                                                                                                                    |
| OBS ALIGNMENT (alert routing)                                         | pending   | alertmanager config                                                                                 | orchestrator                                            | critical->pagerduty, warning->slack                                                                                                                                      |
| SECURITY/DB (RLS tests via PgBouncer)                                 | pending   | `Docs/Testing_RLS_Isolation.md`                                                                     | staging DB                                              | TC-RLS-001..003 trec (direct + via PgBouncer)                                                                                                                            |
| DOCS ALIGNMENT (Port_Conventions)                                     | pending   | `Docs/Port_Conventions.md`                                                                          | repo                                                    | reflecta central obs + 65210/65211 + deprecari prod                                                                                                                      |
| SHOPIFY/GDPR (uninstall validation)                                   | pending   | `Docs/Webhook_Topics_Reference.md`                                                                  | staging/prod                                            | uninstall sterge date + curata cozi/redis keys                                                                                                                           |
| DB SoT ALIGNMENT (schema parity)                                      | pending   | `Docs/Database_Schema_Complete.md`                                                                  | CT107 + repo                                            | extensii + migrare ordine + sanity checks                                                                                                                                |
| DB OPERATIONS (retention/partitioning)                                | pending   | DB ops design                                                                                       | CT107                                                   | ownership clar (FAZA 0 index, FAZA 16 implementare)                                                                                                                      |
| DB PERF/OBS (pg_stat_statements preload)                              | pending   | postgresql.conf CT107                                                                               | CT107                                                   | `SHOW shared_preload_libraries;` contine pg_stat_statements                                                                                                              |
| DB MAINTENANCE (pgvector vacuum cadence)                              | pending   | `Docs/tech/pgvector-tuning.md`                                                                      | CT107                                                   | job saptamanal definit/testat (FAZA 16)                                                                                                                                  |
| DB INDEX POLICY (partial indexes)                                     | pending   | `Docs/Database_Partial_Indexes.md`                                                                  | CT107                                                   | EXPLAIN foloseste indexuri partiale                                                                                                                                      |
| DOCS ALIGNMENT (devops+onboarding)                                    | pending   | `Docs/DevOps_Plan_Implementare_Shopify_Enterprise.md`, `Docs/Developer_Onboarding_Guide.md`         | repo                                                    | topologie noua reflectata 1:1                                                                                                                                            |

Regula: cand un pas devine `completed`, completam coloanele (repo+host paths) si adaugam in nota de verificare comenzile folosite si output-ul relevant (succint).

#### Taskuri implementate (plan) si referinte (Neanelu)

Taskurile marcate `completed` in FAZA 0 (Neanelu) sunt implementate si au referinte concrete mai jos, in acelasi stil ca Cerniq:

- `phase00-001` (CT111+CT112 create)
  - Repo: `infra/scripts/hz215_create_ct111_ct112.sh`
  - hz.215: create + start LXC:
    - CT111 (prod): `neanelu-prod`, IP `10.0.1.111/24`, gw `10.0.1.7`, MTU `1400`, bridge `vmbr4000`, `nesting=1,keyctl=1`, `unprivileged=1`
    - CT112 (staging): `neanelu-staging`, IP `10.0.1.112/24`, gw `10.0.1.7`, MTU `1400`, bridge `vmbr4000`, `nesting=1,keyctl=1`, `unprivileged=1`
  - Verificare (rulata pe hz.215):
    - `pct status 111` -> `status: running`
    - `pct status 112` -> `status: running`
    - `pct config 111 | egrep 'hostname:|cores:|memory:|swap:|net0:|unprivileged:|features:|onboot:'` -> confirma parametrii (IP/gw/mtu/bridge)
    - `pct exec 111 -- ip -4 a show dev eth0` -> `inet 10.0.1.111/24`
    - `pct exec 112 -- ip -4 a show dev eth0` -> `inet 10.0.1.112/24`
  - Non-interferenta:
    - nu s-au modificat reguli iptables / Traefik / OpenBao / CT107; s-au creat doar cele 2 CT-uri noi pe hz.215
    - egress in internet pentru CT111/CT112 depinde de Pas 0.002 (hz.247 iptables ADITIVE)

- `phase00-002` (hz.247 NAT/FORWARD + allowlist VIP gateway intern)
  - Repo: `infra/config/iptables/hz247-neanelu-egress.rules`, `infra/config/iptables/hz247-neanelu-inbound.rules`
  - hz.247: `/etc/iptables.rules` (modificari **aditive**, fara a schimba politicile globale)
  - Obiectiv:
    - egress controlat pentru CT111/CT112 (DNS + 80/443) prin NAT pe `hz.247` (gateway `10.0.1.7`)
    - acces intern strict allowlisted la VIP `10.0.1.10` (HAProxy gateway intern) pentru:
      - TLS passthrough `:443` (Traefik/OpenBao/observability ingest prin hostnames)
      - Redis gateway `:6379` (BullMQ/Redis shared prin HAProxy, fara expunere larga)
    - acces orchestrator -> CT111/CT112 (Traefik/Prometheus) pe porturile dedicate Neanelu:
      - app/UI: `65000/65001`
      - scrape: `65210/65211`
  - Implementare (rezumat reguli adaugate):
    - `FORWARD`: allow egress `10.0.1.111/112 -> enp98s0f0` pe `80,443,53` + `ESTABLISHED`, apoi DROP per sursa
    - `POSTROUTING (nat)`: MASQUERADE pentru `10.0.1.111/112` pe `80,443,53`
    - `FORWARD`: allow `10.0.0.2 -> 10.0.1.111/112` pe `65000,65001,65210,65211`
    - `INPUT`: allowlist VIP `10.0.1.10:443` si `10.0.1.10:6379` pentru CT109/CT110 (Cerniq) + CT111/CT112 (Neanelu), apoi DROP pe destinatie/port (scoping strict)
  - Verificare (executata):
    - Pe hz.247:
      - `sudo iptables -S INPUT | egrep '10\\.0\\.1\\.(109|110|111|112).*10\\.0\\.1\\.10.*(443|6379)|-d 10\\.0\\.1\\.10/32.*--dport (443|6379) -j DROP'` -> regulile VIP allow+drop prezente
      - `sudo iptables -S FORWARD | grep 10.0.1.111` / `grep 10.0.1.112` -> reguli egress + orchestrator ingress prezente
      - `sudo iptables -t nat -S POSTROUTING | grep 10.0.1.111` / `grep 10.0.1.112` -> MASQUERADE prezent
    - Din hz.215 (sanity): `python3 socket.connect(('10.0.1.10',443))` -> timeout (blocked) (nu e in allowlist)
    - Din CT111/CT112:
      - `python3` socket.connect la `10.0.1.10:443` si `:6379` -> OK
      - `python3 socket.getaddrinfo('example.com',443)` -> OK (DNS)
      - `python3` TCP connect la un IP public `:443` -> OK (egress)
  - Non-interferenta:
    - allowlist VIP pastreaza CT109/CT110 (Cerniq) si adauga doar CT111/CT112 (Neanelu)
    - nu s-au schimbat politici globale; schimbarea este aditiva si limitata la IP-urile Neanelu
    - verificare explicita: `hz.215` NU poate accesa VIP `10.0.1.10:443` (scoping corect)

- `phase00-003` (Backup + rollback plan - Postgres CT107 + optional Storage Box)
  - Repo:
    - `infra/scripts/ct107_backup_postgres_neanelu.sh` (backup local + optional upload Storage Box)
    - `infra/scripts/ct107_restore_postgres_neanelu.sh` (restore controlat, cu guard)
  - Target runtime:
    - CT107: dumps locale in `/var/backups/neanelu/postgres/ct107_neanelu_<timestamp>/`
    - Storage Box (optional): upload prin `scp` folosind env vars (`STORAGEBOX_HOST/USER/PATH[/SSH_KEY]`)
  - Obiectiv:
    - avem o procedura repetabila pentru:
      - `pg_dump -Fc` pentru `neanelu_shopify` + `neanelu_shopify_staging`
      - verificare integritate `pg_restore --list`
      - rollback rapid prin restore pe staging / prod (cu confirmare explicita)
    - secretele NU apar in repo; creditele Storage Box se furnizeaza la runtime (env vars / chei existente pe CT107)
  - Verificare (executata fara a modifica date):
    - Copiere temporara a scripturilor in CT107 prin `pct push` (hz.247) si rulare:
      - `DRY_RUN=1 /tmp/ct107_backup_postgres_neanelu.sh` -> `psql_ok`
      - `ct107_restore_postgres_neanelu.sh` fara `CONFIRM_RESTORE=YES` -> refuza (guard functional)
  - Note / cand se ruleaza backup-ul real:
    - inainte de cutover (Pas 0.017) si inainte de orice operatiuni destructive (drop/recreate, restore, migratii)
    - optional: upload in Storage Box pentru off-host retention

- `phase00-004` (CT107 Postgres: DB prod+staging + extensii)
  - Repo:
    - `infra/scripts/ct107_init_neanelu_db.sh` (genereaza parole initiale pe CT107, creeaza roluri/DB-uri, instaleaza extensii)
    - (template) `infra/config/postgres/init-ct107-neanelu.sql` (nu se ruleaza cu parole hardcodate; pastrat ca referinta)
  - CT107:
    - DB-uri create: `neanelu_shopify` (prod) si `neanelu_shopify_staging` (staging)
    - Roluri create: `neanelu_app` (owner app) si `neanelu_vault` (pentru OpenBao DB engine, la phase00-005)
    - Parole initiale: salvate local in fisier root-only `/root/neanelu_ct107_initial_db_passwords_<timestamp>.txt` (de rotit in OpenBao si sters dupa)
  - Extensii (ambele DB-uri):
    - `vector` (pgvector)
    - `pg_stat_statements` (extensie instalata; preload/config se valideaza separat la task-ul DB perf/obs)
    - `citext`, `pgcrypto`, `pg_trgm`, `btree_gin`, `btree_gist`, `uuid-ossp`
  - Verificare (executata):
    - DB-uri: `select datname from pg_database where datname like $$neanelu_%$$;` -> ambele prezente
    - Owners: `neanelu_shopify:neanelu_app`, `neanelu_shopify_staging:neanelu_app`
    - Extensii: in ambele DB-uri exista `citext`, `pg_stat_statements`, `vector`
  - Non-interferenta:
    - schimbari strict aditive pe CT107 (roluri/DB-uri cu prefix neanelu)
    - fara modificari la `pg_hba.conf` (task separat `phase00-004B`)

- `phase00-004B` (SECURITY: elimina `pg_hba` trust pentru orchestrator `10.0.0.2/32`)
  - Context:
    - in `/etc/postgresql/18/main/pg_hba.conf` exista o regula periculoasa:
      - `host all all 10.0.0.2/32 trust`
    - exista deja reguli `scram-sha-256` deasupra pentru `10.0.0.2/32`, deci eliminarea `trust` are risc minim si elimina un footgun.
  - CT107:
    - backup creat: `/etc/postgresql/18/main/pg_hba.conf.bak.neanelu.20260215T152334Z`
    - modificare: eliminata strict 1 linie care potrivea `host all all 10.0.0.2/32 trust`
    - reload: `select pg_reload_conf();` -> `t`
  - Verificare (executata):
    - `select count(*) from pg_hba_file_rules where auth_method = $$trust$$;` -> `0`
  - Non-interferenta:
    - nu s-au modificat alte reguli HBA; doar s-a eliminat fallback-ul `trust`

- `phase00-005` (OpenBao: policies + AppRoles + paths KV v1 pentru Neanelu)
  - Repo:
    - `infra/config/openbao/README.md` (conventii paths + roles)
    - `infra/config/openbao/policies/*` (policies Neanelu)
    - `infra/scripts/openbao_apply_neanelu.py` (apply prin OpenBao HTTP API)
  - OpenBao (orchestrator):
    - Address: `OPENBAO_ADDR=https://s3cr3ts.neanelu.ro`
    - KV v1 paths (standard): `secret/neanelu/{prod,staging,shared,infra}/*`
    - Auth method: `approle/` (deja prezent)
  - Policies create (names):
    - `neanelu-prod-api`
    - `neanelu-prod-workers`
    - `neanelu-staging-api`
    - `neanelu-staging-workers`
    - `neanelu-infra`
  - AppRoles create/update (role names):
    - `neanelu-prod-api` -> policy `neanelu-prod-api`
    - `neanelu-prod-workers` -> policy `neanelu-prod-workers`
    - `neanelu-staging-api` -> policy `neanelu-staging-api`
    - `neanelu-staging-workers` -> policy `neanelu-staging-workers`
    - `neanelu-infra` -> policy `neanelu-infra`
  - KV bootstrap marker (non-secret):
    - `secret/neanelu/shared/_bootstrap` cu chei `project`, `created_at`
  - Verificare (executata, fara afisare secrete):
    - `GET /v1/sys/health` -> unsealed
    - `GET /v1/sys/policy` contine policy-urile Neanelu
    - `GET /v1/secret/neanelu/shared/_bootstrap` returneaza doar cheile non-secret

- `phase00-006` (Redis shared orchestrator: ACL + prefix per env, pattern Cerniq)
  - Context (pattern Cerniq):
    - `redis-shared` este configurat din `/opt/redis-shared/redis.conf`
    - `user default off`
    - user per proiect + key-pattern isolation via `~<prefix>:*`
    - userul `cerniq` are `-acl` (nu se poate face `ACL SETUSER` din runtime), deci userii se adauga in `redis.conf` si se face restart container
  - Orchestrator:
    - Config: `/opt/redis-shared/redis.conf` (mount RO in container: `/usr/local/etc/redis/redis.conf`)
    - Backup creat: `/opt/redis-shared/redis.conf.bak.neanelu.<timestamp>`
    - Useri adaugati (aditiv):
      - `user neanelu-prod on > ~neanelu:prod:* +@all -acl -config -shutdown`
      - `user neanelu-staging on > ~neanelu:staging:* +@all -acl -config -shutdown`
    - Restart: `docker restart redis-shared`
  - OpenBao KV v1 (pentru runtime config, fara a afisa secrete):
    - `secret/neanelu/prod/redis` (host/port/username/prefix; parola goala in acest moment, ca Cerniq)
    - `secret/neanelu/staging/redis`
  - Verificare (executata):
    - `PING` ca `neanelu-prod` / `neanelu-staging` (parola goala) -> `PONG`
    - `SET neanelu:prod:*` OK pentru `neanelu-prod`; `SET neanelu:staging:*` -> `NOPERM`
    - `SET neanelu:staging:*` OK pentru `neanelu-staging`; `SET neanelu:prod:*` -> `NOPERM`

### Implementare Cerniq.app

Aceasta subsectiune documenteaza implementarea Cerniq.app pe infrastructura noua (Proxmox + LXC dedicate + servicii centralizate pe orchestrator).

#### Obiective pt. Cerniq.app

- Migrare Cerniq.app fara a afecta alte proiecte: folosim Traefik/OpenBao/observability centralizate si baze de date pe CT 107.
- CT-urile dedicate Cerniq:
  - CT 107: PostgreSQL (extern, partajat la nivel de platforma, configurari aditive pentru Cerniq)
  - CT 108: GitHub Actions runner self-hosted
  - CT 109: productie Cerniq (Docker stack)
  - CT 110: staging Cerniq (Docker stack)
- Resurse curente (verificate 2026-02-15):
  - Placement:
    - `hz.223` hosteaza CT108/CT109/CT110 (LXC).
    - `hz.247` hosteaza CT107 (LXC) si gateway-ul intern VIP `10.0.1.10` (HAProxy TCP passthrough + allowlist iptables).
  - CT 107 (`postgres-main`, pe `hz.247`): 8 cores, 32768 MiB RAM, swap 512 MiB, rootfs 100G
  - CT 108 (`CI-worker`, pe `hz.223`): 2 cores, 8192 MiB RAM, swap 1024 MiB, rootfs 40G
  - CT 109 (`prod-cerniq`, pe `hz.223`): 8 cores, 32768 MiB RAM, swap 2048 MiB, rootfs 100G
  - CT 110 (`staging-cerniq`, pe `hz.223`): 4 cores, 16384 MiB RAM, swap 512 MiB, rootfs 80G

#### Inventar + pre-flight (executat 2026-02-15)

Comenzi folosite (read-only):

- SSH (key auth, non-interactiv): `ssh orchestrator`, `ssh hz.223`, `ssh hz.247`
- Control-plane LXC: `pct list`, `pct config <id>`, `pct exec <id> -- ...`

Rezultate confirmate:

- Orchestrator (Debian 13, `orchestrator.neanelu.ro`, public `77.42.76.185`, privat `10.0.0.2`):
  - Kernel (verificat): `6.12.57+deb13-cloud-amd64`
  - Docker: `29.2.1`, Compose: `v5.0.2`
  - Stack observability/ingress/secrets este UP: `traefik`, `openbao`, `prometheus`, `grafana`, `loki`, `tempo`, `alertmanager`, `vector`, `otel-collector`, `cadvisor`, `node-exporter`
  - OpenBao health (fara secrete): `initialized=True`, `sealed=False`, `standby=False`, `version=2.5.0`, `GET /v1/sys/health -> 200`
  - Traefik config Cerniq este prezent: `/opt/traefik/dynamic/cerniq.yml`

- `hz.247` (Proxmox node + gateway intern):
  - OS (verificat): Debian 13 (trixie), kernel `6.17.9-1-pve`
  - VIP intern: `10.0.1.10`
  - HAProxy listeners (confirmat): `10.0.1.10:443`, `10.0.1.10:6379`, plus porturi observability gateway (`19000/19010/19012` si `29000/29010/29012`)
  - iptables allowlist pe VIP (confirmat):
    - accept doar din CT109/CT110 catre `10.0.1.10:443` si `10.0.1.10:6379`, apoi `DROP` pentru restul
    - accept din orchestrator `10.0.0.2/32` catre porturile observability gateway, apoi `DROP` pentru restul
  - CT107 exista ca LXC `postgres-main` pe acest node

- CT107 `postgres-main` (Ubuntu 24.04, `10.0.1.107`):
  - Kernel (verificat): `6.17.9-1-pve`
  - PostgreSQL: `18.1` (pgdg build)
  - WAL archiving (confirmat): `archive_mode=on`, `archive_command='cp %p /var/lib/postgresql/18/main/wal_archive/%f'`
  - Director `wal_archive` exista si contine segmente WAL (ultima actualizare observata: 2026-02-15)

- `hz.223` (Proxmox node):
  - OS (verificat): Debian 13 (trixie), kernel `6.17.9-1-pve`
  - CT108/CT109/CT110 sunt `running` pe `vmbr4000`, gateway `10.0.1.7`, MTU `1400`

- CT109 `prod-cerniq` (Ubuntu 24.04, `10.0.1.109`) si CT110 `staging-cerniq` (Ubuntu 24.04, `10.0.1.110`):
  - Kernel (verificat): `6.17.9-1-pve`
  - Docker: `28.2.2` (Ubuntu package)
  - `/opt/cerniq` prezent (deployment path)
  - Containere Cerniq confirmate UP:
    - `cerniq-openbao-agent-api`, `cerniq-openbao-agent-workers`, `cerniq-openbao-agent-infra`: `healthy`
    - `cerniq-pgbouncer`: `healthy`
    - `cerniq-cadvisor`: `healthy`
    - `cerniq-vector`, `cerniq-otel-collector`: `running` (fara healthcheck in acest moment)

#### Pre-flight extins (executat 2026-02-15) — CT109/CT110

Executie controlata, fara fisiere persistente:

- Runner (repo): `infra/scripts/preflight_extins_run.py`
  - creeaza temporar pe nod (`/tmp/cerniq-preflight-extins-...`), face `pct push` in CT ca `/tmp/preflight_extins_ct.sh`, ruleaza local, apoi sterge atat din CT cat si din nod
- Script rulat in CT (repo): `infra/scripts/preflight_extins_ct.sh`

Rezultate confirmate pe ambele CT-uri (prod `10.0.1.109` si staging `10.0.1.110`):

- `docker compose ps`:
  - nu exista compose in radacina `/opt/cerniq/`, dar exista in `/opt/cerniq/infra/docker/docker-compose.yml`
  - servicii vizibile in `compose ps`: `cerniq-pgbouncer`, `cerniq-openbao-agent-*`, `cerniq-vector`, `cerniq-otel-collector`, `cerniq-cadvisor`
  - porturi observate (din compose ps):
    - `cerniq-cadvisor`: host `:64094 -> 8080/tcp`
    - `cerniq-otel-collector`: host `:64070 -> 4317/tcp`, `:64071 -> 4318/tcp`

- Conectivitate TCP (python3 socket connect):
  - CT109/CT110 -> CT107 PostgreSQL `10.0.1.107:5432`: OK
  - CT109/CT110 -> VIP gateway `10.0.1.10:443` (TLS passthrough): OK
  - CT109/CT110 -> VIP gateway `10.0.1.10:6379` (Redis passthrough): OK

- Rezolvare DNS / override:
  - `s3cr3ts.neanelu.ro` pe host rezolva la `10.0.1.10` (override pentru trafic intern controlat prin gateway)
  - `logs-cerniq.neanelu.ro` si `otel-cerniq.neanelu.ro` pe host rezolva la IP public `77.42.76.185` (normal DNS)
  - override-ul catre VIP pentru logs/otel este facut la nivel de container (confirmat prin `docker inspect`):
    - `cerniq-vector`: `ExtraHosts=["logs-cerniq.neanelu.ro:10.0.1.10"]`
    - `cerniq-otel-collector`: `ExtraHosts=["otel-cerniq.neanelu.ro:10.0.1.10"]`

- OpenBao reachability (HTTPS):
  - `GET https://s3cr3ts.neanelu.ro/v1/sys/health` -> `200` din CT109 si CT110

#### Pre-flight extins (executat 2026-02-15) — CT107 (PostgreSQL)

Executie controlata, fara fisiere persistente:

- Runner (repo): `infra/scripts/preflight_extins_run.py`
  - upload temporar pe `hz.247` + `pct push` in CT107 ca `/tmp/preflight_extins_ct.sh`, rulare locala, apoi cleanup
- Script rulat in CT107 (repo): `infra/scripts/preflight_extins_ct107_pg.sh`

Rezultate confirmate (CT107 `postgres-main`, `10.0.1.107`):

- PostgreSQL:
  - service: `postgresql=active`
  - `psql --version`: `18.1` (pgdg)
  - `SELECT version()` OK
  - `pg_isready` OK pe socket si `127.0.0.1:5432`
- WAL archiving:
  - `archive_mode=on`
  - `archive_command=cp %p /var/lib/postgresql/18/main/wal_archive/%f`
  - `wal_level=replica`
  - director `wal_archive` prezent si contine segmente WAL
- Conectivitate (din CT107):
  - `10.0.0.2:443` (orchestrator internal): OK
  - `10.0.1.10:443` si `10.0.1.10:6379` (VIP gateway hz.247): timeout
    - nota: acest comportament este compatibil cu allowlist-ul VIP (Cerniq CT109/CT110 au acces la VIP; CT107 nu este in allowlist)

#### Pre-flight extins (executat 2026-02-15) — hz.247 (VIP/iptables/HAProxy)

Executie controlata, fara fisiere persistente:

- Runner (repo): `infra/scripts/preflight_extins_run_node.py`
  - upload temporar pe node in `/tmp`, executie cu `sudo`, apoi cleanup
- Script rulat pe node (repo): `infra/scripts/preflight_extins_hz247_host.sh`

Rezultate confirmate (hz.247):

- HAProxy: `active`
- Listeners VIP `10.0.1.10`:
  - `:443` (TLS passthrough), `:6379` (Redis passthrough)
  - porturi observability gateway: `19000/19010/19012` si `29000/29010/29012`
- iptables INPUT (VIP allowlist):
  - permite `10.0.1.109/32` si `10.0.1.110/32` catre `10.0.1.10:443` si `10.0.1.10:6379`, apoi `DROP` pentru restul
  - permite orchestrator `10.0.0.2/32` catre porturile observability gateway, apoi `DROP` pentru restul
- iptables FORWARD (egress control pentru CT-uri):
  - reguli explicite pentru `10.0.1.107/108/109/110` permit doar `80/443/53` + `RELATED,ESTABLISHED`, apoi `DROP` (deny by default)
- Placement confirmat:
  - `pct list` pe hz.247 contine doar `107 postgres-main`

#### Pre-flight extins (executat 2026-02-15) — hz.223 (control-plane CT108/109/110)

Executie controlata, fara fisiere persistente:

- Runner (repo): `infra/scripts/preflight_extins_run_node.py`
- Script rulat pe node (repo): `infra/scripts/preflight_extins_hz223_host.sh`

Rezultate confirmate (hz.223):

- OS/kernel: Debian 13 (trixie), kernel `6.17.9-1-pve`
- iptables/PVEFW:
  - chain-urile PVEFW exista si `FORWARD` sare in `PVEFW-FORWARD`
  - in acest moment nu apar reguli specifice per-CT in `FORWARD` sau `PVEFW-FORWARD` (doar reguli generice, ex: `RELATED,ESTABLISHED`)
  - nota: egress control pentru CT-uri (deny-by-default) este aplicat pe gateway `hz.247` (confirmat in pre-flight `hz.247`)
- Placement CT-uri pe acest node (confirmat):
  - `CT108 CI-worker` (`10.0.1.108/24`, `vmbr4000`, gw `10.0.1.7`, MTU `1400`)
  - `CT109 prod-cerniq` (`10.0.1.109/24`, `vmbr4000`, gw `10.0.1.7`, MTU `1400`)
  - `CT110 staging-cerniq` (`10.0.1.110/24`, `vmbr4000`, gw `10.0.1.7`, MTU `1400`)

#### Pre-flight extins (executat 2026-02-15) — orchestrator (Traefik/OpenBao/Observability)

Executie controlata, fara fisiere persistente:

- Runner (repo): `infra/scripts/preflight_extins_run_node.py`
- Script rulat pe host (repo): `infra/scripts/preflight_extins_orchestrator.sh`
- Validare drift `cerniq.yml`:
  - runner-ul paseaza `CERNIQ_YML_EXPECTED_SHA256` calculat local din `infra/config/traefik-orchestrator/cerniq.yml`

Rezultate confirmate (orchestrator):

- Docker / stack core (UP):
  - containere prezente: `traefik`, `openbao`, `prometheus`, `grafana`, `loki`, `tempo`, `alertmanager`, `vector`, `otel-collector`, `cadvisor`, `node-exporter`
  - `cadvisor` are healthcheck `healthy`; restul sunt `running` (fara healthcheck expus)
- OpenBao:
  - `GET /v1/sys/health` -> `200`
  - `initialized=True`, `sealed=False`, `standby=False`, `version=2.5.0`
- Traefik dynamic config (Cerniq):
  - fisier existent: `/opt/traefik/dynamic/cerniq.yml`
  - `dynamic_conf.yml` contine identificatori Cerniq (sanity): `cerniq.app`, `api.cerniq.app`, `admin.cerniq.app`, `staging.cerniq.app`, `otel-cerniq.neanelu.ro`
  - Drift detectat (IMPORTANT):
    - sha256 actual pe orchestrator (`/opt/traefik/dynamic/cerniq.yml`): `a7c769c5d8c988f1a473b571695bc1670b3823e94b162737e92884213529defa`
    - sha256 asteptat din repo (`infra/config/traefik-orchestrator/cerniq.yml`): `2ea2c85b811cfa6b71e690a4c2f11d96c51cdd25fca4a59784fed71a166ff71e`
    - `cerniq_yml_sha256_match=NO`
  - Actiune recomandata:
    - investigheaza ce pipeline/sync a scris `/opt/traefik/dynamic/cerniq.yml`
    - decide SoT (repo vs orchestrator) si sincronizeaza (ideal: repo -> orchestrator) in mod aditiv, fara a afecta alte proiecte

#### Drift remediation (executat 2026-02-15) — Traefik Cerniq (SoT = repo)

Context:

- Traefik container monteaza `dynamic_conf.yml` (SoT runtime): `/etc/traefik/dynamic_conf.yml <- /opt/traefik/dynamic_conf.yml`
- `cerniq.yml` de proiect exista la `/opt/traefik/dynamic/cerniq.yml` (util pentru merge/operare), dar nu este montat direct in container in acest moment.

Investigatie drift (scriptata, read-only):

- Script (repo): `infra/scripts/traefik_cerniq_yml_drift.sh` (upload temporar + cleanup)
- Diferente observate initial:
  - `/opt/traefik/dynamic/cerniq.yml` lipseste `10.0.1.10/32` din `cerniq-otlp-allowlist`
  - `/opt/traefik/dynamic_conf.yml` (runtime) nu continea deloc `10.0.1.10/32` (nici macar ca string), iar blocul `cerniq-otlp-allowlist` avea doar `10.0.1.109/32` si `10.0.1.110/32`

Fix aplicat (controlat, cu backup):

- Patch runtime SoT (`dynamic_conf.yml`) pentru OTLP allowlist (idempotent):
  - Script (repo): `infra/scripts/traefik_patch_dynamic_conf_cerniq_otlp_allowlist.py` (upload temporar + cleanup)
  - Backup creat pe orchestrator: `/opt/traefik/dynamic_conf.yml.bak.20260215T220728Z`
  - Rezultat: `cerniq-otlp-allowlist` include acum `10.0.1.10/32`
- Sync fisier proiect (`/opt/traefik/dynamic/cerniq.yml`) cu repo (SoT=repo):
  - Backup creat pe orchestrator: `/opt/traefik/dynamic/cerniq.yml.bak.20260215T220828Z`
  - Rezultat: `sha256` match repo (drift rezolvat pentru `cerniq.yml`)

Verificare post-fix (executata):

- `traefik_cerniq_yml_drift.sh` confirma:
  - `sha_match=YES` intre repo si `/opt/traefik/dynamic/cerniq.yml`
  - `dynamic_conf_otlp_allowlist_has_10.0.1.10=True`

#### Verificare E2E OTLP prin gateway (executat 2026-02-15)

Scop:

- confirmam end-to-end ca OTLP HTTP (`/v1/traces`) ajunge la OTEL Collector central prin gateway-ul intern (`hz.247` VIP `10.0.1.10`) si ca Traefik nu mai blocheaza prin allowlist.

Executie controlata, fara fisiere persistente:

- Script CT (repo): `infra/scripts/otlp_gateway_e2e_test_ct.sh`
  - ruleaza `curl` cu `--resolve otel-cerniq.neanelu.ro:443:10.0.1.10` (forteaza ruta prin VIP, SNI pastrat)
  - request: `POST /v1/traces` cu `Content-Type: application/x-protobuf` si body gol (smoke-test)
- Runner: `infra/scripts/preflight_extins_run.py` (upload temporar + `pct exec` + cleanup)

Rezultate:

- CT109 (`10.0.1.109`) -> VIP -> `https://otel-cerniq.neanelu.ro/v1/traces`: `200`
- CT110 (`10.0.1.110`) -> VIP -> `https://otel-cerniq.neanelu.ro/v1/traces`: `200`
- Test direct (fara `--resolve`, ruta prin public/NAT) ramane `403` (asteptat; Traefik vede IP-ul public NAT si nu e in allowlist)
- CT107 (`10.0.1.107`) -> VIP: `000` (connect failed) (asteptat; CT107 nu este allowlisted in iptables INPUT pe VIP `10.0.1.10:443`)

Fix-uri necesare ca E2E sa treaca (executate in aceasta ordine):

- Traefik allowlist runtime (fisier montat in container):
  - `dynamic_conf.yml` este SoT runtime pentru Traefik (`/etc/traefik/dynamic_conf.yml <- /opt/traefik/dynamic_conf.yml`)
  - a fost necesar:
    - sa includem `10.0.1.10/32` in `cerniq-otlp-allowlist` (gateway source)
    - sa normalizam YAML-ul (indentare/quotes) pentru ca Traefik sa interpreteze corect `sourceRange`
  - backup-uri create pe orchestrator:
    - `/opt/traefik/dynamic_conf.yml.bak.20260215T220728Z`
    - `/opt/traefik/dynamic_conf.yml.bak.20260215T221709Z`
  - Traefik restart (controlat) efectuat pentru a forta reload: script `infra/scripts/traefik_restart_orchestrator.sh`
- OTEL Collector central:
  - problema: `otel-collector:4318` refuza conexiuni in reteaua `observability` (Connection refused) -> Traefik returna `502`
  - config: `/opt/observability/otel/otel-collector.yml` (mount in container)
  - patch-uri aplicate (backup + restart `otel-collector`):
    - `grpc/http` normalize (null -> map): `/opt/observability/otel/otel-collector.yml.bak.20260215T222508Z`
    - endpoints explicite:
      - `grpc.endpoint: 0.0.0.0:4317`
      - `http.endpoint: 0.0.0.0:4318`
      - backup: `/opt/observability/otel/otel-collector.yml.bak.20260215T222944Z`
  - probe intra-network (executata): din container `grafana` -> `otel-collector:4318`
    - `GET /` -> `404`
    - `POST /v1/traces` (empty protobuf) -> `200`

#### Taskuri implementate (plan) si referinte

Taskurile marcate `completed` in planul de migrare sunt implementate si au referinte concrete mai jos:

#### Actualizari documentatie (2026-02-15)

- Purge observability legacy din documentatia operationala (stack curent: Grafana/Prometheus/Loki/Tempo/Vector/OTEL)
  - Repo: `docs/infrastructure/observability-stack.md` (sursa curenta)
  - Stub legacy (pastrat doar ca redirect): `docs/infrastructure/observability-signoz.md`
  - Verificare (repo): `rg '\bSigNoz\b|\bClickHouse\b' docs/` returneaza doar ADR-uri istorice (ex: ADR-0016 / ADR-E0-0034 / ADR-INDEX)
- CI/CD documentatie aliniata la infra noua (runner CT108, deploy CT109/CT110, OpenBao orchestrator, PG extern CT107)
  - Repo: `docs/infrastructure/CI-CD-AUDIT-2026-02.md`
  - Stub deprecated: `docs/infrastructure/CI-CD-AUDIT-2026-02-04.md`
  - Repo: `docs/infrastructure/ci-cd-pipeline.md`
  - Repo: `docs/adr/ADR Etapa 0/ADR-0032-CI-CD-Pipeline-Strategy.md`
- Developer guide aliniat la arhitectura curenta (fara referinte la PostgreSQL/OpenBao local in Docker pentru staging/prod)
  - Repo: `docs/developer-guide/getting-started.md`
  - Repo: `docs/developer-guide/troubleshooting.md`
  - Repo: `docs/developer-guide/circuit-breaker-pattern.md`

#### Actualizari suplimentare (2026-02-15, continuare)

- Runbooks rescrise pentru infra noua (fara postgres/redis/openbao local in Docker)
  - Repo: `docs/runbooks/incident-response.md`, `docs/runbooks/database-recovery.md`, `docs/runbooks/openbao-recovery.md`, `docs/runbooks/redis-failover.md`, `docs/runbooks/worker-failure.md`
- ADR index + conflict numerotare observability rezolvat
  - Repo: `docs/adr/ADR-INDEX.md`
  - Observability ADR curent: `docs/adr/ADR Etapa 0/ADR-E0-0034-Centralized-Observability-Stack-Orchestrator.md`
  - ADR istoric SigNoz: `docs/adr/ADR Etapa 0/ADR-0016-SigNoz-pentru-Observability.md` (marcat superseded de ADR-E0-0034)
- Docs infrastructure restante aliniate (OpenBao setup, secrets rotation, backup strategy, resource upgrade)
  - Repo: `docs/infrastructure/openbao-setup-guide.md`, `docs/infrastructure/secrets-rotation-procedure.md`, `docs/infrastructure/backup-strategy.md`, `docs/infrastructure/RESOURCE-UPGRADE-PLAN.md`, `docs/infrastructure/docker-log-rotation.md`
- Specs Etapa 0-5 aliniate (porturi CI standard 5432/6379, DB extern CT107, Redis shared, OpenBao orchestrator)
  - Repo: `docs/specifications/Etapa 0/`, `docs/specifications/Etapa 1/`, `docs/specifications/Etapa 2/`, `docs/specifications/Etapa 3/`, `docs/specifications/Etapa 4/`, `docs/specifications/Etapa 5/`
  - Master spec: `docs/specifications/master-specification.md` (OpenBao KV v1 + mount `cerniq-db/`)
- Testing docs + E2E tests aliniate (fara secrete in repo, fara IP-uri legacy in teste)
  - Repo: `docs/testing/` si `tests/e2e/infrastructure/`
- CI hardening (Trivy blocant + CI gaps CI1-CI7)
  - Repo: `.github/workflows/ci-pr.yml` (prettier check, shellcheck, test artifacts, security pe orice PR)
  - Repo: `.github/workflows/deploy.yml` (build matrix include worker images)
- Cleanup artefacte repo
  - Sterse fisiere untracked: `=2`, `.Destination}}{{end}}'`

- `f1-01-traefik-orchestrator-yml`
  - Repo: `infra/config/traefik-orchestrator/cerniq.yml`
  - Orchestrator: `/opt/traefik/dynamic/cerniq.yml` + merge in `/opt/traefik/dynamic_conf.yml`
  - Verificare: `sha256sum` identic intre repo si orchestrator; domeniile Cerniq prezente in `dynamic_conf.yml`
- `f1-02-hz247-iptables-inbound`
  - Repo: `infra/config/iptables/hz247-cerniq-inbound.rules`
  - hz.247: reguli `FORWARD` aditive pentru `10.0.0.2 -> 10.0.1.109/110` pe `64000,64010,64012`
  - Verificare: `sudo iptables -S FORWARD` contine regulile Cerniq; policy ramane compatibila cu alte proiecte
- `f1-03-delete-traefik-intern`
  - Sterse din repo (Traefik intern / Nginx proxy vechi): `traefik-staging.yml`, `nginx-staging.conf`, `infra/docker/traefik/*`, `infra/docker/nginx/staging-proxy.conf`, `infra/config/nginx/*.conf`
- `f1-04-cleanup-scripts-firewall`
  - Repo: `infra/scripts/setup-firewall.sh` fara porturi legacy pentru Traefik intern
- `f1-05-cleanup-scripts-nginx`
  - Repo: `infra/scripts/setup-nginx.sh` marcat ca deprecated (ingress exclusiv prin Traefik orchestrator)
- `f1-06-cleanup-scripts-trivy`
  - Repo: `infra/scripts/trivy-scan.sh` fara `traefik:v3.3.3`
- `f1-07-cleanup-scripts-validate`
  - Repo: `infra/scripts/validate-infrastructure.sh` verifica ingress extern prin orchestrator (nu container local)
- `f1-08-compose-pin-pgbouncer`
  - Repo: `infra/docker/docker-compose.yml` foloseste `edoburu/pgbouncer:latest` (tag pin-uit la nivel de "latest"; pentru reproducibilitate se poate fixa digest)

- `f1-31-compose-pgbouncer-external-pg`
  - Repo: `infra/docker/docker-compose.yml`, `infra/config/openbao/agent-infra.hcl`, `infra/config/openbao/templates/pgbouncer-ini.tpl`, `infra/config/openbao/templates/pgbouncer-userlist.tpl`
  - CT107: rol `cerniq_pgbouncer_auth` + functie SECURITY DEFINER `public.cerniq_pgbouncer_get_auth(username)` (repo: `infra/scripts/ct107_setup_pgbouncer_auth.py`)
  - CT109/CT110: `openbao-agent-infra` randeaza config/auth in tmpfs `/run/cerniq/runtime-secrets/infra/` si PgBouncer monteaza directorul ca `/etc/pgbouncer` (read-only)
  - Verificare:
    - health: `docker inspect -f '{{.State.Health.Status}}' cerniq-openbao-agent-infra cerniq-pgbouncer`
    - e2e DB via PgBouncer cu credidentiale dinamice: script (repo) `infra/scripts/ct_smoketest_dynamic-db-via-pgbouncer.sh` -> output `cerniq` (prod) / `cerniq_staging` (staging)

- `f1-32-agent-configs-orchestrator`
  - Repo: `infra/config/openbao/agent-api.hcl`, `infra/config/openbao/agent-workers.hcl`, `infra/config/openbao/agent-infra.hcl`
  - Config: `vault.address = "https://s3cr3ts.neanelu.ro"` (Traefik orchestrator), fara dependinte pe server OpenBao local
  - Verificare: containerele `cerniq-openbao-agent-*` sunt `healthy` pe CT109/CT110

- `f1-33-fix-template-role-mismatch`
  - Repo: `infra/config/openbao/templates/pg-password.tpl` (mount DB dedicat) + templates env pentru API/Workers
  - Verificare: template-urile citesc `cerniq-db/creds/*-dynamic` (nu `database/creds/*`)

- `f1-34-update-setup-scripts-orchestrator`
  - Repo: `infra/scripts/openbao-setup-engines.sh`, `infra/scripts/openbao-setup-database.sh`, `infra/scripts/openbao-setup-approle.sh`
  - Principiu: Cerniq-only, additive; DB engine pe mount dedicat `cerniq-db/` si KV shared `secret/` este lasat neatins
  - Politici (repo): `infra/config/openbao/policies/*.hcl` aliniate la KV v1 (`secret/cerniq/...`) si DB mount (`cerniq-db/...`); policy nou `infra/config/openbao/policies/cerniq-infra.hcl`

- `f1-35-verify-network-ct107`
  - Verificare: din Docker pe CT109/CT110 -> CT107 `10.0.1.107:5432` (`pg_isready` din container `postgres:18`)

- `f1-36-verify-network-openbao`
  - Verificare: din Docker pe CT109/CT110 -> `https://s3cr3ts.neanelu.ro/v1/sys/health` (HTTPS/443)

- `f1-37-deploy-yml-major-refactor` + `f1-38-deploy-yml-smoke-tests-refactor`
  - Repo: `.github/workflows/deploy.yml`
  - CD nu mai porneste postgres/openbao local; smoke tests folosesc:
    - CT107 reachability direct (fara parole)
    - PgBouncer e2e prin `DATABASE_URL` randat de OpenBao agent
    - Redis shared (PING via `REDIS_URL`)
    - health pentru `openbao-agent-api/workers/infra`

- `f1-39-ci-pr-yml-openbao-update`
  - Repo: `.github/workflows/ci-pr.yml`
  - CI fetch pentru secrete foloseste `OPENBAO_ADDR` si KV v1 endpoint (`/v1/secret/cerniq/ci/test`)
  - Nota: CI redis este local (service), fara parola; nu depinde de OpenBao pentru `redis_password`

- `f1-40-detect-environment-rewrite`
  - Repo: `infra/scripts/detect-environment.sh`
  - Setari corecte noi:
    - `STAGING_IP=10.0.1.110`, `PRODUCTION_IP=10.0.1.109`, `PG_HOST=10.0.1.107`, `PG_PORT=5432`
  - Verificare: scriptul exporta `CERNIQ_ENV`, `PG_HOST`, `PG_PORT` pentru celelalte scripturi care fac `source`

- `f1-41-firewall-fail2ban-update`
  - Repo: `infra/scripts/setup-firewall.sh`, `infra/config/fail2ban/jail.local`, `infra/scripts/detect-environment.sh`
  - UFW: SSH permis doar din IP-urile whitelisted (interne 10.0.1.107/108/109/110 + IP-urile externe de admin/backup specificate de tine)
  - Fail2Ban: `ignoreip` include aceleasi IP-uri whitelisted (nu banam admin)
  - Verificare:
    - `sudo ufw status verbose` contine reguli allow din allowlist pe `22/tcp`
    - `grep -E '^ignoreip' /etc/fail2ban/jail.local` contine allowlist-ul

- `f1-42-hz247-iptables-ct108-orchestrator`
  - Repo: `infra/config/iptables/hz247-cerniq-inbound.rules`
  - hz.247: reguli `FORWARD` aditive pentru `CT108 (10.0.1.108) -> orchestrator (10.0.0.2)` pe `22/tcp` + retur `RELATED,ESTABLISHED`
  - Scop: permite CD sa sincronizeze (SSH/SCP) config Traefik pe orchestrator fara a afecta alte proiecte
  - Verificare: `sudo iptables -S FORWARD` contine regulile pentru `10.0.1.108/32 -> 10.0.0.2/32 dport 22`

- `f1-43-vector-config-create`
  - Repo: `infra/config/vector/vector.toml`
  - Source: `docker_logs`; transform: adauga labels `project=cerniq`, `environment=${CERNIQ_ENV}`, `host=${HOSTNAME}`; sink: Loki `https://logs-cerniq.neanelu.ro/loki/api/v1/push`
  - Verificare:
    - `docker compose config` include serviciul `vector` + mount-uri docker socket + containers logs

- `f1-44-otel-collector-config`
  - Repo: `infra/config/otel/otel-collector.yaml`
  - Receivers: OTLP gRPC `4317` + HTTP `4318`; processors: `resource` + `batch`; exporter: `otlphttp` spre `https://otel-cerniq.neanelu.ro`
  - Verificare: `docker compose config` include serviciul `otel-collector` + porturi host `64070:4317` si `64071:4318`

- `f1-45-compose-add-vector-otel`
  - Repo: `infra/docker/docker-compose.yml`
  - Servicii:
    - `vector` (config `../config/vector/vector.toml`, mounts `/var/run/docker.sock` + `/var/lib/docker/containers`)
    - `otel-collector` (config `../config/otel/otel-collector.yaml`, ports `64070/64071`)

- `f1-46-orchestrator-traefik-otlp-route`
  - Repo: `infra/config/traefik-orchestrator/cerniq.yml`
  - Orchestrator:
    - dynamic file: `/opt/traefik/dynamic/cerniq.yml`
    - merge in config agregat: `/opt/traefik/dynamic_conf.yml` (strict aditiv)
  - DNS/route: `otel-cerniq.neanelu.ro` (TLS cloudflare)
  - Restrictionare: middleware allowlist Cerniq-only:
    - `10.0.1.109/32` + `10.0.1.110/32` (CT-uri dedicate Cerniq)
    - `10.0.1.10/32` (gateway intern hz.247, vezi `f1-60` "Gateway intern TLS observability")
  - Upstream: OTEL Collector central expus pe loopback pe orchestrator `127.0.0.1:4318`
    - Observability stack (orchestrator): `/opt/observability/docker-compose.yml` publica `127.0.0.1:4318:4318` pentru `otel-collector`
  - Verificare:
    - pe orchestrator (NU in allowlist): `curl -sk -o /dev/null -w "%{http_code}\n" -H "Host: otel-cerniq.neanelu.ro" https://127.0.0.1/v1/traces` -> `403`

- `f1-47-orchestrator-loki-allowlist`
  - Orchestrator (observability stack): `/opt/observability/.env`
  - Variabila `OBS_ALLOWED_CIDRS` este folosita ca allowlist pentru UI-urile observability (Grafana/Prometheus/Loki/Tempo) prin middleware-ul `obs-allowlist@docker`
  - Verificare: `grep '^OBS_ALLOWED_CIDRS=' /opt/observability/.env`
  - Nota: scoping mai fin (doar push endpoints, nu UI) este tratat separat in plan (vezi `f1-60`)

- `f1-60-loki-allowlist-scoped`
  - Problema: allowlist global pentru `logs.neanelu.ro` permite si acces la UI/query endpoints (nu doar push), daca includem CIDR-uri de la hosturi aplicatie.
  - Implementare (Cerniq-only):
    - Am scos CT109/CT110 din `OBS_ALLOWED_CIDRS` global (raman doar IP-uri admin/gateway).
    - Am adaugat endpoint separat pentru Cerniq log push: `logs-cerniq.neanelu.ro` (DNS A -> `77.42.76.185`).
    - In observability stack (`/opt/observability/docker-compose.yml`), serviciul `loki` are router Traefik nou:
      - rule: `Host(\`logs-cerniq.neanelu.ro\`) && PathPrefix(\`/loki/api/v1/push\`)`
      - middleware allowlist: `10.0.1.10/32` (gateway intern hz.247; sursa stabila pentru CT109/CT110)
      - `ipallowlist.ipstrategy.depth=0` pentru acest endpoint (clientii Vector nu trimit `X-Forwarded-For`; depth=1 poate duce la "empty IP address" si `403`)
    - In repo, Vector Cerniq foloseste noul endpoint: `infra/config/vector/vector.toml` -> `https://logs-cerniq.neanelu.ro/loki/api/v1/push`
    - Gateway intern TLS observability (Cerniq-only, aditiv, fara impact pe alte proiecte):
      - Host: `hz.247` (gateway/NAT)
      - Bind: `10.0.1.10:443` (doar intern, nu public)
      - Implementare: HAProxy in mod TCP passthrough catre Traefik orchestrator `10.0.0.2:443` (TLS se termina in Traefik; certificatul/SNI raman intacte)
      - Restrictie acces: iptables INPUT pe `hz.247` permite `10.0.1.109/32` si `10.0.1.110/32` catre `10.0.1.10:443`, apoi DROP pentru restul
      - Motiv: in anumite cazuri, conexiunea directa CT109/CT110 -> `10.0.0.2:443` poate avea probleme de return path/TLS handshake; gateway-ul ofera o ruta interna stabila fara a folosi IP-uri publice/NAT pentru observability
  - Verificare:
    - DNS: `dig +noall +answer @1.1.1.1 A logs-cerniq.neanelu.ro` -> `77.42.76.185`
    - Router allowlist: pe orchestrator (neallowlisted) `curl -sk -H 'Host: logs-cerniq.neanelu.ro' https://127.0.0.1/loki/api/v1/push` -> `403`

- `f2-01-ci-runner-ssh-key`
  - CT108 (CI runner): exista cheie SSH deploy pentru user `deploy` in `/home/deploy/.ssh/id_ed25519`
  - CT110 (staging): cheia publica este in `/home/deploy/.ssh/authorized_keys`
  - Verificare (din CT108): `ssh -i /home/deploy/.ssh/id_ed25519 deploy@10.0.1.110 "echo ssh_ok"` -> `ssh_ok`

- `f2-02-ci-runner-verify`
  - Runner `CI-worker-108` este online in GitHub Actions (repo runners)
  - Verificare (API): `gh api repos/neacisu/cerniq_app_v0.0.1/actions/runners` arata `CI-worker-108 status=online busy=false`
  - Verificare (CT108): `actions.runner.neacisu-cerniq_app_v0.0.1.CI-worker-108.service` este `active (running)`

- `f2-03-github-secrets-staging`
  - GitHub Actions secrets (repo `neacisu/cerniq_app_v0.0.1`) sunt setate:
    - `STAGING_HOST=10.0.1.110`
    - `STAGING_USER=deploy`
    - `STAGING_SSH_KEY` = cheia privata de deploy de pe CT108 (nu se afiseaza)
  - Verificare (fara a expune valori): `gh api repos/neacisu/cerniq_app_v0.0.1/actions/secrets --jq '.secrets[].name' | egrep 'STAGING_HOST|STAGING_USER|STAGING_SSH_KEY'`

- `f1-48-orchestrator-prometheus-targets`
  - Orchestrator (observability stack): `/opt/observability/prometheus/prometheus.yml`
  - Scrape jobs aditive pentru Cerniq:
    - `job_name: cerniq-nodes` (node-exporter):
      - prin gateway L4 hz.247 (VIP `10.0.1.10`): `10.0.1.10:29100` (CT109), `10.0.1.10:19100` (CT110)
      - direct: `10.0.1.107:9100`, `10.0.1.108:9100`
    - `job_name: cerniq-docker` (cAdvisor) prin gateway: `10.0.1.10:29094` (CT109), `10.0.1.10:19094` (CT110)
  - Labels: `project=cerniq`
  - Verificare: `grep -n \"job_name: cerniq-\" -n /opt/observability/prometheus/prometheus.yml`

- `f1-49-env-file-update`
  - Repo: `.env`, `.env.local`, `infra/docker/.env`
  - Obiectiv: elimina complet secretele plaintext din fisiere locale (parole/keys/tokens/unseal keys) si pastreaza doar variabile non-secrete (host-uri, URL-uri)
  - Nota: `OPENBAO_ADDR` ramane `https://s3cr3ts.neanelu.ro` (OpenBao central pe orchestrator)

- `f1-50-cloudflare-records-update`
  - Repo: `infra/config/dns/cloudflare-records.txt`
  - Update: toate A record-urile Cerniq (`cerniq.app`, `www`, `api`, `admin`, `staging`, `api.staging`, `admin.staging`) pointeaza la Traefik orchestrator `77.42.76.185`
  - Add: `otel-cerniq.neanelu.ro` -> `77.42.76.185` (zona Cloudflare `neanelu.ro`)

- `f1-16-dns-cloudflare-config` (F1.3)
  - Scop: cutover DNS catre Traefik orchestrator `77.42.76.185`
  - Implementare:
    - manual in Cloudflare UI (zona `cerniq.app` + zona `neanelu.ro`), conform `infra/config/dns/cloudflare-records.txt`, sau
    - automat: `python3 infra/scripts/cloudflare_sync_dns.py --apply` (necesita `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID_CERNIQ_APP`, `CLOUDFLARE_ZONE_ID_NEANELU_RO`)
  - Verificare (public DNS):
    - `dig +noall +answer A cerniq.app` trebuie sa arate `77.42.76.185`
    - `dig +noall +answer CNAME www.cerniq.app` trebuie sa arate `cerniq.app`
    - `dig +noall +answer A api.cerniq.app admin.cerniq.app staging.cerniq.app api.staging.cerniq.app admin.staging.cerniq.app` trebuie sa arate `77.42.76.185`
    - `dig +noall +answer A otel-cerniq.neanelu.ro` trebuie sa arate `77.42.76.185`
  - Status: IMPLEMENTAT (aplicat in Cloudflare)
  - Verificare rapida (fara cache local/ISP):
    - `dig +noall +answer @1.1.1.1 A cerniq.app` -> `77.42.76.185` (TTL 60)
    - `dig +noall +answer @8.8.8.8 A cerniq.app` -> `77.42.76.185` (TTL 60)

- `f1-51-hz247-iptables-prometheus-scrape`
  - Repo template: `infra/config/iptables/hz247-cerniq-inbound.rules`
  - Aplicat pe `hz.247` (aditiv): `iptables-restore --noflush < /tmp/hz247-cerniq-inbound.rules`
  - Scop: permite scrape Prometheus de pe orchestrator (`10.0.0.2`) catre:
    - node-exporter `9100` pe CT107/108/109/110
    - cAdvisor `64094` pe CT109/CT110
  - Verificare: `iptables -S FORWARD | egrep '10\\.0\\.0\\.2/32.*10\\.0\\.1\\.(107|108|109|110)/32.*(9100|64094)'`

- `f1-52-compose-cadvisor-replace-docker-metrics`
  - Repo: `infra/docker/docker-compose.yml`
  - Implementare: serviciu `cadvisor` expus pe `64094:8080` (scrape remote de pe Prometheus orchestrator)
  - Verificare: `docker compose config` include `cadvisor` + port `64094`

- `f1-55-compose-remove-signoz-volume`
  - Repo: `infra/docker/docker-compose.yml` (nu defineste `signoz_data`)
  - Test: `tests/e2e/infrastructure/e0-s2-pr01-docker-base.test.ts` verifica explicit ca `signoz_data` NU exista

- `f1-56-delete-deploy-yml-backup`
  - Repo: `.github/workflows/` (fisierul `deploy.yml.backup` nu exista)

- `f1-53-ct108-node-exporter`
  - CT108 (CI runner): `prometheus-node-exporter` este instalat si ruleaza ca serviciu systemd
  - Verificare in CT108: `systemctl is-active prometheus-node-exporter` + `curl -sS http://127.0.0.1:9100/metrics >/dev/null`

- `f1-54-ct108-docker-prune-cron`
  - CT108: cron job in `/etc/cron.d/cerniq-docker-prune`
  - Ruleaza zilnic la `03:00` un `docker system prune` (cu `until=72h`) si logheaza in `/var/log/cerniq-docker-prune.log`

- `f1-57-ct109-resize2fs`
  - CT109 root filesystem este deja extins (~100G) si montat pe `/` (nu a fost necesar `resize2fs`)
  - Verificare: `df -h /` in CT109

- `f1-58-backup-scripts-refactor`
  - Repo: `infra/scripts/pg_dump_daily.sh`, `infra/scripts/pg_dump_critical.sh`, `infra/scripts/backup-pre-deploy.sh`, `infra/scripts/validate-postgres.sh`, `infra/scripts/pg_basebackup_weekly.sh`, `infra/scripts/disaster_recovery_full.sh`
  - Update: elimina complet dependinta de containerul local `cerniq-postgres` (nu mai exista in noua arhitectura)
  - Nou flux:
    - dump/validare: foloseste `DATABASE_URL` din env-file renderizat de OpenBao (`/run/cerniq/runtime-secrets/api/api.env`) si ruleaza un container `postgres:18` pe reteaua `cerniq_backend`
    - basebackup: scriptul este orientat pentru rulare pe CT107 (postgres-main), cu `pg_basebackup` local (fara Docker)

- `f1-59-openbao-scripts-refactor`
  - Repo: `infra/scripts/openbao-backup.sh`, `infra/scripts/openbao-init.sh`, `infra/scripts/openbao-rotate-static-secrets.sh`
  - Update:
    - URL OpenBao ramane central: `https://s3cr3ts.neanelu.ro`
    - `openbao-init.sh` este marcat ca obsolet (OpenBao este centralizat pe orchestrator; init/unseal nu se face pe CT109/CT110)
    - `openbao-rotate-static-secrets.sh` este aliniat la KV v1 (fara `kv patch`) si la AppRole names Cerniq (`cerniq-api`, `cerniq-workers`, `cerniq-cicd`, `cerniq-infra`)

#### DNS si routing (Traefik orchestrator)

- Domenii Cerniq (routing pe Traefik orchestrator 77.42.76.185):
  - productie: `cerniq.app`, `api.cerniq.app`, `admin.cerniq.app` (+ redirect `www.cerniq.app`)
  - staging: `staging.cerniq.app`, `api.staging.cerniq.app`, `admin.staging.cerniq.app`
- OTLP intake Cerniq (observability):
  - host: `otel-cerniq.neanelu.ro` (TLS cloudflare)
  - upstream: `http://127.0.0.1:4318` (OTEL Collector central pe orchestrator)
  - acces permis doar din CT109/CT110 via allowlist IP (Cerniq-only)
- Config Traefik in repo: `infra/config/traefik-orchestrator/cerniq.yml`
- Deploy pe orchestrator:
  - fisier proiect: `/opt/traefik/dynamic/cerniq.yml`
  - config agregat: `/opt/traefik/dynamic_conf.yml` (contine si alte proiecte)
  - merge: se face controlat (middlewares/routers/services) fara a suprascrie alte proiecte

#### Reguli de retea (hz.247 FORWARD) — aditive

- Template in repo: `infra/config/iptables/hz247-cerniq-inbound.rules`
- Reguli necesare pentru ingress din orchestrator (10.0.0.2/32) catre CT109/CT110 pe porturi Cerniq:
  - `64000` (web)
  - `64010` (api)
  - `64012` (admin)
- Reguli pentru observability pull (Prometheus node-exporter 9100) sunt aditive si separate de regulile de ingress.
- Reguli suplimentare (aditive) pentru Redis shared pe orchestrator:
  - CT109/CT110 -> orchestrator `10.0.0.2:6379` (TCP)

#### PostgreSQL (CT 107 `postgres-main`)

- Host: `10.0.1.107:5432`
- DB-uri:
  - `cerniq` (prod)
  - `cerniq_staging` (staging)
- Acces:
  - aplicatia foloseste PgBouncer din CT109/CT110 (nu exista postgres container local)
  - OpenBao foloseste un user dedicat pentru credentiale dinamice (ex: `cerniq_vault`) prin reguli `pg_hba.conf` aditive
- Extensii PostgreSQL 18 (verificat):
  - PostGIS: `postgresql-18-postgis-3` (3.6.2)
  - pgvector: `postgresql-18-pgvector` (0.8.1)
  - Verificare: `dpkg -l | egrep "postgresql-18-postgis-3|postgresql-18-pgvector"` in CT107
- Init DB `cerniq` (verificat, idempotent, fara parole hardcodate):
  - Repo: `infra/config/postgres/init-ct107.sql`
  - Rulat ca `postgres` pe CT107: `psql -d cerniq -f /tmp/init-ct107.sql`
  - Verificari:
    - extensii: `SELECT extname FROM pg_extension ...` -> `vector, postgis, postgis_topology, pg_trgm, uuid-ossp, pg_stat_statements`
    - scheme: `bronze, silver, gold, approval, audit`
    - tabela: `public.tenants` exista (`to_regclass('public.tenants')`)
- Init DB `cerniq_staging` (verificat, idempotent, fara parole hardcodate):
  - Repo: `infra/config/postgres/init-ct107.sql`
  - Rulat ca `postgres` pe CT107: `psql -d cerniq_staging -f /tmp/init-ct107.sql`
  - Verificari: aceleasi extensii/scheme + `public.tenants` exista
- `pg_hba.conf` (verificat, aditiv):
  - Reguli Cerniq (scram-sha-256) prezente:
    - `host cerniq cerniq_vault 10.0.0.2/32 scram-sha-256`
    - `host cerniq_staging cerniq_vault 10.0.0.2/32 scram-sha-256`
    - `host cerniq c3rn1q 10.0.1.109/32 scram-sha-256`
    - `host cerniq_staging c3rn1q 10.0.1.110/32 scram-sha-256`
  - Script idempotent (repo): `infra/scripts/ct107_patch_pg_hba.py`
  - Reload: `SELECT pg_reload_conf();`
- `postgresql.conf` / runtime settings (verificat; CT107 este shared, include si DB `zitadel`):
  - `shared_buffers=8GB`
  - `effective_cache_size=24GB`
  - `work_mem=64MB`
  - `maintenance_work_mem=1GB`
  - `max_connections=200`
  - WAL:
    - `wal_level=replica`
    - `archive_mode=on`
    - `archive_command='cp %p /var/lib/postgresql/18/main/wal_archive/%f'`
    - director `wal_archive` exista si contine fisiere WAL arhivate
  - `listen_addresses='*'` (nu a fost restrictionat)
  - Verificare: `SHOW ...` in CT107 + `ls -la /var/lib/postgresql/18/main/wal_archive`

#### OpenBao (centralizat pe orchestrator)

- URL: `https://s3cr3ts.neanelu.ro`
- In Cerniq nu ruleaza server OpenBao local; doar agenti OpenBao (sidecar) care materializeaza secrete in volume:
  - `openbao-agent-api` -> `/secrets/api.env`
  - `openbao-agent-workers` -> `/secrets/workers.env`
- Database secrets engine (Cerniq, dedicat):
  - Mount: `cerniq-db/` (separat de alte proiecte)
  - Config: `cerniq-db/config/cerniq-postgres` -> CT107 `10.0.1.107:5432` (bootstrap parola `cerniq_vault`, apoi `rotate-root`)
  - Credentiale: user `cerniq_vault` pe CT107; parola este gestionata de OpenBao si nu este stocata in repo
  - Roluri dinamice (DB creds):
    - `cerniq-db/roles/api-dynamic` (TTL 1h)
    - `cerniq-db/roles/workers-dynamic` (TTL 1h)
    - `cerniq-db/roles/readonly-dynamic` (TTL 30m)
    - Test (fara a expune user/pass): `bao read -format=json cerniq-db/creds/api-dynamic >/dev/null`
- KV (secrete statice Cerniq) — verificat existent:
  - Mount: `secret/` (kv v1)
  - Path-uri prezente:
    - `secret/cerniq/api/config`
    - `secret/cerniq/shared/external`
  - Verificare (fara output): `bao kv get -mount=secret -format=json cerniq/api/config >/dev/null`
- AppRole (auto-auth pentru OpenBao Agent) — verificat existent:
  - Auth method: `approle/`
  - Roluri:
    - `auth/approle/role/cerniq-api`
    - `auth/approle/role/cerniq-workers`
    - `auth/approle/role/cerniq-cicd`
  - Credentiale pe CT109/CT110 (host files, montate in containerele agent):
    - `/opt/cerniq/secrets/api_role_id`, `/opt/cerniq/secrets/api_secret_id`
    - `/opt/cerniq/secrets/workers_role_id`, `/opt/cerniq/secrets/workers_secret_id`
  - Nota (LXC unprivileged): aceste fisiere trebuie sa fie readable pentru container (ex: `chmod 644`) ca agentul sa le poata citi.
  - Repo runtime: aceste fisiere sunt montate ca `/openbao/config/{role_id,secret_id}` in `openbao-agent-*` (vezi `infra/docker/docker-compose.yml`)
- Config agenti in repo:
  - `infra/config/openbao/agent-api.hcl`
  - `infra/config/openbao/agent-workers.hcl`
  - `infra/config/openbao/agent-infra.hcl`
- Routing intern OpenBao (CT109/CT110 -> orchestrator):
  - Pentru a forta traficul catre `https://s3cr3ts.neanelu.ro` strict prin gateway-ul intern stabil (similar observability/redis), pe CT109/CT110 exista o intrare in `/etc/hosts`:
    - `10.0.1.10 s3cr3ts.neanelu.ro` (hz.247 L4 -> orchestrator `10.0.0.2:443`)
  - Verificare pe CT: `getent hosts s3cr3ts.neanelu.ro` trebuie sa arate `10.0.1.10`.

#### Redis shared (orchestrator)

- Redis ruleaza centralizat pe orchestrator ca container `redis-shared` si este expus doar intern pe `10.0.0.2:6379` (nu pe IP-ul public).
- Izolare: ACL user dedicat `cerniq` cu key pattern `~cerniq:*` (prefix recomandat: `cerniq:`).
- Cerniq (CT109/CT110) se conecteaza la Redis prin `REDIS_URL` randat de OpenBao in `/secrets/api.env` si `/secrets/workers.env`.
- BullMQ: pentru a evita coliziuni intre aplicatii in Redis shared, folosim:
  - `REDIS_PREFIX=cerniq:` (prefix general chei aplicatie)
  - `BULLMQ_PREFIX=cerniq` (fara `:`) pentru cheile BullMQ (BullMQ adauga separator `:` intern)
  - Smoke test (repo): `pnpm smoke:bullmq-prefix` (creeaza un job si verifica pattern-ul cheilor sub prefix, apoi curata)

#### Migrare date (prod vechi -> infrastructura noua)

- Prod vechi: `95.216.225.145` (host "erp", Docker: `cerniq-postgres`, `cerniq-redis`).
- Artefacte migrate (copiate pe CT109 pentru audit/referinta): `/opt/cerniq/migration/`
  - `cerniq_db.dump` (dump db-only, format custom) — dump-ul folosit pentru restore pe CT107.
  - `cerniq_full_dump.sql.gz` (pg_dumpall, informational/forensic; NU se aplica pe CT107 pentru ca CT107 e shared).
  - `cerniq_redis_data.tgz` (Redis AOF preamble: `/data/appendonlydir/*` din vechiul container).
  - `cerniq_pg_volumes_and_config.tgz` (volum PG vechi + config-uri vechi, doar ca referinta).
- Restore DB prod pe CT107 (shared):
  - Comanda folosita (executata): `pg_restore --clean --if-exists --no-owner --no-privileges -d cerniq /opt/cerniq/migration/cerniq_db.dump`
  - Verificare (executata): extensii prezente (postgis, vector, pg_trgm, pg_stat_statements etc) + tabele restaurate.

#### Docker stack Cerniq (CT 109/110)

- Compose (repo):
  - baza: `infra/docker/docker-compose.yml`
  - override prod: `infra/docker/docker-compose.prod.yml`
  - override dev: `infra/docker/docker-compose.dev.yml`
- Servicii core:
  - `pgbouncer` conectat la CT107:5432
    - Sursa de adevar: OpenBao (nu secrete hardcodate in repo)
    - Config/auth sunt randate de `openbao-agent-infra` in tmpfs:
      - `/run/cerniq/runtime-secrets/infra/pgbouncer.ini`
      - `/run/cerniq/runtime-secrets/infra/userlist.txt`
    - PgBouncer monteaza directorul `.../infra` ca `/etc/pgbouncer` (read-only)
    - Client auth prin `auth_query` (nu userlist cu verifiere statica):
      - pe CT107 exista rol `cerniq_pgbouncer_auth` + functia `public.cerniq_pgbouncer_get_auth(username)` (SECURITY DEFINER) care returneaza verifiere SCRAM doar pentru roluri membre in `c3rn1q`
      - parola `cerniq_pgbouncer_auth` este stocata in OpenBao KV: `secret/cerniq/infra/pgbouncer` si randata doar la runtime in tmpfs
    - DB per mediu este determinat in template pe baza `CERNIQ_ENV`:
      - `production` -> `cerniq`
      - `staging` -> `cerniq_staging`
  - Redis NU ruleaza local (este shared pe orchestrator)
  - `openbao-agent-api`, `openbao-agent-workers` (pinned)
  - `vector` (logs) + `otel-collector` (traces/metrics) + `cadvisor` (docker metrics)
- Runtime Node in imaginile placeholder: Node 25 (Feb 2026 current)

#### Observabilitate Cerniq (integrat in stack-ul centralizat)

- Logs: Vector -> Loki prin `https://logs-cerniq.neanelu.ro` (Cerniq-only push endpoint)
  - Config in repo: `infra/config/vector/vector.toml`
  - Labels: `project="cerniq"`, `environment` din `CERNIQ_ENV`, `host` hostname
  - Intern-only (fara NAT/public): pe CT109/CT110 folosim `extra_hosts` in compose pentru a rezolva domeniul catre gateway-ul intern:
    - `logs-cerniq.neanelu.ro -> 10.0.1.10` (hz.247, HAProxy TCP passthrough)
    - Astfel, Traefik poate aplica allowlist pe o sursa interna stabila si traficul ramane pe reteaua privata
- OTEL: `otel-collector` local expune OTLP (4317/4318) pentru aplicatie si poate forwarda catre orchestrator prin HTTPS (route dedicata).
  - Intern-only (fara NAT/public): pe CT109/CT110 folosim `extra_hosts`:
    - `otel-cerniq.neanelu.ro -> 10.0.1.10`
  - Nota: Traefik middleware allowlist include si `10.0.1.10/32` pentru scenariul gateway-ului intern (vezi `f1-46`)
- Prometheus rules (Cerniq-only, aditiv):
  - Orchestrator: `/opt/observability/prometheus/rules/infra-cerniq-alerts.yml` (NodeDown/DiskLow/MemoryLow)
- Grafana dashboards (Cerniq-only, provisioning):
  - Folder: `Cerniq`
  - Path pe orchestrator: `/opt/observability/grafana/dashboards/cerniq/`

#### CI/CD (CT 108 runner)

- Workflows:
  - CI: `.github/workflows/ci-pr.yml`
  - CD: `.github/workflows/deploy.yml`
- CD sincronizeaza pe target (CT109/CT110) configuratii + compose si poate sincroniza (prin SSH) si configuratia Traefik pentru Cerniq.
- GitHub Secrets (aliniate la noua infrastructura):
  - `STAGING_HOST=10.0.1.110`, `STAGING_USER=deploy`
  - `PRODUCTION_HOST=10.0.1.109`, `PRODUCTION_USER=deploy`
  - `STAGING_SSH_KEY` si `PRODUCTION_SSH_KEY`: cheie dedicata de deploy (instalata in `~deploy/.ssh/authorized_keys` pe CT109/CT110).
  - CI foloseste exclusiv OpenBao orchestrator prin `OPENBAO_ADDR` + AppRole CI/CD (`OPENBAO_CICD_ROLE_ID`, `OPENBAO_CICD_SECRET_ID`); `secret_id` poate fi rotit fara a schimba codul pipeline-ului.

#### OpenBao DB creds TTL (stabilitate)

- Dinamic DB creds (`cerniq-db/creds/api-dynamic` si `workers-dynamic`) au fost setate cu TTL mai mare (default 12h, max 72h) pentru a evita expirarea frecventa (care produce "no such user" in PgBouncer cand userul expira intre rulari).

#### Backup DB (CT107)

- CT107 ruleaza PostgreSQL nativ; backup-ul logic pentru DB `cerniq` este facut local prin cron:
  - Script: `/opt/cerniq/scripts/ct107_pg_dump_cerniq.sh` (ruleaza ca `postgres`, fara parole)
  - Cron: `/etc/cron.d/ct107-cerniq-pg-dump`
  - Output: `/var/backups/cerniq/pg/cerniq_*.dump` (retentie locala 14 zile; upload offsite se face separat)

#### Validare ingress staging (f2-10, executat 2026-02-15)

Scop: validare end-to-end a tuturor cailor de ingress pentru staging (CT110) pe 3 straturi:

- Layer 1 (direct): hz.223 node -> CT110 IP
- Layer 2 (gateway): orchestrator -> VIP 10.0.1.10 (HAProxy hz.247 TCP passthrough) -> CT110
- Layer 3 (Traefik): orchestrator Traefik HTTPS -> VIP -> CT110

Metoda:

- Health responder temporar (Python3) deployat pe CT110 pe porturile app (64000/64010/64012).
- Script de validare (repo): `infra/scripts/staging_validate_ingress.py` + `infra/scripts/staging_health_responder.py`
- Responder-ul este uploadat temporar (SSH + `pct push`), rulat, testat, apoi curat.

Drift remediat in timpul validarii:

- `dynamic_conf.yml` (runtime SoT Traefik pe orchestrator) avea URL-uri directe catre CT-uri (`10.0.1.110:64000`) in loc de URL-uri gateway VIP (`10.0.1.10:19000`).
- Script remediere (repo): `infra/scripts/traefik_fix_cerniq_service_urls.py`
- Backup creat pe orchestrator: `/opt/traefik/dynamic_conf.yml.bak.20260215T225332Z`
- Fix aplicat: 6 URL-uri (3 prod + 3 staging) actualizate la VIP gateway.
- Traefik a reloadat automat (watch: true) si backend-urile au trecut la status UP.

Rezultate validare (12/12 PASS):

| Strat      | Serviciu | Target                                                        | HTTP |
| ---------- | -------- | ------------------------------------------------------------- | ---- |
| L1-direct  | web      | `http://10.0.1.110:64000/health`                              | 200  |
| L1-direct  | api      | `http://10.0.1.110:64010/health`                              | 200  |
| L1-direct  | admin    | `http://10.0.1.110:64012/health`                              | 200  |
| L2-gateway | web      | `http://10.0.1.10:19000/health`                               | 200  |
| L2-gateway | api      | `http://10.0.1.10:19010/health`                               | 200  |
| L2-gateway | admin    | `http://10.0.1.10:19012/health`                               | 200  |
| L3-traefik | web      | `https://staging.cerniq.app/health` (resolve 127.0.0.1)       | 200  |
| L3-traefik | api      | `https://api.staging.cerniq.app/health` (resolve 127.0.0.1)   | 200  |
| L3-traefik | admin    | `https://admin.staging.cerniq.app/health` (resolve 127.0.0.1) | 200  |
| L3-public  | web      | `https://77.42.76.185/health` Host: staging.cerniq.app        | 200  |
| L3-public  | api      | `https://77.42.76.185/health` Host: api.staging.cerniq.app    | 200  |
| L3-public  | admin    | `https://77.42.76.185/health` Host: admin.staging.cerniq.app  | 200  |

Nota: health responder-ul a fost curat dupa validare; porturile 64000/64010/64012 pe CT110 nu mai au listeners activi. Cand aplicatia reala (web/api/admin) va fi deployata, aceste porturi vor fi ocupate de containerele Docker Cerniq.

---

## Server de email — Implementare completa

Data implementare: 2026-02-11
Host: orchestrator (77.42.76.185)
Domeniu: triggerra.app

### Arhitectura generala

Serverul de email este compus din doua containere Docker care ruleaza pe orchestrator, interconectate prin reteaua Docker `traefik_default` si expuse public prin Traefik (reverse proxy) pentru interfetele web si direct pe porturi standard pentru protocoalele de email.

```
Internet
   │
   ├── Port 25 (SMTP)        ──► stalwart (MTA inbound/outbound)
   ├── Port 465 (SMTPS)      ──► stalwart (submission implicit TLS)
   ├── Port 587 (Submission)  ──► stalwart (submission STARTTLS)
   ├── Port 143 (IMAP)       ──► stalwart (mailbox access)
   ├── Port 993 (IMAPS)      ──► stalwart (mailbox access TLS)
   ├── Port 4190 (ManageSieve)──► stalwart (filtre sieve)
   │
   ├── HTTPS webmail.triggerra.app   ──► Traefik ──► roundcube:80
   └── HTTPS mailadmin.triggerra.app ──► Traefik ──► stalwart:8080
                                                         │
                                                   StorageBox BX11
                                                   (blob storage /data)
```

### Componente

#### 1. Stalwart Mail Server v0.15.4

- **Imagine Docker**: `stalwartlabs/stalwart:v0.15.4`
- **Container**: `stalwart`
- **Rol**: MTA (Mail Transfer Agent) + MDA (Mail Delivery Agent) + server IMAP/POP3/Sieve + admin API
- **IP intern Docker**: 172.18.0.3 (retea `traefik_default`)

**Docker Compose** (`/opt/stalwart/docker-compose.yml`):

```yaml
services:
  stalwart:
    image: stalwartlabs/stalwart:v0.15.4
    container_name: stalwart
    restart: unless-stopped
    ports:
      - "25:25" # SMTP inbound
      - "465:465" # SMTPS (submission implicit TLS)
      - "587:587" # Submission (STARTTLS)
      - "143:143" # IMAP
      - "993:993" # IMAPS
      - "4190:4190" # ManageSieve
    volumes:
      - /opt/stalwart/etc:/opt/stalwart/etc # configuratie
      - /opt/stalwart/var:/opt/stalwart/var # date runtime
      - /opt/stalwart/storagebox/mailbox:/data # blob storage (StorageBox)
    networks:
      - traefik_default
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=traefik_default"
      - "traefik.http.routers.stalwart.rule=Host(`mailadmin.triggerra.app`)"
      - "traefik.http.routers.stalwart.entrypoints=websecure"
      - "traefik.http.routers.stalwart.tls.certresolver=cloudflare"
      - "traefik.http.services.stalwart.loadbalancer.server.port=8080"

networks:
  traefik_default:
    external: true
```

**Configuratie principala** (`/opt/stalwart/etc/config.toml`):

```toml
# Listeners
[server.listener.smtp]
bind = "[::]:25"
protocol = "smtp"

[server.listener.submission]
bind = "[::]:587"
protocol = "smtp"

[server.listener.submissions]
bind = "[::]:465"
protocol = "smtp"
tls.implicit = true

[server.listener.imap]
bind = "[::]:143"
protocol = "imap"

[server.listener.imaptls]
bind = "[::]:993"
protocol = "imap"
tls.implicit = true

[server.listener.pop3]
bind = "[::]:110"
protocol = "pop3"

[server.listener.pop3s]
bind = "[::]:995"
protocol = "pop3"
tls.implicit = true

[server.listener.sieve]
bind = "[::]:4190"
protocol = "managesieve"

[server.listener.https]
protocol = "http"
bind = "[::]:443"
tls.implicit = true

[server.listener.http]
protocol = "http"
bind = "[::]:8080"

# Storage
[storage]
data = "rocksdb"          # metadata, configuratie, conturi
fts = "rocksdb"           # full-text search index
blob = "fs"               # email blobs (pe StorageBox)
lookup = "rocksdb"        # lookup tables
directory = "internal"    # directorul de useri

[store.rocksdb]
type = "rocksdb"
path = "/opt/stalwart/data"
compression = "lz4"

[store.fs]
type = "fs"
path = "/data"            # montat din StorageBox via CIFS

[directory.internal]
type = "internal"
store = "rocksdb"

# Logging
[tracer.log]
type = "log"
level = "info"
path = "/opt/stalwart/logs"
prefix = "stalwart.log"
rotate = "daily"
ansi = false
enable = true

# Admin fallback
[authentication.fallback-admin]
user = "admin"
secret = "$6$..." # SHA-512 hash

# Server identity
[server]
hostname = "mail.triggerra.app"

# TLS — ACME Let's Encrypt cu Cloudflare DNS-01
[acme."letsencrypt"]
directory = "https://acme-v02.api.letsencrypt.org/directory"
challenge = "dns-01"
contact = ["postmaster@triggerra.app"]
domains = ["mail.triggerra.app"]
cache = "/opt/stalwart/etc/acme"
renew-before = "30d"
default = true
provider = "cloudflare"
secret = "<CLOUDFLARE_ALL_ZONES_TOKEN>"
origin = "triggerra.app"

# DKIM Signing — dual signature (Ed25519 + RSA)
[auth.dkim]
sign = "['ed25519-triggerra.app', 'rsa-triggerra.app']"

# ARC Sealing
[auth.arc]
seal = "ed25519-triggerra.app"
```

**Storage — Hetzner StorageBox BX11**:

- Sub-account: `u502048-sub1`
- Server: `u502048-sub1.your-storagebox.de`
- Protocol: SMB/CIFS v3.0
- Mount point host: `/opt/stalwart/storagebox`
- Mount point container: `/data` (blob store — fisiere email)
- Permisiuni: uid=0, gid=0, dir_mode=0700, file_mode=0600

Intrare fstab:

```
//u502048-sub1.your-storagebox.de/u502048-sub1 /opt/stalwart/storagebox cifs \
  credentials=/root/.credentials/storagebox-smb,uid=0,gid=0,\
  dir_mode=0700,file_mode=0600,iocharset=utf8,vers=3.0,\
  serverino,nofail,x-systemd.automount 0 0
```

**Conturi utilizatori**:

| Cont  | Rol                    | Acces                                    |
| ----- | ---------------------- | ---------------------------------------- |
| admin | Administrator Stalwart | API + Admin UI (mailadmin.triggerra.app) |
| alex  | Utilizator email       | <alex@triggerra.app>, IMAP/SMTP/Webmail  |

#### 2. Roundcube Webmail

- **Imagine Docker**: `roundcube/roundcubemail:1.6.x-apache`
- **Container**: `roundcube`
- **Rol**: Client webmail (interfata web pentru citire/trimitere email)
- **IP intern Docker**: 172.18.0.4 (retea `traefik_default`)
- **URL public**: <https://webmail.triggerra.app> (prin Traefik)

**Docker Compose** (`/opt/roundcube/docker-compose.yml`):

```yaml
services:
  roundcube:
    image: roundcube/roundcubemail:1.6.x-apache
    container_name: roundcube
    restart: unless-stopped
    environment:
      ROUNDCUBEMAIL_DEFAULT_HOST: ssl://stalwart
      ROUNDCUBEMAIL_DEFAULT_PORT: 993
      ROUNDCUBEMAIL_SMTP_SERVER: ssl://stalwart
      ROUNDCUBEMAIL_SMTP_PORT: 465
      ROUNDCUBEMAIL_UPLOAD_MAX_FILESIZE: 25M
      ROUNDCUBEMAIL_SKIN: elastic
      ROUNDCUBEMAIL_PLUGINS: archive,zipdownload,managesieve
      ROUNDCUBEMAIL_ASPELL_DICTS: en
    volumes:
      - roundcube_data:/var/roundcube
      - roundcube_db:/var/roundcube/db
      - roundcube_config:/var/www/html/config
      - /opt/roundcube/custom-config/zcustom.inc.php:/var/www/html/config/zcustom.inc.php:ro
    networks:
      - traefik_default
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.roundcube.rule=Host(`webmail.triggerra.app`)"
      - "traefik.http.routers.roundcube.entrypoints=websecure"
      - "traefik.http.routers.roundcube.tls.certresolver=cloudflare"
      - "traefik.http.services.roundcube.loadbalancer.server.port=80"

volumes:
  roundcube_data:
  roundcube_db:
  roundcube_config:

networks:
  traefik_default:
    external: true
```

**Configuratie custom** (`/opt/roundcube/custom-config/zcustom.inc.php`):

```php
<?php
  // Domain identity — asigura ca From: este alex@triggerra.app
  $config['mail_domain'] = 'triggerra.app';

  // TLS — SNI catre mail.triggerra.app (necesar deoarece hostname Docker
  // este 'stalwart' dar certificatul Let's Encrypt este pe 'mail.triggerra.app')
  $config['imap_conn_options'] = array(
    'ssl' => array(
      'verify_peer' => true,
      'verify_peer_name' => true,
      'allow_self_signed' => false,
      'peer_name' => 'mail.triggerra.app',
      'SNI_enabled' => true,
      'SNI_server_name' => 'mail.triggerra.app',
    ),
  );
  $config['smtp_conn_options'] = array(
    'ssl' => array(
      'verify_peer' => true,
      'verify_peer_name' => true,
      'allow_self_signed' => false,
      'peer_name' => 'mail.triggerra.app',
      'SNI_enabled' => true,
      'SNI_server_name' => 'mail.triggerra.app',
    ),
  );
```

### Subdomenii si routing Traefik

| Subdomeniu              | Destinatie              | Scop                                    |
| ----------------------- | ----------------------- | --------------------------------------- |
| mail.triggerra.app      | 77.42.76.185 (direct)   | Hostname MX, rDNS, EHLO, certificat TLS |
| webmail.triggerra.app   | Traefik → roundcube:80  | Interfata webmail Roundcube             |
| mailadmin.triggerra.app | Traefik → stalwart:8080 | Admin UI Stalwart                       |

### Securitate email — DNS Records (Cloudflare)

Toate recordurile sunt gestionate in zona Cloudflare `triggerra.app` (Zone ID: `9a7053b196671d25663d9696b6854455`).

#### MX Record

```
triggerra.app.    MX    10    mail.triggerra.app.
```

#### A Records

```
mail.triggerra.app.        A    77.42.76.185
mailadmin.triggerra.app.   A    77.42.76.185
webmail.triggerra.app.     A    77.42.76.185
```

#### rDNS (PTR)

```
77.42.76.185    →    mail.triggerra.app.
```

Setat prin Hetzner Cloud API (server ID: 120087891).

#### SPF

```
triggerra.app.    TXT    "v=spf1 a mx ip4:77.42.76.185 -all"
```

- `a` — IP-ul din A record-ul triggerra.app
- `mx` — IP-ul serverului MX
- `ip4:77.42.76.185` — IP explicit al serverului de email
- `-all` — hardfail (orice alt IP este respins)

#### DMARC

```
_dmarc.triggerra.app.    TXT    "v=DMARC1; p=reject; adkim=s; aspf=s; pct=100;
                                  rua=mailto:postmaster@triggerra.app;
                                  ruf=mailto:postmaster@triggerra.app; fo=1"
```

- `p=reject` — emailurile care nu trec DKIM/SPF sunt respinse
- `adkim=s` — strict DKIM alignment (domeniul DKIM = domeniul From)
- `aspf=s` — strict SPF alignment (domeniul envelope = domeniul From)
- `pct=100` — se aplica la 100% din emailuri
- `fo=1` — trimite raport forensic la orice esec

#### DKIM (dual — Ed25519 + RSA)

**Ed25519** (selector: `202602e`):

```
202602e._domainkey.triggerra.app.    TXT    "v=DKIM1; k=ed25519; h=sha256;
    p=dIBjWZrMWCfE9GzU3t2ReUG2a984KKMgChFMNtwtzlo="
```

**RSA-2048** (selector: `202602r`):

```
202602r._domainkey.triggerra.app.    TXT    "v=DKIM1; k=rsa; h=sha256;
    p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu5ZkXG..."
```

Ambele chei private sunt stocate in baza de date RocksDB a Stalwart (prefix `signature.*`).
Emailurile trimise primesc dubla semnatura DKIM:

- `DKIM-Signature: v=1; a=ed25519-sha256; s=202602e; d=triggerra.app; c=relaxed/relaxed; ...`
- `DKIM-Signature: v=1; a=rsa-sha256; s=202602r; d=triggerra.app; c=relaxed/relaxed; ...`

Headers semnate: `From`, `To`, `Date`, `Subject`, `Message-ID`.

#### TLS-RPT

```
_smtp._tls.triggerra.app.    TXT    "v=TLSRPTv1; rua=mailto:postmaster@triggerra.app"
```

Rapoarte TLS primite la <postmaster@triggerra.app>.

#### MTA-STS

Nu este configurat (nu exista `_mta-sts.triggerra.app` / `mta-sts.triggerra.app/.well-known/mta-sts.txt`).

### Certificat TLS

- **Emitent**: Let's Encrypt (ACME v2)
- **Challenge**: DNS-01 via Cloudflare API
- **Domeniu**: `mail.triggerra.app`
- **Algoritm**: ECDSA (chain E8)
- **Reinnoire automata**: 30 zile inainte de expirare
- **Validitate curenta**: pana la 2026-05-12
- **Utilizare**: SMTP STARTTLS, SMTPS, IMAPS, POP3S, HTTPS admin

### Fluxul unui email trimis (outbound)

```
1. Utilizator compune email in Roundcube (webmail.triggerra.app)
2. Roundcube → SMTPS (port 465, TLS implicit) → stalwart container
3. Stalwart autentifica userul (IMAP internal directory)
4. Stalwart semneaza emailul cu DKIM (Ed25519 + RSA)
5. Stalwart aplica ARC seal (Ed25519)
6. Stalwart face DNS lookup: MX record al domeniului destinatar
7. Stalwart verifica MTA-STS policy al destinatarului
8. Stalwart se conecteaza la MX destinatar pe port 25 (STARTTLS)
9. Email livrat
```

### Fluxul unui email primit (inbound)

```
1. Server extern rezolva MX triggerra.app → mail.triggerra.app (77.42.76.185)
2. Conexiune SMTP pe port 25 → stalwart
3. Stalwart verifica SPF (IP expeditor vs DNS)
4. Stalwart verifica DKIM signature a emailului primit
5. Stalwart verifica ARC chain (daca exista)
6. Stalwart evalueaza DMARC policy
7. Stalwart stocheaza emailul in blob store (/data = StorageBox)
8. Utilizator acceseaza emailul prin IMAPS (993) sau Webmail
```

### Hetzner Cloud — Configurari specifice email

- **Port 25 outbound**: Deblocat prin cerere manuala la Hetzner (aprobat automat 2026-02-11). Hetzner Cloud blocheaza port 25 by default pe toate vServer-urile.
- **rDNS**: Setat prin Hetzner Cloud API — `77.42.76.185` → `mail.triggerra.app`.
- **Server ID**: 120087891 (tip: Cloud vServer, KVM).

### Directoare pe host

```
/opt/stalwart/
├── docker-compose.yml          # Docker Compose Stalwart
├── etc/
│   ├── config.toml             # Configuratie principala Stalwart
│   └── acme/                   # Cache certificat ACME
├── var/                        # Date runtime
├── storagebox/
│   └── mailbox/                # Mount CIFS → StorageBox BX11 (blob store)
└── data/                       # RocksDB local (metadata, FTS, lookup)

/opt/roundcube/
├── docker-compose.yml          # Docker Compose Roundcube
└── custom-config/
    └── zcustom.inc.php         # Config custom (mail_domain, TLS SNI)
```

### Stare verificata la 2026-02-11

| Componenta          | Status          | Detalii                                           |
| ------------------- | --------------- | ------------------------------------------------- |
| Stalwart container  | ✅ Running      | v0.15.4, uptime stabil                            |
| Roundcube container | ✅ Running      | 1.6.x-apache, uptime stabil                       |
| SMTP inbound (25)   | ✅ Functional   | Accepta email de la servere externe               |
| SMTP outbound (25)  | ✅ Functional   | Hetzner port 25 deblocat, livrare la Gmail OK     |
| IMAPS (993)         | ✅ Functional   | Roundcube se conecteaza cu succes                 |
| SMTPS (465)         | ✅ Functional   | Roundcube trimite prin SMTPS                      |
| TLS certificate     | ✅ Valid        | Let's Encrypt, expira 2026-05-12                  |
| SPF                 | ✅ Pass         | `-all` hardfail configurat                        |
| DKIM signing        | ✅ Activ        | Dubla semnatura Ed25519 + RSA pe fiecare email    |
| DMARC               | ✅ Configurat   | `p=reject`, strict alignment                      |
| rDNS                | ✅ Corect       | 77.42.76.185 → mail.triggerra.app                 |
| StorageBox mount    | ✅ Montat       | CIFS v3.0, automount systemd                      |
| Admin UI            | ✅ Accesibil    | mailadmin.triggerra.app (Traefik)                 |
| Webmail             | ✅ Accesibil    | webmail.triggerra.app (Traefik)                   |
| TLS-RPT             | ✅ Configurat   | Rapoarte la <postmaster@triggerra.app>            |
| ARC seal            | ✅ Configurat   | Ed25519                                           |
| MTA-STS             | ⚠️ Neconfigurat | De implementat                                    |
| IP reputation       | ⚠️ Noua         | IP nou Hetzner, fara istoric — risc spam la Gmail |
| Blacklists          | ✅ Curat        | Spamhaus, SpamCop, Barracuda, SORBS — clean       |

### Probleme cunoscute si recomandari

1. **IP reputation noua**: IP-ul 77.42.76.185 este nou si nu are istoric de trimitere. Gmail si alti provideri mari pot marca emailurile ca spam pana la construirea reputatiei. Solutii:
   - IP warming gradual (5-10 emailuri/zi, crescand treptat)
   - Configurare SMTP relay extern (Amazon SES / Mailgun / SendGrid) ca outbound relay in Stalwart
   - Inregistrare Google Postmaster Tools pentru monitorizare reputatie

2. **MTA-STS**: Nu este configurat. Se recomanda adaugarea unui endpoint `mta-sts.triggerra.app/.well-known/mta-sts.txt` si a unui record TXT `_mta-sts.triggerra.app`.

3. **Porturi expuse**: Porturile 110 (POP3) si 995 (POP3S) sunt deschise in container dar nu sunt expuse prin Docker Compose. Portul 143 (IMAP plaintext) este expus — se recomanda utilizarea exclusiva a 993 (IMAPS).

---

## Storage extern — Ctera C800-4 (NAS de acasa)

Data configurare: 2026-02-12

### Arhitectura

```
┌─────────────────────────┐         NFS over Internet          ┌──────────────────────────┐
│  orchestrator           │         (NFSv3/TCP, ~63ms)         │  Home Network            │
│  77.42.76.185           │◄──────────────────────────────────►│  92.180.19.237 (public)  │
│                         │                                    │                          │
│  /mnt/ctera (NFS)       │    Porturi forwardate pe router:   │  Ctera C800-4            │
│  Proxmox: ctera-home    │    111  → 192.168.100.140:111      │  192.168.100.140         │
│                         │    2049 → 192.168.100.140:2049     │  4× HDD, ~13 TB         │
│  WireGuard (pregatit):  │    44881→ 192.168.100.140:44881    │                          │
│  wg-home 10.99.0.1/24   │                                    │                          │
└─────────────────────────┘                                    └──────────────────────────┘
```

### Dispozitiv

| Parametru       | Valoare                          |
| --------------- | -------------------------------- |
| Model           | Ctera C800-4                     |
| IP LAN          | 192.168.100.140                  |
| IP public acasa | 92.180.19.237                    |
| Capacitate      | ~13 TB (4× HDD)                  |
| Protocol NFS    | NFSv3 only (NFSv4 nu e suportat) |
| Latenta         | ~63 ms (Hetzner ↔ acasa)         |

### NFS Export

| Parametru                  | Valoare                                          |
| -------------------------- | ------------------------------------------------ |
| Export path                | `/var/vol/41/ctera_storage_local`                |
| Allowed IP                 | 77.42.76.185/255.255.255.255 (doar orchestrator) |
| Mountpoint pe orchestrator | `/mnt/ctera`                                     |
| Proxmox storage name       | `ctera-home`                                     |
| Content types Proxmox      | backup, iso, vztmpl, snippets                    |

### Port forwards pe router (acasa)

| Port extern | Port intern (192.168.100.140) | Serviciu             | Protocol |
| ----------- | ----------------------------- | -------------------- | -------- |
| 111         | 111                           | portmapper (rpcbind) | TCP      |
| 2049        | 2049                          | NFS                  | TCP      |
| 44881       | 44881                         | mountd (dinamic!)    | TCP      |

> **Atentie**: Portul mountd (44881) este alocat dinamic de Ctera. La restart Ctera, se poate schimba.
> Daca se schimba, trebuie actualizat port forward-ul pe router SI fstab pe orchestrator.
> Ideal: configura un port fix pentru mountd din interfata Ctera (daca permite).

### Configurare pe orchestrator

**fstab** (`/etc/fstab`):

```
92.180.19.237:/var/vol/41/ctera_storage_local /mnt/ctera nfs nfsvers=3,nolock,tcp,mountport=44881,soft,timeo=150,retrans=3,_netdev,nofail,x-systemd.automount 0 0
```

Optiuni importante:

- `nfsvers=3` — Ctera nu suporta NFSv4
- `nolock` — fara NLM lock manager (nu e necesar, evita probleme cu porturi aditionale)
- `tcp` — transport TCP (nu UDP)
- `mountport=44881` — bypass portmapper, direct la mountd
- `soft` — operatiile NFS returneaza eroare dupa timeout (nu blocheaza kernel-ul)
- `timeo=150` — timeout 15 secunde per operatie
- `_netdev` — asteapta retea inainte de mount
- `nofail` — boot-ul continua daca mount-ul esueaza
- `x-systemd.automount` — mount la prima accesare, nu la boot

**Proxmox storage** (`/etc/pve/storage.cfg`):

```
dir: ctera-home
    path /mnt/ctera
    content backup,iso,vztmpl,snippets
    shared 0
```

### Performanta masurata

| Metric                    | Valoare    |
| ------------------------- | ---------- |
| Write (100 MB secvential) | 36.6 MB/s  |
| Read (100 MB, cached)     | 4.1 GB/s   |
| Latenta retea             | ~63 ms RTT |

> **Nota**: Read-ul mare este din cache Linux. Write-ul real de ~37 MB/s este limitat de latenta (~63ms RTT).
> **Nu se recomanda** pentru disk-uri VM/CT (IOPS slab). Ideal pentru: backup-uri, ISO-uri, template-uri, arhive.

### Securitate — Restricție acces

Testat la 2026-02-12:

| Sursa                    | IP            | Port 111 | Port 2049 | Port 44881 | NFS Mount      |
| ------------------------ | ------------- | -------- | --------- | ---------- | -------------- |
| orchestrator (autorizat) | 77.42.76.185  | OK       | OK        | OK         | **FUNCTIONAL** |
| hz.215 (neautorizat)     | 95.216.36.215 | TIMEOUT  | TIMEOUT   | TIMEOUT    | **BLOCAT**     |

- Port forward-urile pe router sunt configurate sa accepte conexiuni doar de la IP-ul orchestratorului
- Ctera NFS export are restricție IP: 77.42.76.185/255.255.255.255
- Dubla protectie: router (layer 3) + Ctera NFS allowed hosts (layer 7)

**Recomandare**: Adauga reguli explicite de firewall pe router care permit trafic inbound **doar** de la 77.42.76.185 pe porturile 111, 2049, 44881 — si DROP tot restul. Asta e o regula explicita, nu doar lipsa unui port forward.

### WireGuard VPN (pregatit, neactivat)

Interfata `wg-home` este configurata pe orchestrator dar **tunelul nu este stabilit** (nu exista un peer WireGuard activ la acasa).

**Config orchestrator** (`/etc/wireguard/wg-home.conf`):

```ini
[Interface]
Address = 10.99.0.1/24
ListenPort = 51820
PrivateKey = (stocat local)

[Peer]
PublicKey = LEH3HPvFnEINQkOBYCN3jiMTxaAmGgQOlbAgL/1cwEg=
AllowedIPs = 10.99.0.2/32, 192.168.100.0/24
Endpoint = 92.180.19.237:51820
PersistentKeepalive = 25
```

**Chei** (stocate in `~/.env` pe MacBook):

```
WG_ORCHESTRATOR_PUBLIC_KEY=z78VcOe+/Ip86Ujc7+jRxYAvTzhc5InxQ7ARikbYgz8=
WG_HOME_PRIVATE_KEY=GJw6yAGPyEzkcQBeIXicBAHN6Qpu8mQXwLpI8p/PDlQ=
WG_HOME_PUBLIC_KEY=LEH3HPvFnEINQkOBYCN3jiMTxaAmGgQOlbAgL/1cwEg=
WG_ORCHESTRATOR_ENDPOINT=77.42.76.185:51820
WG_HOME_ADDRESS=10.99.0.2/24
```

**Plan viitor**: Ruta NFS prin WireGuard VPN (10.99.0.0/24) in loc de port forwards directe. Avantaje:

- Trafic NFS criptat (acum e plaintext)
- Nu mai e nevoie de port forwards pe router
- Portul mountd dinamic nu mai e o problema (traficul intra prin VPN la IP-ul intern 192.168.100.140)
- Securitate superioara (doar WireGuard UDP/51820 expus, restul prin tunel)

---

## Observabilitate centralizata (implementat)

Data implementare: 2026-02-12  
Host: orchestrator (`/opt/observability`)  
UI publice prin Traefik + Cloudflare:

- `grafana.neanelu.ro`
- `metrics.neanelu.ro`
- `logs.neanelu.ro`
- `traces.neanelu.ro`

### Scop si acoperire

Obiectivul implementarii este monitorizare centralizata pentru infrastructura de baza (orchestrator + noduri core Proxmox), cu separare clara intre:

- **metrics** (stare sistem / capacitate / availability)
- **logs** (audit operational / debugging)
- **traces** (telemetrie aplicatii prin OTLP)

Scope actual:

- orchestrator
- noduri core cluster: `hz.215`, `hz.247`, `hz.223`

### Arhitectura logica (high-level)

```text
Host metrics (node-exporter, cadvisor) -----> Prometheus -----> Grafana
Proxmox API metrics (pve-exporter) ---------> Prometheus -----> Grafana
TCP probes (blackbox-exporter) -------------> Prometheus -----> Alertmanager

Docker logs (Vector) -----------------------> Loki -----------> Grafana
OTLP traces (OTel Collector) ---------------> Tempo ----------> Grafana

Internet -> Cloudflare (proxied DNS) -> Traefik (TLS LE) -> Grafana/Prometheus/Loki/Tempo
```

### Componente active

- Grafana (`grafana/grafana:latest`) — UI unificat pentru metrics/logs/traces
- Prometheus (`prom/prometheus:latest`) — scrape + reguli + retention metrics
- Alertmanager (`prom/alertmanager:latest`) — pipeline alerting
- Loki (`grafana/loki:latest`) — storage logs
- Tempo (`grafana/tempo:latest`) — storage traces
- OTel Collector (`otel/opentelemetry-collector-contrib:latest`) — receiver OTLP si forward catre Tempo
- Vector (`timberio/vector:0.53.0-debian`) — colectare logs Docker + forward catre Loki
- node-exporter (`prom/node-exporter:latest`) — metrics host
- cAdvisor (`gcr.io/cadvisor/cadvisor:latest`) — metrics containere
- blackbox-exporter (`prom/blackbox-exporter:latest`) — probe TCP
- pve-exporter (`prompve/prometheus-pve-exporter:latest`) — metrics Proxmox API

> Exceptie de versionare: `Vector` este fixat pe `0.53.0-debian` deoarece upstream nu publica `:latest`.

### Politica retentie si storage

- Metrics: **30 zile** (Prometheus)
- Logs: **14 zile** (Loki)
- Traces: **7 zile** (Tempo)

Persistenta:

- principal pe StorageBox: `/opt/stalwart/storagebox/observability/*`
- local (exceptie operationala):
  - Grafana DB: `/opt/observability/local/grafana` (evita lock-uri SQLite pe CIFS)
  - Vector buffer: `/opt/observability/local/vector`

### Organizare fisiere pe orchestrator

- Stack: `/opt/observability/docker-compose.yml`
- Environment: `/opt/observability/.env`
- Prometheus:
  - config: `/opt/observability/prometheus/prometheus.yml`
  - reguli: `/opt/observability/prometheus/rules/infra-alerts.yml`
  - probes: `/opt/observability/prometheus/blackbox.yml`
- Loki config: `/opt/observability/loki/loki-config.yml`
- Tempo config: `/opt/observability/tempo/tempo.yml`
- OTel config: `/opt/observability/otel/otel-collector.yml`
- Vector config: `/opt/observability/vector/vector.toml`
- Grafana provisioning:
  - datasources: `/opt/observability/grafana/provisioning/datasources/datasources.yaml`
  - dashboards provider: `/opt/observability/grafana/provisioning/dashboards/dashboards.yaml`

### DNS + TLS + Access control

DNS Cloudflare (proxied):

- `grafana.neanelu.ro`
- `metrics.neanelu.ro`
- `logs.neanelu.ro`
- `traces.neanelu.ro`

TLS:

- certificate Let's Encrypt emise prin Traefik + DNS challenge Cloudflare
- certificat dedicat per subdomeniu

Control acces:

- middleware `obs-allowlist` pe toate cele 4 rute observability
- Traefik configurat cu `forwardedHeaders.trustedIPs` pentru CIDR-urile Cloudflare
- `ipallowlist.ipstrategy.depth=1` pentru evaluarea IP-ului real al clientului din `X-Forwarded-For`
- Exceptie (ingest-only endpoints Cerniq): pentru `logs-cerniq.neanelu.ro/loki/api/v1/push` folosim `ipstrategy.depth=0` deoarece clientii (Vector) nu trimit `X-Forwarded-For` si depth=1 poate cauza `403` ("empty IP address")
- acces direct pe origin IP blocat (trafic valid doar prin lantul Cloudflare + allowlist)

### Flux de date detaliat

1. **Metrics infrastructura**

- `node-exporter` + `cadvisor` expun metrici interne
- Prometheus face scrape la interval configurat
- reguli `infra-alerts.yml` evalueaza starea
- Grafana interogheaza Prometheus pentru dashboard-uri

2. **Metrics Proxmox**

- `pve-exporter` interogheaza API Proxmox cu token dedicat (`prometheus-monitor@pve`)
- Prometheus scrape pe endpoint `pve-exporter:9221`

3. **Logs containere**

- Vector citeste logs Docker (`/var/lib/docker/containers` + docker socket)
- normalizeaza metadatele (host/service/container)
- trimite catre Loki
- Grafana Explore interogheaza Loki

4. **Traces aplicatii**

- aplicatii trimit OTLP catre OTel Collector (`4317`/`4318`)
- Collector exporta catre Tempo
- Grafana foloseste datasource Tempo pentru investigatii trace-level

### Operare curenta (runbook scurt)

Comenzi uzuale:

- status stack: `cd /opt/observability && docker compose ps`
- restart controlat: `docker compose up -d`
- logs serviciu: `docker logs --tail 100 <service>`
- health Prometheus: `curl -s http://127.0.0.1:9090/-/ready`
- health Loki: `curl -s http://127.0.0.1:3100/ready`
- health Tempo: `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3200/ready`

Checklist dupa orice deploy:

1. Toate containerele `Up`
2. Prometheus targets fara `down`
3. Grafana login accesibil pe HTTPS
4. Loki ingest activ (apar stream-uri noi)
5. Tempo ingest activ (requeste OTLP fara erori)

### Incidente frecvente si remediere

1. **Prometheus nu porneste dupa sync de pe macOS**

- Simptom: erori parse YAML din fisiere `._*`
- Cauza: metadata Apple in directoare config
- Remediere: stergere `find /opt/observability -name '._*' -delete` + restart Prometheus

2. **Grafana restart-loop cu `database is locked`**

- Simptom: migrare SQLite esuata pe startup
- Cauza: DB pe CIFS
- Remediere: volum local (`/opt/observability/local/grafana`)

3. **Tempo invalid config pe `:latest`**

- Simptom: `field ... not found in type app.Config`
- Cauza: schimbari schema intre versiuni
- Remediere: folosire cheilor compatibile curente + retention prin flag suportat

4. **403 pe toate subdomeniile observability prin Cloudflare**

- Simptom: acces refuzat desi DNS/TLS sunt OK
- Cauza: allowlist evaluat pe IP edge Cloudflare
- Remediere: `forwardedHeaders.trustedIPs` + `ipstrategy.depth=1`

### Validare operationala (stare finala)

- toate containerele observability: `Up`
- Prometheus targets: `up=14`, `down=0`
- ingest functional:
  - Vector -> Loki
  - OTel Collector -> Tempo
- HTTPS functional pe toate cele 4 subdomenii

### Confirmare resurse orchestrator + protectie storage

Verificare live (2026-02-12) arata ca stack-ul observability are consum redus/moderat pe orchestrator:

- memorie agregata observability ~1.1 GiB (din 7.6 GiB total)
- majoritatea serviciilor au CPU redus in regim normal (cadvisor si pve-exporter au varfuri periodice)
- pe disk local (`/`) ramane headroom semnificativ

Protectia resurselor locale prin data placement este activa:

- Prometheus data -> StorageBox (`/opt/stalwart/storagebox/observability/prometheus`)
- Loki data -> StorageBox (`/opt/stalwart/storagebox/observability/loki`)
- Tempo data -> StorageBox (`/opt/stalwart/storagebox/observability/tempo`)
- Grafana DB -> local (`/opt/observability/local/grafana`) **by design** pentru stabilitate SQLite

Concluzie operationala:

- Observability este configurat sa evite epuizarea storage-ului local prin persistenta primara pe StorageBox.
- Nu exista garantii absolute (crestere brusca de volum logs/metrics poate creste consumul), dar cu retentiile actuale (30d/14d/7d) si footprintul curent, riscul de epuizare pe orchestrator este controlat.

Mitigare suplimentara aplicata:

- `node-exporter` exclude fs type `cifs/smb3` din collector-ul filesystem pentru a reduce blocajele I/O pe mount-urile StorageBox.

### Limitari actuale / debt tehnic

- Alertmanager are config minim (fara rute complexe / escaladari)
- Grafana ruleaza ca root in container (compromis operational pentru permisiuni)
- Dependenta de StorageBox CIFS pentru mare parte din persistenta
- Lipsesc dashboard-uri custom extinse per serviciu/aplicatie

### Next steps recomandat

1. Migrare credențiale Traefik Cloudflare la token scoped (`CF_DNS_API_TOKEN`) in loc de API key global.
2. Extindere alerte (disk pressure, memory pressure, container restart storm, probe SLA).
3. Dashboard-uri standardizate per layer: host, docker, proxmox, network probes.
4. Backup periodic pentru:

- Grafana state (`/opt/observability/local/grafana`)
- `acme.json` Traefik
- fisiere config `/opt/observability/*`

5. Optional: canary synthetic checks HTTP pentru endpointurile critice publice.

---

## CI/CD — GitHub Actions Self-hosted Runner (LXC `CI-worker`, CTID `108`) (implementat)

Data implementare: 2026-02-13  
Nod Proxmox: `hz.223`  
Storage: `nvme-fast` (ZFSPool)  
Scop: runner universal pentru CI/CD (Cerniq + alte proiecte), cu egress controlat.

### Obiectiv sectiune

- Eliminarea consumului de GitHub-hosted minutes (runner-ul ruleaza pe infrastructura noastra).
- Un runner „universal” reutilizabil prin labels (nu runner separat per proiect).
- Predictibilitate: resurse fixe + izolare in LXC (separat de hosturi de productie).
- Securitate: fara expunere publica; egress limitat la strictul necesar (DNS + 80/443 + SSH catre tinte controlate).

### Specificatii LXC (CT 108)

- Nume: `CI-worker`
- VMID/CTID: `108`
- CPU: `2` cores
- RAM: `8192` MiB
- Disk: `40G` pe `nvme-fast` (`rootfs: nvme-fast:subvol-108-disk-0`)
- Features (Docker-in-LXC): `nesting=1,keyctl=1`

### Creare LXC (rezumat procedural)

- Template: `ubuntu-24.04-standard_24.04-2_amd64.tar.zst`
- Storage: `nvme-fast:40`
- Configurare retea: `vmbr4000`, IP `10.0.1.108/24`, GW `10.0.1.7`, MTU `1400`
- DNS: `8.8.8.8`

Comanda echivalenta (pentru reproducere):

```
pct create 108 nvme-fast:vztmpl/ubuntu-24.04-standard_24.04-2_amd64.tar.zst \
  --hostname CI-worker \
  --cores 2 --memory 8192 --swap 512 \
  --rootfs nvme-fast:40 \
  --net0 name=eth0,bridge=vmbr4000,ip=10.0.1.108/24,gw=10.0.1.7,mtu=1400 \
  --nameserver 8.8.8.8 \
  --features nesting=1,keyctl=1
```

### Configuratie LXC (parametri cheie)

- `features: nesting=1,keyctl=1` (necesar pentru Docker-in-LXC)
- `net0: name=eth0,bridge=vmbr4000,ip=10.0.1.108/24,gw=10.0.1.7,mtu=1400`
- `nameserver: 8.8.8.8`
- RootFS: `nvme-fast:subvol-108-disk-0`

> Nota: 2c/8G/40G este suficient ca baseline pentru pipeline-uri medii (build/test/push/deploy). Pentru concurenta mai mare sau build-uri Docker grele (multi-image), plan de upgrade: 4 CPU + 12–16G RAM + 80G disk.

### Retea, rutare si acces Internet

#### IP si gateway

- Interfata: `eth0` (veth)
- Bridge: `vmbr4000`
- IP: `10.0.1.108/24`
- GW: `10.0.1.7`
- MTU: `1400`
- DNS (in configuratia LXC): `8.8.8.8`

#### De ce `ping` poate esua, desi Internetul functioneaza

Politica de egress este intentionat restrictiva. Pentru `CI-worker` sunt permise:

- DNS (`53/tcp`, `53/udp`)
- Web (`80/tcp`, `443/tcp`)

ICMP (ping) nu este permis in mod explicit, deci `ping 8.8.8.8` poate raporta `NET_FAIL`, in timp ce `curl https://github.com` functioneaza.

#### NAT/egress control (gateway pe `hz.247`)

CI-worker face egress prin gateway-ul privat (`10.0.1.7`). Pe `hz.247` exista reguli de NAT + forward pentru IP-ul `10.0.1.108/32`.

Fisier sursa reguli (persistenta): `/etc/iptables.rules` pe `hz.247`.

Reguli relevante (conceptual):

- NAT (POSTROUTING): MASQUERADE pentru `10.0.1.108/32` spre interfata publica, doar pe 80/443 si DNS
- FORWARD: allow doar 80/443 + DNS pentru `10.0.1.108/32` + `RELATED,ESTABLISHED`
- Default drop pentru restul traficului de egress din `10.0.1.108/32`

Reguli efective (extract din `/etc/iptables.rules` pe `hz.247`):

```
-A POSTROUTING -s 10.0.1.108/32 -o enp98s0f0 -p tcp -m multiport --dports 80,443 -j MASQUERADE
-A POSTROUTING -s 10.0.1.108/32 -o enp98s0f0 -p udp -m udp --dport 53 -j MASQUERADE
-A POSTROUTING -s 10.0.1.108/32 -o enp98s0f0 -p tcp -m tcp --dport 53 -j MASQUERADE
-A FORWARD -s 10.0.1.108/32 -o enp98s0f0 -p tcp -m multiport --dports 80,443 -j ACCEPT
-A FORWARD -s 10.0.1.108/32 -o enp98s0f0 -p udp -m udp --dport 53 -j ACCEPT
-A FORWARD -s 10.0.1.108/32 -o enp98s0f0 -p tcp -m tcp --dport 53 -j ACCEPT
-A FORWARD -s 10.0.1.108/32 -o enp98s0f0 -m state --state RELATED,ESTABLISHED -j ACCEPT
-A FORWARD -d 10.0.1.108/32 -i enp98s0f0 -m state --state RELATED,ESTABLISHED -j ACCEPT
-A FORWARD -s 10.0.1.108/32 -o enp98s0f0 -j DROP
```

Aceasta politica:

- blocheaza exfiltrarea pe porturi necontrolate
- limiteaza blast-radius daca un pipeline sau dependency este compromis
- mentine CI functional (GitHub/GHCR ruleaza peste 443)

### Bootstrap software in container

OS: Ubuntu 24.04 LTS (LXC)

Pachete instalate (minimum util):

- `docker.io`, `docker-compose-v2`
- `git`, `curl`, `jq`
- toolchain build: `make`, `build-essential`, `zip`, `unzip`
- Python runtime: `python3`, `python3-venv`, `python3-pip`
- operare: `openssh-server`, `fail2ban`, `ca-certificates`

Servicii active:

- `docker` (enabled)
- `ssh` (enabled)
- `fail2ban` (enabled)

Nota: instalarea pachetelor a inclus upgrade-uri minore de baza ale sistemului (ex: `openssh-*`, `python3.*`).

### Conturi, directoare si permisiuni

- User dedicat: `runner`
  - membru in grupul `docker`
  - ruleaza runner-ul ca user non-root

Directoare standard:

- `/opt/actions-runner` — instalare runner GitHub
- `/srv/ci-work` — work directory pentru job-uri

Permisiuni:

- `/opt/actions-runner`: detinut de `runner` (runner non-root)
- `/srv/ci-work`: detinut de `runner`, folosit ca working dir in workflow-uri

### SSH hardening (CI-worker)

SSH este necesar pentru administrare (mai ales in primele ore de operare si troubleshooting).

Configuratie aplicata:

- `PasswordAuthentication no`
- `PubkeyAuthentication yes`
- `PermitRootLogin prohibit-password` (root doar cu chei)

Fisier: `/etc/ssh/sshd_config` (in container)

> Recomandare: defineste cheile admin permise si restrange suplimentar cu allowlist IP la nivel PVEFW / host firewall, daca este nevoie.

### Inrolare GitHub Actions Runner

#### Clarificare: token de inrolare vs credentiale runner

- Tokenul de inrolare (registration token) are valabilitate scurta intentionat si se foloseste o singura data.
- Dupa inrolare, runner-ul functioneaza pe baza credentialelor salvate local in `/opt/actions-runner` + serviciul systemd.
- Expirarea tokenului de inrolare NU opreste runner-ul deja inrolat.

#### Repo initial (Cerniq)

Runner-ul a fost inrolat la nivel de repository pentru:

- `https://github.com/neacisu/cerniq_app_v0.0.1`

Labels setate:

- `universal`, `docker`, `deploy` (plus cele implicite: `self-hosted`, `Linux`, `X64`)

#### Workflow practic (automatizat)

Pentru a simplifica operarea, pe CI-worker exista doua helper scripts:

- `/usr/local/bin/register-gh-runner`
- `/usr/local/bin/unregister-gh-runner`

Acestea fac:

- download automat latest `actions/runner`
- `config.sh --unattended --replace`
- instalare si start ca systemd service

Serviciu systemd (pattern):

- `actions.runner.<owner>-<repo>.CI-worker-108.service`

Serviciu systemd rezultat (exemplu):

- `actions.runner.neacisu-cerniq_app_v0.0.1.CI-worker-108.service`

#### Cum se adauga runner-ul la alte proiecte

Modelul curent este repo-level. Pentru alte repo-uri:

1. generezi un nou registration token pentru repo-ul tinta
2. rulezi `register-gh-runner` cu URL-ul repo-ului si tokenul

> Optional (mai „universal”): migrare la org-level runner, ca sa nu reinrolezi per repo. Aceasta necesita permisiuni de organizatie (si eventual runner groups).

### Validare operationala

Validari locale (in container):

- `systemctl is-active docker ssh fail2ban`
- `docker --version` / `docker compose version`
- `curl -I https://github.com`

Validari recomandate (cand e nevoie):

- `pct config 108` (verificare features/retea)
- `ip a` / `ip r` (verificare routare interna)
- `getent hosts archive.ubuntu.com` (verificare DNS)

Validari GitHub:

- runner-ul `CI-worker-108` apare `online` in `Repo Settings → Actions → Runners`

### Troubleshooting

#### Runner apare offline

Pe CI-worker:

- `systemctl status actions.runner.*`
- `journalctl -u actions.runner.* --since '1 hour ago' --no-pager`

Cauze comune:

- egress 443 blocat (NAT/iptables pe `hz.247`)
- DNS indisponibil
- ora sistem incorecta (NTP)

Investigatii rapide:

- `systemctl status docker ssh fail2ban`
- `journalctl -u actions.runner.* --since '1 hour ago' --no-pager`

#### Docker build esueaza in LXC

Check:

- `pct config 108` contine `features: nesting=1,keyctl=1`
- `systemctl is-active docker`
- spatiu disk in `/var/lib/docker`

#### GitHub registration token expirat

Normal. Generezi un nou token si reinrolezi doar daca:

- ai sters `/opt/actions-runner`
- ai rulat `unregister-gh-runner`
- vrei sa schimbi repo/org.

### Note de securitate

- Token-urile GitHub (PAT) nu trebuie puse in documentatie. Se tin in `.env` local (Mac) sau in secret store.
- Restrictiile de egress sunt parte din modelul de securitate (nu bug).
- Pentru folosire multi-proiect, recomanda runner groups + labels, si separare de secrete per repo/environment.

---

## Cerniq — LXC prod + staging (CT 109/110) (implementat)

Data implementare: 2026-02-13  
Nod Proxmox: `hz.223`  
Gateway/NAT: `hz.247` (egress control pe vmbr4000)  
Scop: medii dedicate pentru Cerniq (prod + staging), cu egress restrictiv si bootstrap minim.

### Obiectiv actual

- Izolare intre prod si staging.
- Resurse dedicate si predictibile.
- Fara expunere publica directa; doar egress controlat (DNS + 80/443).
- OS standardizat si tooling minim pentru deploy (Docker + utilitare).

### Specificatii LXC (rezumat)

| Mediu   | CTID | Nume LXC         | CPU     | RAM       | Disk | Storage               | IP privat     |
| ------- | ---- | ---------------- | ------- | --------- | ---- | --------------------- | ------------- |
| prod    | 109  | `prod-cerniq`    | 6 cores | 12288 MiB | 50G  | `local` (dir)         | 10.0.1.109/24 |
| staging | 110  | `staging-cerniq` | 4 cores | 8192 MiB  | 50G  | `nvme-fast` (ZFSPool) | 10.0.1.110/24 |

### Creare LXC-uri (rezumat procedural)

Prod (CT 109):

```
pct create 109 local:vztmpl/ubuntu-24.04-standard_24.04-2_amd64.tar.zst \
  --hostname prod-cerniq \
  --cores 6 --memory 12288 --swap 512 \
  --rootfs local:50 \
  --net0 name=eth0,bridge=vmbr4000,ip=10.0.1.109/24,gw=10.0.1.7,mtu=1400 \
  --nameserver 8.8.8.8 \
  --features nesting=1,keyctl=1
```

Staging (CT 110):

```
pct create 110 nvme-fast:vztmpl/ubuntu-24.04-standard_24.04-2_amd64.tar.zst \
  --hostname staging-cerniq \
  --cores 4 --memory 8192 --swap 512 \
  --rootfs nvme-fast:50 \
  --net0 name=eth0,bridge=vmbr4000,ip=10.0.1.110/24,gw=10.0.1.7,mtu=1400 \
  --nameserver 8.8.8.8 \
  --features nesting=1,keyctl=1
```

### Configuratie LXC (ambele)

- OS: Ubuntu 24.04 LTS (template `ubuntu-24.04-standard_24.04-2_amd64.tar.zst`).
- Features pentru Docker-in-LXC: `nesting=1,keyctl=1`.
- Bridge: `vmbr4000`.
- Gateway: `10.0.1.7`.
- MTU: `1400`.
- DNS (LXC): `8.8.8.8`.

RootFS (effective):

- CT 109: `local:50` (raw file in `/var/lib/vz/images/109/`)
- CT 110: `nvme-fast:subvol-110-disk-0`

### Retea si egress control (NAT pe `hz.247`)

Egress este permis doar pentru DNS si web. ICMP (ping) nu este permis explicit, deci `ping` poate esua chiar daca `curl https://github.com` functioneaza.

Fisier reguli persistente: `/etc/iptables.rules` pe `hz.247`.

Reguli relevante (conceptual) pentru fiecare IP:

- `POSTROUTING MASQUERADE` pentru `10.0.1.109/32` si `10.0.1.110/32` pe `80,443` si `53/tcp+udp`.
- `FORWARD ACCEPT` pentru `10.0.1.109/32` si `10.0.1.110/32` pe `80,443` si `53/tcp+udp`.
- `RELATED,ESTABLISHED` permis pentru ambele.
- `DROP` pentru restul traficului de egress din aceste IP-uri.

Reguli efective (extract din `/etc/iptables.rules` pe `hz.247`):

```
-A POSTROUTING -s 10.0.1.109/32 -o enp98s0f0 -p tcp -m multiport --dports 80,443 -j MASQUERADE
-A POSTROUTING -s 10.0.1.109/32 -o enp98s0f0 -p udp -m udp --dport 53 -j MASQUERADE
-A POSTROUTING -s 10.0.1.109/32 -o enp98s0f0 -p tcp -m tcp --dport 53 -j MASQUERADE
-A FORWARD -s 10.0.1.109/32 -o enp98s0f0 -p tcp -m multiport --dports 80,443 -j ACCEPT
-A FORWARD -s 10.0.1.109/32 -o enp98s0f0 -p udp -m udp --dport 53 -j ACCEPT
-A FORWARD -s 10.0.1.109/32 -o enp98s0f0 -p tcp -m tcp --dport 53 -j ACCEPT
-A FORWARD -s 10.0.1.109/32 -o enp98s0f0 -m state --state RELATED,ESTABLISHED -j ACCEPT
-A FORWARD -d 10.0.1.109/32 -i enp98s0f0 -m state --state RELATED,ESTABLISHED -j ACCEPT
-A FORWARD -s 10.0.1.109/32 -o enp98s0f0 -j DROP

-A POSTROUTING -s 10.0.1.110/32 -o enp98s0f0 -p tcp -m multiport --dports 80,443 -j MASQUERADE
-A POSTROUTING -s 10.0.1.110/32 -o enp98s0f0 -p udp -m udp --dport 53 -j MASQUERADE
-A POSTROUTING -s 10.0.1.110/32 -o enp98s0f0 -p tcp -m tcp --dport 53 -j MASQUERADE
-A FORWARD -s 10.0.1.110/32 -o enp98s0f0 -p tcp -m multiport --dports 80,443 -j ACCEPT
-A FORWARD -s 10.0.1.110/32 -o enp98s0f0 -p udp -m udp --dport 53 -j ACCEPT
-A FORWARD -s 10.0.1.110/32 -o enp98s0f0 -p tcp -m tcp --dport 53 -j ACCEPT
-A FORWARD -s 10.0.1.110/32 -o enp98s0f0 -m state --state RELATED,ESTABLISHED -j ACCEPT
-A FORWARD -d 10.0.1.110/32 -i enp98s0f0 -m state --state RELATED,ESTABLISHED -j ACCEPT
-A FORWARD -s 10.0.1.110/32 -o enp98s0f0 -j DROP
```

> Daca un deploy necesita alt port outbound (ex: registry privat), trebuie adaugate explicit reguli suplimentare in `/etc/iptables.rules`.

### Bootstrap software (ambele)

Pachete instalate:

- `docker.io`, `docker-compose-v2`
- `git`, `curl`, `jq`
- toolchain: `make`, `build-essential`, `zip`, `unzip`
- Python: `python3`, `python3-venv`, `python3-pip`
- operare: `openssh-server`, `fail2ban`, `ca-certificates`

Comanda folosita (identica pentru ambele):

```
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  docker.io docker-compose-v2 git curl jq make build-essential zip unzip \
  python3 python3-venv python3-pip openssh-server fail2ban ca-certificates
systemctl enable --now docker ssh fail2ban
```

Servicii active:

- `docker` (enabled)
- `ssh` (enabled)
- `fail2ban` (enabled)

### Conturi si directoare

- User dedicat: `deploy`
  - membru in grupul `docker`
- Directoare:
  - `/opt/cerniq` (root proiect)
  - `/srv/cerniq-work` (work dir)

Comenzi folosite:

```
id -u deploy >/dev/null 2>&1 || useradd -m -s /bin/bash deploy
usermod -aG docker deploy
install -d -o deploy -g deploy /opt/cerniq /srv/cerniq-work
```

### SSH hardening (ambele)

- `PasswordAuthentication no`
- `PubkeyAuthentication yes`
- `PermitRootLogin prohibit-password`

Fisier: `/etc/ssh/sshd_config` (in container) + restart `ssh`.

### Validare operationala (executata)

In CT 109 (prod):

- `docker --version` si `docker compose version` OK.
- `systemctl is-active docker ssh fail2ban` OK.

In CT 110 (staging):

- `docker --version` si `docker compose version` OK.
- `systemctl is-active docker ssh fail2ban` OK.

Validari recomandate (cand e nevoie):

- `pct config 109` / `pct config 110`
- `ip a` / `ip r`
- `getent hosts archive.ubuntu.com`
- `curl -I https://github.com`

### Observatii si incidente

- CT 109: `apt-get update` a esuat initial cu `Temporary failure resolving` din cauza lipsei regulilor de NAT/egress. Dupa adaugarea regulilor pentru `10.0.1.109/32` in `/etc/iptables.rules` pe `hz.247`, install-ul a fost reluat cu succes.
- CT 110: egress a fost configurat anterior pentru `10.0.1.110/32`; DNS si update-urile au functionat normal.

### Diferente intre prod si staging

- Prod (CT 109) ruleaza pe storage `local` (dir), util pentru cost si simplitate.
- Staging (CT 110) ruleaza pe `nvme-fast` (ZFSPool) pentru performanta mai buna la teste.
- Resurse: prod 6c/12G, staging 4c/8G.

### Stare curenta

- ambele LXC sunt create, bootstrapped si functionale.
- nu exista expunere publica directa; accesul este doar intern (vmbr4000) + egress controlat.
- deploy-ul aplicatiei Cerniq nu este inclus in aceasta etapa.

---

---

## Audit — Orchestrator + LXC Postgres 107 (OpenBao)

Data audit: 2026-02-13  
Scope: orchestrator (host Proxmox + stack Docker) si LXC 107 `postgres-main` (PostgreSQL)  
Obiectiv: inventar complet, verificare expunere si documentare a securizarii Postgres cu OpenBao.

### Orchestrator (host + Docker)

#### Identitate si OS

- Hostname: `orchestrator.neanelu.ro`
- OS: Debian 13 (trixie), `DEBIAN_VERSION_FULL=13.3`
- Kernel: `6.12.57+deb13-cloud-amd64`
- Uptime: ~5 zile (la momentul auditului)

#### Resurse si storage

- CPU/RAM: 4 vCPU, ~7.6 GiB RAM
- Swap: 0
- Root FS: `/dev/sda1` ext4 ~38G (utilizare ~42%)
- Layout disk: `sda` cu EFI pe `sda15`

#### Retea si rutare

- IP public: `77.42.76.185/32` pe `eth0`
- Privat: `10.0.0.2/32` pe `enp7s0`
- WireGuard: `wg-home` `10.99.0.1/24`
- Docker bridges active: `172.18.0.0/16` (traefik_default) si `172.19.0.0/16`
- Ruta catre subnet privat: `10.0.0.0/16 via 10.0.0.1`

#### Firewall si SSH

- PVEFW: `enabled/running`
- SSH:
  - `PermitRootLogin yes`
  - `X11Forwarding yes`
  - `PasswordAuthentication` nu este setat explicit in `sshd_config` (implicit posibil `yes`)

Observatie critica:

- Load average extrem de mare raportat la momentul auditului (ordine de mii). Necesita investigatie separata (procese blocate I/O sau incident sistemic).

#### Docker inventory (servicii active)

Containere relevante pentru securizare si secrets:

- `openbao` (`openbao/openbao:2.5.0`)
- `traefik` (TLS + routing)
- `zitadel`, `oauth2-proxy` (identity)
- stack observability (Grafana/Prometheus/Loki/Tempo/OTel)
- `stalwart` + `roundcube` (email)

OpenBao - detalii container (inspect):

- Image: `openbao/openbao:2.5.0`
- Port bindings: **none** (nu publica porturi direct pe host)
- Mounts:
  - `/opt/openbao/config` -> `/openbao/config` (read-only)
  - `/opt/openbao/data` -> `/openbao/data` (read-write)
  - volume local pentru `/openbao/file`
  - volume local pentru `/openbao/logs`

Implicatii:

- OpenBao ruleaza izolat in Docker, fara expunere directa de porturi pe host.
- Accesul este probabil facut prin reteaua Docker + Traefik (sau intern), dar nu exista bind public direct.

### LXC 107 — `postgres-main`

#### Configuratie Proxmox (pct config)

- CTID: `107`
- Host: `hz.247`
- OSType: `ubuntu`
- CPU: `8` cores
- RAM: `32768` MiB
- Swap: `512` MiB
- RootFS: `ssd-main:subvol-107-disk-0`, size `4G`
- Unprivileged: `1`
- Autostart: `onboot: 1`
- Retea: `vmbr4000`, IP `10.0.1.107/24`, GW `10.0.1.7`, MTU `1400`, DNS `8.8.8.8`

#### OS si resurse (in container)

- OS: Ubuntu 24.04 LTS (Noble)
- Kernel: `6.17.9-1-pve` (host kernel)
- Uptime: ~2 zile
- RAM folosita: ~69 MiB (foarte low, indicand workload redus)
- RootFS: ZFS `ssd-main/subvol-107-disk-0`, ~4G, ~17% utilizat

#### PostgreSQL

- Versiune: `PostgreSQL 18.1` (pachet PGDG pentru Ubuntu 24.04)
- Port: `5432`
- Listen: `0.0.0.0` si `::` (expus pe toate interfetele)
- SSL: `on`, foloseste certificatul implicit `ssl-cert-snakeoil`
- `password_encryption`: `scram-sha-256`

Extrase cheie din `postgresql.conf`:

- `listen_addresses = '*'`
- `port = 5432`
- `ssl = on`
- `ssl_cert_file = '/etc/ssl/certs/ssl-cert-snakeoil.pem'`
- `ssl_key_file = '/etc/ssl/private/ssl-cert-snakeoil.key'`

Extrase cheie din `pg_hba.conf`:

- `host all all 10.0.1.0/24 scram-sha-256`
- `host all all 10.0.0.2/32 scram-sha-256`
- `host all all 10.0.0.2/32 trust`
- localhost (127.0.0.1 si ::1) permis cu `scram-sha-256`

Observatii critice:

- Exista o regula `trust` pentru `10.0.0.2/32`. Aceasta permite acces fara parola din acel IP si este un risc major.
- Postgres asculta pe toate interfetele (`*`), iar LXC nu are firewall activ (UFW: inactive).
- Certificatul TLS este snakeoil (default), deci nu asigura un canal TLS de productie.

### OpenBao si securizarea Postgres

Stare curenta (audit):

- OpenBao ruleaza pe orchestrator in Docker.
- In LXC 107 **nu exista** servicii `bao`/`vault` active.
- Nu au fost gasite fisiere de config OpenBao/Vault in `/etc` sau `/opt`.
- Nu exista dovada de integrare directa (agent OpenBao, template, sau dinamica de credențiale) intre OpenBao si Postgres.

Concluzie:

- Securizarea Postgres cu OpenBao **nu este implementata** la nivelul LXC 107 in acest moment.

### Recomandari pentru integrare OpenBao (securizare Postgres)

1. Activeaza database secrets engine in OpenBao:

- Defineste `postgresql` ca backend, cu un user de administrare minim (doar pentru provisioning de credențiale).
- Configureaza roluri pentru aplicatii (ex: `app-readwrite`, `app-readonly`).

2. Foloseste credentiale dinamice:

- Aplicatiile nu trebuie sa stocheze user/parola statice.
- OpenBao emite credențiale cu TTL (ex: 1h) si le roteste automat.

3. Integrare prin OpenBao Agent in LXC 107:

- Ruleaza `openbao-agent` in container pentru a scrie secretul intr-un fisier (template) sau in env.
- Restrange accesul fisierului la user-ul aplicatiei.

4. Hardening Postgres:

- Elimina regula `trust` din `pg_hba.conf`.
- Restrange `listen_addresses` doar la IP-urile necesare (ex: IP-uri de aplicatii).
- Configureaza TLS cu certificat valid (nu snakeoil).
- Activeaza firewall la nivel LXC sau PVEFW pentru a limita sursele care pot accesa 5432.

5. Audit si monitorizare:

- Logare autentificari + audit pe `postgresql.log`.
- Alerta pentru autentificari esuate sau conexiuni din IP-uri nepermise.

### Rezumat riscuri curente (prioritate)

- **Critical**: `pg_hba.conf` contine `trust` pentru `10.0.0.2/32`.
- **High**: Postgres asculta pe toate interfetele, fara firewall activ in LXC.
- **Medium**: TLS foloseste certificate snakeoil.
- **Medium**: OpenBao nu este integrat in fluxul de credentiale pentru Postgres.

---

## Audit aprofundat — Observabilitate (orchestrator)

Data audit: 2026-02-13  
Host: `orchestrator.neanelu.ro` (77.42.76.185)  
Scop: inventar complet al stack-ului observability, resurse disponibile pentru aplicatii viitoare si limitari curente.

### Context host (orchestrator)

- OS: Debian 13 (trixie), kernel `6.12.57+deb13-cloud-amd64`
- RAM: ~7.6 GiB, fara swap
- Root FS: ext4 ~38G, utilizare ~42%
- Docker bridges active: `172.18.0.0/16` (traefik_default) si `172.19.0.0/16` (observability)
- PVEFW: enabled/running

Observatie de performanta:

- Load average extrem de mare in momentul auditului (ordine de mii). Nu a fost investigat in acest capitol; necesita analiza separata (I/O stall, procese blocate, sau incident).

### Stack observability — inventar containere

Containere active (servicii observability):

- `grafana` (`grafana/grafana:latest`)
- `prometheus` (`prom/prometheus:latest`)
- `alertmanager` (`prom/alertmanager:latest`)
- `loki` (`grafana/loki:latest`)
- `tempo` (`grafana/tempo:latest`)
- `otel-collector` (`otel/opentelemetry-collector-contrib:latest`)
- `vector` (`timberio/vector:0.53.0-debian`)
- `node-exporter` (`prom/node-exporter:latest`)
- `cadvisor` (`gcr.io/cadvisor/cadvisor:latest`)
- `blackbox-exporter` (`prom/blackbox-exporter:latest`)
- `pve-exporter` (`prompve/prometheus-pve-exporter:latest`)

Retea Docker:

- Network `observability` (interna) + `traefik_default` pentru expunerea UI-urilor prin Traefik.
- Doar serviciile de UI (Grafana/Prometheus/Loki/Tempo) sunt publicate prin Traefik, cu allowlist.

### Expuneri si acces public (Traefik + allowlist)

Prin Traefik sunt expuse doar aceste UI-uri, toate cu allowlist (`obs-allowlist`) si TLS:

- Grafana: `https://${GRAFANA_DOMAIN}` -> port 3000
- Prometheus: `https://${PROMETHEUS_DOMAIN}` -> port 9090
- Loki: `https://${LOGS_DOMAIN}` -> port 3100
- Tempo: `https://${TRACES_DOMAIN}` -> port 3200

Allowlist:

- Middleware `obs-allowlist` foloseste `OBS_ALLOWED_CIDRS` din `.env`.
- `ipstrategy.depth=1` pentru a lua IP-ul real din `X-Forwarded-For` (Cloudflare).

### Persistenta si storage

Data placement actual:

- Prometheus: `/opt/stalwart/storagebox/observability/prometheus`
- Alertmanager: `/opt/stalwart/storagebox/observability/prometheus/alertmanager`
- Loki: `/opt/stalwart/storagebox/observability/loki`
- Tempo: `/opt/stalwart/storagebox/observability/tempo`
- Grafana DB: `/opt/observability/local/grafana` (local, evitam SQLite pe CIFS)
- Vector buffer: `/opt/observability/local/vector`

Utilizare disk (moment audit):

- Local Grafana: ~49M
- StorageBox: Prometheus ~118M, Loki ~12M, Tempo ~286K

Observatie:

- CIFS StorageBox are ~1.0T total, utilizare ~11% la momentul auditului.

### Configuratie servicii (chei principale)

#### Grafana

- Auth: admin user/parola din `.env` (`GF_SECURITY_ADMIN_*`)
- Anonymous: disabled
- Provisioning activ pentru datasources si dashboards

Datasources provisionate:

- Prometheus (`http://prometheus:9090`, default)
- Loki (`http://loki:3100`)
- Tempo (`http://tempo:3200`, cu traces-to-logs catre Loki)

Dashboards:

- Folder: `Infrastructure`
- Source: `/var/lib/grafana/dashboards` (mount read-only)

#### Prometheus

- Scrape interval: 15s
- Retentie: 30 zile (`--storage.tsdb.retention.time=30d`)
- Rule files: `/etc/prometheus/rules/infra-*.yml`
- Alertmanager: `alertmanager:9093`

Targets monitorizate:

- `prometheus`, `node-exporter`, `cadvisor`
- `blackbox` TCP probe:
  - Proxmox UI/SSH: `10.0.0.2`, `10.0.1.10`, `10.0.1.11`, `10.0.1.12` pe 8006/22
  - Endpoint extern: `142.132.132.20:445` (SMB probe)
- `pve-exporter` pentru nodurile 10.0.1.10/11/12

Reguli de alerta (infra):

- `NodeExporterDown` (critical)
- `CAdvisorDown` (warning)
- `HighCPUUsage` (>90% timp 10m)
- `LowDiskSpace` (<15% free timp 15m)

#### Loki

- `auth_enabled: false` (fara auth interna)
- Storage: filesystem pe StorageBox (`/loki`)
- Retentie: 336h (14 zile)
- Compactor: activ, compaction la 10m

#### Tempo

- Receiver: OTLP gRPC + HTTP
- Storage: local filesystem (`/var/tempo/traces`) pe StorageBox
- Retentie: `168h` (7 zile) via backend worker compaction

#### OTel Collector

- Receivers: OTLP gRPC + HTTP
- Exporter: `otlp/tempo` catre `tempo:4317` (TLS insecure)
- Pipeline: `traces` (batch -> tempo)

Limitare curenta:

- `otel-collector` nu are expunere publica prin Traefik. Ingest OTLP este disponibil doar in reteaua Docker `observability`.

#### Vector (logs)

- Source: `docker_logs`
- Normalize labels: `service`, `stack`, `host=orchestrator`
- Transform special: downgrade `tempo` no-jobs la `info` (`tempo_scheduler_state=idle_no_jobs`)
- Sink: Loki (`http://loki:3100`), `out_of_order_action=accept`, `codec=json`

### Ce resurse sunt disponibile pentru aplicatii viitoare

Metrics:

- Prometheus scrape pentru target-uri interne expuse (node-exporter/cadvisor/pve-exporter).
- Aplicatiile pot expune endpoint `/metrics` si pot fi adaugate in `prometheus.yml`.

Logs:

- Docker logs colectate automat pe orchestrator (Vector -> Loki).
- Pentru aplicatii rulate pe orchestrator in Docker, logging centralizat e disponibil implicit.

Traces:

- OTLP ingest prin `otel-collector` (gRPC 4317 / HTTP 4318) in reteaua `observability`.
- Aplicatiile care ruleaza in Docker pe orchestrator pot trimite OTLP direct la `otel-collector`.

UI centralizat:

- Grafana unificat pentru metrics/logs/traces, cu datasources provisionate.

### Limitari curente si gap-uri pentru extindere

- OTLP ingest nu este expus public. Pentru aplicatii din alte hosturi/LXC-uri este necesar:
  - fie un endpoint expus prin Traefik (cu allowlist),
  - fie un agent/collector pe hosturile respective, cu forward catre `otel-collector`.
- Loki si Prometheus nu au auth interna; accesul este controlat doar de Traefik + allowlist.
- Alertmanager are config minimal (fara rute avansate, fara integrare notificari).

### Recomandari pentru a face observability "shared" la nivel de platforma

1. Expunere OTLP controlata:

- Traefik route pentru `otel-collector` cu allowlist si TLS.

2. Standardizare labels:

- Prefix comun pentru `service`, `env`, `team` in loguri/metrics.

3. Onboarding aplicatii:

- Template standard: `PROMETHEUS_SCRAPE=true`, `OTEL_EXPORTER_OTLP_ENDPOINT`, labels Loki.

4. Alerting matur:

- Extindere `alertmanager.yml` (routing pe severitate, email/Slack).

5. Monitorizare agent pe hosturi externe:

- Instaleaza node-exporter + vector/otel-collector pe VM/LXC externe.

---

## Note si intrebari deschise

- Care sunt IP-urile admin/VPN care trebuie permise pentru management?
- Ce servicii trebuie sa fie publice si pe ce host?
- Sunt nodurile standalone planificate sa intre in cluster?
- Ctera: configura port fix pentru mountd sau migra complet pe WireGuard VPN?
- Ctera: instala un peer WireGuard pe un dispozitiv din reteaua de acasa (Raspberry Pi, router OpenWrt etc.)

Sfarsit raport.

## Tokenuri de conectare API (stocate in .env pe MacBook, nu pe hosturi)

HETZNER_CLOUD_API_TOKEN=Y6hSeQqo79a9libPUMiF4aCRywoY4jdM6Q0EfPmCgErFJ6vPx1TWLzGpWkmcvzt7
CLOUDFLARE_ALL_ZONES_TOKEN=pPksXCfTSyAV_AdEAfPBiIFGGAdJBe1xoD83d9Wc

NOTA: temporar pastrate aici pentru taskuri urmatoare; curatarea se face la final (vezi `final-01-secret-cleanup` in plan).

## WireGuard VPN (orchestrator <-> home/ctera)

WG_ORCHESTRATOR_PUBLIC_KEY=z78VcOe+/Ip86Ujc7+jRxYAvTzhc5InxQ7ARikbYgz8=
WG_HOME_PRIVATE_KEY=GJw6yAGPyEzkcQBeIXicBAHN6Qpu8mQXwLpI8p/PDlQ=
WG_HOME_PUBLIC_KEY=LEH3HPvFnEINQkOBYCN3jiMTxaAmGgQOlbAgL/1cwEg=
WG_ORCHESTRATOR_ENDPOINT=77.42.76.185:51820
WG_HOME_ADDRESS=10.99.0.2/24

Sfarsit raport.
