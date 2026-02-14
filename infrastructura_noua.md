<!-- markdownlint-disable MD007 MD013 MD022 MD029 MD031 MD032 MD034 MD040 MD058 MD060 -->

# Raport audit infrastructura Hetzner + Proxmox

Data: 2026-02-11
Sursa date: loguri audit locale (hetzner_audit_logs/20260211_135424)

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

1) SSH root + password auth pe toate hosturile.
2) Management services expuse public (Proxmox UI, RPC, Spice, SMTP).
3) Firewall inconsistent si uneori complet deschis.
4) Patching inconsistent si uneori intarziat.
5) IP-uri multiple in acelasi /24 pe vmbr4000 (risc de ARP/routing issues).

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
      - "25:25"       # SMTP inbound
      - "465:465"     # SMTPS (submission implicit TLS)
      - "587:587"     # Submission (STARTTLS)
      - "143:143"     # IMAP
      - "993:993"     # IMAPS
      - "4190:4190"   # ManageSieve
    volumes:
      - /opt/stalwart/etc:/opt/stalwart/etc        # configuratie
      - /opt/stalwart/var:/opt/stalwart/var         # date runtime
      - /opt/stalwart/storagebox/mailbox:/data      # blob storage (StorageBox)
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

| Cont | Rol | Acces |
|------|-----|-------|
| admin | Administrator Stalwart | API + Admin UI (mailadmin.triggerra.app) |
| alex | Utilizator email | <alex@triggerra.app>, IMAP/SMTP/Webmail |

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

| Subdomeniu | Destinatie | Scop |
|------------|-----------|------|
| mail.triggerra.app | 77.42.76.185 (direct) | Hostname MX, rDNS, EHLO, certificat TLS |
| webmail.triggerra.app | Traefik → roundcube:80 | Interfata webmail Roundcube |
| mailadmin.triggerra.app | Traefik → stalwart:8080 | Admin UI Stalwart |

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

| Componenta | Status | Detalii |
|------------|--------|---------|
| Stalwart container | ✅ Running | v0.15.4, uptime stabil |
| Roundcube container | ✅ Running | 1.6.x-apache, uptime stabil |
| SMTP inbound (25) | ✅ Functional | Accepta email de la servere externe |
| SMTP outbound (25) | ✅ Functional | Hetzner port 25 deblocat, livrare la Gmail OK |
| IMAPS (993) | ✅ Functional | Roundcube se conecteaza cu succes |
| SMTPS (465) | ✅ Functional | Roundcube trimite prin SMTPS |
| TLS certificate | ✅ Valid | Let's Encrypt, expira 2026-05-12 |
| SPF | ✅ Pass | `-all` hardfail configurat |
| DKIM signing | ✅ Activ | Dubla semnatura Ed25519 + RSA pe fiecare email |
| DMARC | ✅ Configurat | `p=reject`, strict alignment |
| rDNS | ✅ Corect | 77.42.76.185 → mail.triggerra.app |
| StorageBox mount | ✅ Montat | CIFS v3.0, automount systemd |
| Admin UI | ✅ Accesibil | mailadmin.triggerra.app (Traefik) |
| Webmail | ✅ Accesibil | webmail.triggerra.app (Traefik) |
| TLS-RPT | ✅ Configurat | Rapoarte la <postmaster@triggerra.app> |
| ARC seal | ✅ Configurat | Ed25519 |
| MTA-STS | ⚠️ Neconfigurat | De implementat |
| IP reputation | ⚠️ Noua | IP nou Hetzner, fara istoric — risc spam la Gmail |
| Blacklists | ✅ Curat | Spamhaus, SpamCop, Barracuda, SORBS — clean |

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

| Parametru | Valoare |
|-----------|---------|
| Model | Ctera C800-4 |
| IP LAN | 192.168.100.140 |
| IP public acasa | 92.180.19.237 |
| Capacitate | ~13 TB (4× HDD) |
| Protocol NFS | NFSv3 only (NFSv4 nu e suportat) |
| Latenta | ~63 ms (Hetzner ↔ acasa) |

### NFS Export

| Parametru | Valoare |
|-----------|---------|
| Export path | `/var/vol/41/ctera_storage_local` |
| Allowed IP | 77.42.76.185/255.255.255.255 (doar orchestrator) |
| Mountpoint pe orchestrator | `/mnt/ctera` |
| Proxmox storage name | `ctera-home` |
| Content types Proxmox | backup, iso, vztmpl, snippets |

