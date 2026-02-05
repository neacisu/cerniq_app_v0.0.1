# ADR-0020: BorgBackup cu Hetzner Storage Box

**Status:** Accepted  
**Data:** 2026-01-15  
**Deciders:** Alex (1-Person-Team)

## Context

Necesităm backup offsite pentru disaster recovery cu:

- Deduplicare
- Encriptare
- Retenție configurabilă
- Restore rapid

## Decizie

Utilizăm **BorgBackup 1.4** cu destinație **Hetzner Storage Box** (SSH port 23).

## Consecințe

### Configurație

```bash
# Inițializare repository
borg init --encryption=repokey-blake2 \
  ssh://u502048@u502048.your-storagebox.de:23/./backups/cerniq/borg

# Backup daily
borg create \
  --compression zstd,19 \
  --exclude 'node_modules' \
  --exclude '*.log' \
  ssh://u502048@u502048.your-storagebox.de:23/./backups/cerniq/borg::{hostname}-{now} \
  /var/www/CerniqAPP \
  /etc/cerniq \
  /var/backups/cerniq

# Prune cu GFS retention
borg prune \
  --keep-hourly 6 \
  --keep-daily 7 \
  --keep-weekly 4 \
  --keep-monthly 6 \
  ssh://u502048@u502048.your-storagebox.de:23/./backups/cerniq/borg
```

### Restricții CRITICE

- **EXPORTĂ** și **SALVEAZĂ** borg key în loc sigur (fără ea restore e IMPOSIBIL!)
- `--encryption=repokey` OBLIGATORIU
- NU include node_modules în backup
