# Despliegue en un VPS

Un VPS con Docker y un proxy compartido (Caddy) delante de todas las apps. Caddy recibe el tráfico en los puertos 80 y 443, consigue y renueva los certificados HTTPS él solo y envía cada dominio a su contenedor. Para añadir otra app más adelante basta con un contenedor nuevo en la red `web` y un fichero en `proxy/sites/`.

```
Internet ──► Caddy (80/443) ──► per-quiz:8787        (red Docker «web»)
                            └─► otra-app:3000 …
```

```
deploy/
  proxy/                 proxy compartido, se instala una sola vez por servidor
    compose.yml
    Caddyfile            ajustes comunes; importa sites/*.caddy
    sites/*.caddy        un fichero por app (no se suben al repo; hay un .example)
  per-quiz/
    compose.yml          la app; construye la imagen desde per-quiz-src/Dockerfile
```

## 1. Lo que necesitas

- **Un VPS** con Ubuntu 24.04 y al menos 1 GB de RAM. Para esto y varias apps pequeñas basta uno de 2 vCPU y 4 GB (por ejemplo, Hetzner CX22). Elige un centro de datos en Europa.
- **Un dominio** cuyos DNS puedas editar.
- **El código en el servidor.** Lo más cómodo es un repositorio privado en GitHub y clonarlo desde el VPS.

## 2. DNS

Crea un registro `A` (y `AAAA` si el VPS tiene IPv6) que apunte el subdominio de la app a la IP del VPS, por ejemplo `per.tudominio.com → 203.0.113.10`. Caddy solo puede sacar el certificado cuando el dominio ya resuelve a esa IP.

## 3. Preparar el servidor (una vez)

Entra como root con tu clave SSH y crea un usuario para trabajar:

```bash
adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

Cortafuegos: SSH, HTTP y HTTPS (también 443/udp, para HTTP/3):

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443
ufw enable
```

Actualizaciones de seguridad automáticas:

```bash
apt update && apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

En `/etc/ssh/sshd_config` pon `PasswordAuthentication no` y `PermitRootLogin no`, y después `systemctl restart ssh`. Antes de cerrar la sesión de root, comprueba en otra terminal que puedes entrar como `deploy`.

Docker:

```bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
```

Docker publica los puertos saltándose ufw. Aquí solo Caddy publica puertos (80 y 443), así que no pasa nada. No añadas `ports:` a las apps.

## 4. Traer el código

Como `deploy`, con el repositorio en GitHub. Genera una clave en el VPS y añádela al repositorio como *deploy key* de solo lectura (Settings → Deploy keys):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/github_per_quiz -N ""
cat ~/.ssh/github_per_quiz.pub
```

```bash
cat >> ~/.ssh/config <<'EOF'
Host github-per-quiz
  HostName github.com
  IdentityFile ~/.ssh/github_per_quiz
EOF
mkdir -p ~/apps && cd ~/apps
git clone git@github-per-quiz:TU_USUARIO/per-quiz.git
```

El repositorio incluye los PDF de los exámenes (unos 35 MB).

## 5. Arrancar el proxy (una vez por servidor)

```bash
docker network create web
cd ~/apps/per-quiz/deploy/proxy
cp .env.example .env                                  # pon tu correo en ACME_EMAIL
cp sites/per-quiz.caddy.example sites/per-quiz.caddy  # pon tu dominio
docker compose up -d
```

Si en el futuro el proxy tiene que atender apps de varios repositorios, copia la carpeta `proxy/` a `~/proxy` y gestiónala desde ahí, fuera de cualquier repositorio.

## 6. Arrancar la app

```bash
cd ~/apps/per-quiz/deploy/per-quiz
mkdir -p backups && sudo chown 1000:1000 backups     # el contenedor escribe como el usuario node (uid 1000)
docker compose up -d --build
docker compose ps                                     # debe salir «healthy»
```

Abre `https://per.tudominio.com`. La primera visita puede tardar unos segundos mientras Caddy obtiene el certificado. Si no carga, revisa `docker compose -f ../proxy/compose.yml logs caddy`.

## Actualizar

```bash
cd ~/apps/per-quiz
git pull
cd deploy/per-quiz && docker compose up -d --build
```

La base de datos vive en el volumen `per-quiz_data` y no se toca al reconstruir. Las sesiones abiertas se mantienen.

## Copias de seguridad

Para hacer una copia ahora, sin parar la app:

```bash
cd ~/apps/per-quiz/deploy/per-quiz
docker compose exec per-quiz node scripts/backup.ts
```

Se guardan en `deploy/per-quiz/backups/` y se conservan las 14 más recientes (`BACKUP_KEEP` en `compose.yml`). Para una copia diaria a las 4:00, añade esto con `crontab -e`:

```
0 4 * * * cd /home/deploy/apps/per-quiz/deploy/per-quiz && docker compose exec -T per-quiz node scripts/backup.ts >> backups/backup.log 2>&1
```

Una copia guardada en el mismo VPS no te protege si pierdes el servidor. Copia esa carpeta fuera de vez en cuando, o activa las copias automáticas del proveedor.

Para restaurar una copia:

```bash
docker compose stop per-quiz
docker compose run --rm -v "$PWD/backups:/restore" --entrypoint sh per-quiz \
  -c 'cp /restore/per-quiz-AAAAMMDD-HHMM.db /data/per-quiz.db && rm -f /data/per-quiz.db-wal /data/per-quiz.db-shm'
docker compose start per-quiz
```

## Añadir otra app al mismo servidor

1. Dale a la app su propio `compose.yml`, sin `ports:` y unida a la red externa `web`, igual que `per-quiz/compose.yml`.
2. Crea `proxy/sites/otra-app.caddy`:

   ```
   otra.tudominio.com {
   	import common
   	reverse_proxy nombre-del-servicio:PUERTO
   }
   ```

3. Recarga Caddy sin cortar las demás apps:

   ```bash
   docker compose -f ~/apps/per-quiz/deploy/proxy/compose.yml exec caddy caddy reload --config /etc/caddy/Caddyfile
   ```