### Port forwards pe router (acasa)

| Port extern | Port intern (192.168.100.140) | Serviciu | Protocol |
|-------------|-------------------------------|----------|----------|
| 111 | 111 | portmapper (rpcbind) | TCP |
| 2049 | 2049 | NFS | TCP |
| 44881 | 44881 | mountd (dinamic!) | TCP |

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

| Metric | Valoare |
|--------|---------|
| Write (100 MB secvential) | 36.6 MB/s |
| Read (100 MB, cached) | 4.1 GB/s |
| Latenta retea | ~63 ms RTT |

> **Nota**: Read-ul mare este din cache Linux. Write-ul real de ~37 MB/s este limitat de latenta (~63ms RTT).
> **Nu se recomanda** pentru disk-uri VM/CT (IOPS slab). Ideal pentru: backup-uri, ISO-uri, template-uri, arhive.

### Securitate — Restricție acces

Testat la 2026-02-12:

| Sursa | IP | Port 111 | Port 2049 | Port 44881 | NFS Mount |
|-------|-----|----------|-----------|------------|-----------|
| orchestrator (autorizat) | 77.42.76.185 | OK | OK | OK | **FUNCTIONAL** |
| hz.215 (neautorizat) | 95.216.36.215 | TIMEOUT | TIMEOUT | TIMEOUT | **BLOCAT** |

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
- acces direct pe origin IP blocat (trafic valid doar prin lanțul Cloudflare + allowlist)

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

### Obiectiv

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

| Mediu | CTID | Nume LXC | CPU | RAM | Disk | Storage | IP privat |
|------|------|----------|-----|-----|------|---------|-----------|
| prod | 109 | `prod-cerniq` | 6 cores | 12288 MiB | 50G | `local` (dir) | 10.0.1.109/24 |
| staging | 110 | `staging-cerniq` | 4 cores | 8192 MiB | 50G | `nvme-fast` (ZFSPool) | 10.0.1.110/24 |

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

1) Activeaza database secrets engine in OpenBao:

- Defineste `postgresql` ca backend, cu un user de administrare minim (doar pentru provisioning de credențiale).
- Configureaza roluri pentru aplicatii (ex: `app-readwrite`, `app-readonly`).

2) Foloseste credentiale dinamice:

- Aplicatiile nu trebuie sa stocheze user/parola statice.
- OpenBao emite credențiale cu TTL (ex: 1h) si le roteste automat.

3) Integrare prin OpenBao Agent in LXC 107:

- Ruleaza `openbao-agent` in container pentru a scrie secretul intr-un fisier (template) sau in env.
- Restrange accesul fisierului la user-ul aplicatiei.

4) Hardening Postgres:

- Elimina regula `trust` din `pg_hba.conf`.
- Restrange `listen_addresses` doar la IP-urile necesare (ex: IP-uri de aplicatii).
- Configureaza TLS cu certificat valid (nu snakeoil).
- Activeaza firewall la nivel LXC sau PVEFW pentru a limita sursele care pot accesa 5432.

5) Audit si monitorizare:

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

1) Expunere OTLP controlata:

- Traefik route pentru `otel-collector` cu allowlist si TLS.

2) Standardizare labels:

- Prefix comun pentru `service`, `env`, `team` in loguri/metrics.

3) Onboarding aplicatii:

- Template standard: `PROMETHEUS_SCRAPE=true`, `OTEL_EXPORTER_OTLP_ENDPOINT`, labels Loki.

4) Alerting matur:

- Extindere `alertmanager.yml` (routing pe severitate, email/Slack).

5) Monitorizare agent pe hosturi externe:

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

## WireGuard VPN (orchestrator <-> home/ctera)

WG_ORCHESTRATOR_PUBLIC_KEY=z78VcOe+/Ip86Ujc7+jRxYAvTzhc5InxQ7ARikbYgz8=
WG_HOME_PRIVATE_KEY=GJw6yAGPyEzkcQBeIXicBAHN6Qpu8mQXwLpI8p/PDlQ=
WG_HOME_PUBLIC_KEY=LEH3HPvFnEINQkOBYCN3jiMTxaAmGgQOlbAgL/1cwEg=
WG_ORCHESTRATOR_ENDPOINT=77.42.76.185:51820
WG_HOME_ADDRESS=10.99.0.2/24

Sfarsit raport.
