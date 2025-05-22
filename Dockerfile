# syntax=docker/dockerfile:1
FROM node:18
WORKDIR /app

# Installer les dépendances et PM2 globalement
COPY package*.json ./
RUN npm install && npm install pm2 -g

# Copier le code source
COPY . .

# Initialiser la base SQLite (mode WAL activé par le script)
RUN node src/db-init.js

# Exposer le port de l’API et de l’export Prometheus
EXPOSE 3000 9464

# Lancer l'application en cluster via PM2
CMD ["pm2-runtime", "ecosystem.config.js"]
