# Troubleshooting Guide

Acest ghid abordează problemele comune întâlnite în timpul dezvoltării și rulării locale a Cerniq.app.

## 1. Local Environment Issues

### 1.1 Port Conflicts (EADDRINUSE)

**Simptom:**
Containerul `api` sau `postgres` eșuează la start cu erori de port.

**Soluție:**
Verificați ce blochează porturile 64000+, 64032, 64039.

```bash
lsof -i :64000
# Închideți procesele locale sau modificați porturile în .env (HOST_PORT)
```

### 1.2 Database Connection Refused

**Simptom:**
`logs` arată `Connection refused at localhost:64032` deși containerul pare up.

**Cauză:**
PostgreSQL nu este încă "Healthy".

**Soluție:**
Așteptați până când log-urile DB arată `database system is ready to accept connections`.
Configurați `depends_on` cu `condition: service_healthy` în docker-compose.

## 2. Docker & Containers

### 2.1 Permission Denied (Linux)

**Simptom:**
`docker.sock: connect: permission denied`.

**Soluție:**
Adăugați user-ul curent în grupul docker:

```bash
sudo usermod -aG docker $USER
# Log out și Log in din nou
```

### 2.2 Containerul iese imediat (Exit 0 sau Exit 1)

**Soluție:**
Verificați logs. De obicei lipsește o variabilă de mediu critică.

```bash
docker logs cerniq-api
```

## 3. Application Specific

### 3.1 Migrations Failed

**Simptom:**
API-ul dă erori de schemă lipsă (`relation "users" does not exist`).

**Soluție:**
Rulați migrarea manual:

```bash
pnpm db:migrate
# Sau intrați în container
docker exec -it cerniq-api pnpm db:migrate
```

### 3.2 Redis Quota Keys Missing

**Simptom:**
Erori legate de `quota:wa:...`.

**Soluție:**
Redis-ul de development pornește gol. Rulați seed scripts sau ignorați până la primul job.

## 4. Obtinere Ajutor

Dacă problema nu este listată aici:

1. Verificați [Master Specification](../specifications/master-specification.md).
2. Verificați log-urile din SigNoz (<http://localhost:64089>).
3. Deschideți un Issue pe GitHub cu tag-ul `bug`.
