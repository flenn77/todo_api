# Todo API Observabilité et Tests

**Ce guide accompagne un projet Node.js complet (API TODO) avec base SQLite, Redis pour cache et idempotence, BullMQ pour la file de travail, et observabilité via OpenTelemetry (Prometheus + Jaeger) et tableau de bord Grafana.**

---

## 📋 Prérequis

1. **Système d'exploitation** : Linux (Debian/Ubuntu recommandé).
2. **Docker & Docker Compose** : pour lancer rapidement tous les services (Redis, Prometheus, Jaeger, Grafana, etc.).
3. **Node.js v18+** : runtime pour l’API.
4. **npm** : gestionnaire de packages Node.js.
5. **k6** : outil de test de charge (installation via apt).
6. **Git** : pour cloner le dépôt.

### Installation de k6 (optionnel, pour la partie tests)

```bash
sudo apt install -y gnupg software-properties-common
curl -s https://dl.k6.io/key.gpg | sudo apt-key add -
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt update
sudo apt install -y k6
```

> **Pourquoi k6 ?**
>
> * Permet de simuler des utilisateurs virtuels (VUs) sur l’API.
> * Génère des métriques (durées, erreurs) et valide des seuils de performance.

---

## 🏗️ Structure du projet

```
todo-api/
├── src/
│   ├── app.js              # point d’entrée de l’API
│   ├── observability.js    # configuration OpenTelemetry
│   ├── db.js               # init SQLite + WAL + index
│   ├── db-init.js          # script d’initialisation SQLite
│   ├── scripts/            # scripts utilitaires (explain, tests k6)
│   │   ├── explain.js      # EXPLAIN QUERY PLAN SQLite
│   │   ├── baseline.js     # test de baseline k6
│   │   └── load-test.js    # test de charge k6
│   ├── middleware/         # middlewares Express
│   │   ├── cache.js        # cache Redis sur GET /todos
│   │   ├── idempotency.js  # idempotence via Idempotency-Key
│   │   ├── rateLimiter.js  # rate limit Redis/IP
│   │   └── validate.js     # validation JSON body via AJV
│   ├── routes/
│   │   └── todos.js        # routes CRUD /todos
│   ├── services/           # services partagés
│   │   ├── redisClient.js  # client Redis partagé
│   │   └── queue.service.js# file BullMQ
│   ├── worker.js           # worker BullMQ
│   └── logger.js           # logger Winston/fichier
├── prometheus.yml          # config Prometheus scrape
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/    # provisioning Grafana Datasources
│   │   └── dashboards/     # provisioning Grafana Dashboards
│   └── provisioning/dashboards/todo-api-dashboard.json
├── docker-compose.yml      # définition stack (Redis, API, Prom, Graf, Jaeger)
├── Dockerfile              # build image API & worker
├── ecosystem.config.js     # config PM2 cluster
├── test.sh                 # script de tests fonctionnels via curl
├── project.sh              # script de test rate-limit
└── package.json            # dépendances Node.js
```

> **Pourquoi Docker ?**
>
> * **Redis** : cache, idempotence, store pour rate-limiter.
> * **Prometheus** : collecte métriques exposées /metrics.
> * **Grafana** : visualisation des métriques.
> * **Jaeger** : collecte et visualisation des traces distribuées.

---

## 🚀 Installation & lancement

1. **Cloner le dépôt** :

```bash
git clone https://github.com/flenn77/todo_api.git
cd todo-api
````

2. **Assembler tous les services** (API, Redis, Prometheus, Grafana, Jaeger) :

```bash
# À la racine du projet :
docker-compose up -d --build
````

3. **Vérifier** :

   * API → [http://localhost:3000/health](http://localhost:3000/health) (devrait renvoyer `{ "status": "UP" }`).
   * Prometheus → [http://localhost:9090/targets](http://localhost:9090/targets) (job `todo-api` up).
   * Grafana → [http://localhost:3001](http://localhost:3001) (login `admin` / `admin`).
   * Jaeger → [http://localhost:16686](http://localhost:16686) (UI Jaeger).

> **Note** : l’API expose ses métriques sur le port **9464**, mais Prometheus les scrape via `api:9464` défini en observability.

---

## ⚙️ Fonctionnement interne

### Base SQLite (`src/db.js`)

* **Mode WAL** : Write-Ahead-Log pour concurrence lecture/écriture.
* **busy\_timeout=5000** : attend jusqu’à 5s si la DB est verrouillée.
* **Table `todos`** : `id`, `title`, `done`, `created_at`.
* **Index** : accélère `WHERE done = ?`.

### Middleware Express

1. **GZIP** (**compression**) : compresse toutes les réponses.
2. **Rate limit** (**express-rate-limit + RedisStore**) : 100 requêtes/IP/minute.
3. **Idempotence** : header `Idempotency-Key` stocke réponse dans Redis 24h.
4. **Cache** : GET `/todos` est mis en cache TTL 60s dans Redis.
5. **Validation** : schémas JSON via AJV (création & patch).

### BullMQ Worker (`worker.js`)

* File `todoQueue` pour traitement asynchrone (ex. envoi email, rapport…)

### Observabilité (`src/observability.js`)

* **OpenTelemetry SDK** collecte automatiquement:

  * traces HTTP, express, SQLite (via auto-instrumentations).
  * default Node.js metrics (GC, event-loop, heap).
* **PrometheusExporter** : publie métriques sur `:9464/metrics`.
* **JaegerExporter** : envoie traces à Jaeger agent UDP (`localhost:6831`).

### Custom Metrics (`src/app.js`)

* **Counters** : `http_requests_total`, `http_request_errors_total`.
* **Histogram** : `http_request_duration_seconds` buckets 0.01–5s.
* Incrémentation dans middleware, labelisé par `{ method, route, status_code }`.
* Endpoint `/metrics` combine default + custom.

---

## 🔍 Visualisation & Dashboards

1. **Prometheus** : [http://localhost:9090](http://localhost:9090) → interroger métriques (ex. `http_requests_total`).
2. **Grafana** : [http://localhost:3001](http://localhost:3001) → dashboard "Todo API Monitoring":

   * **P95**, **P99** latency.
   * **Requêtes/s** & **erreurs/s**.
3. **Jaeger** : [http://localhost:16686](http://localhost:16686) → rechercher traces par service `todo-api` ou `jaeger-query`. Traces montrent latence et erreurs sur chaque appel.

---

## 🧪 Tests

### Tests fonctionnels (script `test.sh`)

```bash
# Vérifie health, CRUD /todos, idempotence, cache, rate-limit, EXPLAIN, histogram
bash test.sh
```

### Tests de performance avec k6

**Baseline** : ramp-up → 50 VUs → test → ramp-down

```bash
k6 run scripts/baseline.js
```

*Seuils : p95 < 200ms, p99 < 500ms.*

**Load-test** : 20 VUs sur 5 min

```bash
k6 run scripts/load-test.js
```
---

### Glossaire rapide

* **Prometheus** : collecte métriques auprès des services.
* **Grafana** : visualisation graphique de métriques.
* **Jaeger** : traçage distribué, permet d’analyser latence et écarts.
* **OpenTelemetry** : SDK unifié pour exporter traces et métriques.
* **BullMQ** : file Redis pour tâches asynchrones.
* **SQLite** : base de données légère embarquée.
* **Redis** : cache, store pour rate-limit et idempotence.
* **k6** : outil de test de charge.


