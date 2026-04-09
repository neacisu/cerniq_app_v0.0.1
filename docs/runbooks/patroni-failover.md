# Patroni — failover, switchover și integrare (PostgreSQL HA)

Configurații: `infra/config/patroni/patroni.yml` (CT107), `patroni-standby.yml` (CT108). DCS folosit: **etcd3** la `ct108-etcd:2379` — trebuie **disponibil și sănătos** înainte de bootstrap; fără DCS Patroni nu poate alege leader.

## Dependențe DCS (etcd)

1. Procesul `etcd` trebuie să ruleze și să fie accesibil din rețeaua `10.0.1.0/24` (conform `pg_hba` / firewall).
2. Pe nodul nou Patroni: verificați `etcdctl endpoint health` (sau echivalent) către `ct108-etcd:2379`.
3. Nu presupunem instalare automată etcd în acest repo — documentația de provisioning a infrastructurii (CT108) trebuie urmată separat.

## Bootstrap cluster

- **Prima** instanță Patroni (ex. CT107) cu `bootstrap` în DCS inițializează Postgres conform `patroni.yml`.
- **A doua** instanță (CT108) se alătură aceluiași `scope: cerniq-pg` și `namespace`; de obicei **nu** re-rulați bootstrap complet pe al doilea nod — folosiți fluxul Patroni pentru replica (clone/pg_basebackup) conform documentației Patroni pentru „join existing cluster”.
- Fișierul `patroni-standby.yml` fixează adresele REST (`:8008`) și Postgres; ajustați `data_dir` dacă path-ul pe CT108 diferă.

## Failover automat

Dacă primary-ul nu mai răspunde, Patroni promovează un standby (depinde de DCS, quorum, `failsafe`).

```bash
patronictl -c /etc/patroni/patroni.yml list
```

## Failover manual

```bash
patronictl -c /etc/patroni/patroni.yml failover cerniq-pg
```

## Switchover planificat

```bash
patronictl -c /etc/patroni/patroni.yml switchover cerniq-pg
```

## Reatașare primary vechi ca standby

După ce instanța revine online, folosiți `pg_rewind` (Patroni `use_pg_rewind: true` în DCS) sau re-bootstrap din backup fizic (`infra/scripts/pg_basebackup_weekly.sh`) către **noul** primary — urmați documentația Patroni pentru reintegrare.

## PgBouncer

PgBouncer din Docker trebuie să trimită traficul către **PostgreSQL primary** curent.

- Template OpenBao: `infra/config/openbao/templates/pgbouncer-ini.tpl`
- Setați în `secret/cerniq/infra/pgbouncer` câmpul **`pgbouncer_postgres_host`** (DNS/VIP leader sau IP primary după `patronictl list`).
- Fără acest câmp, default rămâne `10.0.1.107` (compatibil single-node istoric).
- Callback-uri Patroni (reîncărcare PgBouncer) pot fi adăugate în infrastructură; nu sunt incluse în acest repo — documentați-le în runbook-ul operațional al echipei infra.

## Metrici și alerte

- Prometheus: job `cerniq-patroni` în `infra/config/prometheus/prometheus.yml` (REST `:8008/metrics` pe **CT107 și CT108**).
- Alerte: `infra/config/prometheus/infra-cerniq-alerts.yml` — `PatroniLeaderMissing`, `PatroniReplicaLag` (proxy WAL bytes), `PatroniFailover` (schimbare timeline), plus `PatroniTargetDown` informativ.

## pg_basebackup săptămânal și Patroni

Script: `infra/scripts/pg_basebackup_weekly.sh`. Rulează `pg_basebackup` către `PG_HOST` (implicit `127.0.0.1` pe host-ul unde e executat).

- Pe **primary curent**, conexiunea locală sau la IP leader este corectă.
- După failover, dacă scriptul rulează pe **fost** primary oprit, actualizați `PG_HOST` / procedura astfel încât backup-ul să lovească noul primary (sau rulați scriptul pe nodul care găzduiește primary-ul).

## Migrări aplicație (`packages/db`)

`migrate-cli` folosește `DATABASE_DIRECT_URL` / `DATABASE_URL` — după failover, atâta timp cât PgBouncer sau DNS-ul indică noul primary, migrările rămân valide. Verificați conectivitatea și `pg_is_in_recovery()` pe ținta de scriere (nu pe standby).
