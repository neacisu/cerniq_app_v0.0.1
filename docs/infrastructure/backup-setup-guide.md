# CERNIQ.APP — Backup Setup Guide

## Ghid Configurare Hetzner Storage Box & BorgBackup

**Versiune:** 1.0  
**Data:** 20 Ianuarie 2026  
**Referință:** [Backup Strategy](./backup-strategy.md)

---

## PREREQUISITES

### 1. Cont Hetzner

1. Creează cont pe [Hetzner](https://www.hetzner.com/)
2. Comandă Storage Box (minim BX11 = 100GB pentru start)
3. Notează credențialele primite pe email

### 2. SSH Keys

Generează cheie SSH dedicată pentru backup:

```bash
# Pe server-ul Cerniq
ssh-keygen -t ed25519 -f ~/.ssh/hetzner_backup -C "cerniq-backup"

# Nu pune parolă pentru automatizare (sau folosește ssh-agent)
```

---

## CONFIGURARE HETZNER STORAGE BOX

### 1. Activare SSH Access

1. Login la Hetzner Robot → Storage Box
2. Tab "SSH Keys"
3. Adaugă cheia publică: `~/.ssh/hetzner_backup.pub`
4. Activează "SSH Support"

### 2. Creare Subdirectoare

```bash
# Conectare la Storage Box
ssh -i ~/.ssh/hetzner_storagebox u502048@u502048.your-storagebox.de -p 23

# Creare structură
mkdir -p ./backups/cerniq/{postgres,redis,files,borg}
```

### 3. Inițializare Borg Repository

```bash
# Pe server-ul Cerniq
export BORG_REPO="ssh://u502048@u502048.your-storagebox.de:23/./backups/cerniq/borg"
export BORG_RSH="ssh -i ~/.ssh/hetzner_storagebox"
export BORG_PASSPHRASE=$(cat /var/www/CerniqAPP/secrets/borg_passphrase.txt)

# Inițializare repo
borg init --encryption=repokey-blake2 $BORG_REPO
```

---

## ENVIRONMENT VARIABLES

Adaugă în `.env.production` sau Docker secrets:

```bash
# Hetzner Storage Box
HETZNER_STORAGEBOX_USER=u502048
HETZNER_STORAGEBOX_HOST=u502048.your-storagebox.de
HETZNER_STORAGEBOX_PORT=23
HETZNER_STORAGEBOX_PATH=./backups/cerniq

# Borg
BORG_REPO=ssh://${HETZNER_STORAGEBOX_USER}@${HETZNER_STORAGEBOX_HOST}:${HETZNER_STORAGEBOX_PORT}/${HETZNER_STORAGEBOX_PATH}/borg
BORG_PASSPHRASE=<from-docker-secret>

# SSH Key Path
BACKUP_SSH_KEY=/run/secrets/hetzner_backup_key
```

### Docker Secrets Setup

```bash
# Creare secrets
echo "u502048" | docker secret create hetzner_user -
cat ~/.ssh/hetzner_backup | docker secret create hetzner_backup_key -
echo "<passphrase>" | docker secret create borg_passphrase -
```

---

## VERIFICARE CONECTIVITATE

### Test SSH

```bash
ssh -i ~/.ssh/hetzner_storagebox \
    -p 23 \
    u502048@u502048.your-storagebox.de \
    "ls -la ./backups/cerniq/"
```

### Test Borg

```bash
borg info $BORG_REPO
```

---

## TEST BACKUP/RESTORE

### Backup Test

```bash
# Creare backup test
borg create \
    --stats \
    --progress \
    $BORG_REPO::test-$(date +%Y%m%d-%H%M%S) \
    /var/www/CerniqAPP/docs

# Verificare
borg list $BORG_REPO
```

### Restore Test

```bash
# Extract într-un director temporar
mkdir /tmp/restore-test
cd /tmp/restore-test
borg extract $BORG_REPO::test-XXXXXXXX-XXXXXX

# Verificare conținut
ls -la
```

---

## TROUBLESHOOTING

### Eroare: Connection refused

```bash
# Verifică că SSH este activat pe Storage Box
# Verifică port-ul (23 pentru borg, 22 pentru SSH în Hetzner Robot)
ssh -v -p 23 u502048@u502048.your-storagebox.de
```

### Eroare: Permission denied

```bash
# Verifică că cheia SSH este adăugată în Hetzner Robot
# Verifică permisiunile cheii
chmod 600 ~/.ssh/hetzner_backup
```

### Eroare: Repository not found

```bash
# Reinițializează repository-ul
borg init --encryption=repokey-blake2 $BORG_REPO
```

---

## CHECKLIST CONFIGURARE

- [ ] Cont Hetzner creat
- [ ] Storage Box comandat
- [ ] SSH key generat și adăugat
- [ ] Subdirectoare create
- [ ] Borg repository inițializat
- [ ] Environment variables configurate
- [ ] Docker secrets create
- [ ] Test backup executat cu succes
- [ ] Test restore executat cu succes
- [ ] Cron job configurat pentru backup automat

---

## DOCUMENTE CONEXE

- [Backup Strategy](./backup-strategy.md)
- [Environment Variables](../specifications/Etapa%200/etapa0-environment-variables.md)
- [Docker Secrets Guide](../specifications/Etapa%200/etapa0-docker-secrets-guide.md)

---

**Actualizat:** 20 Ianuarie 2026
