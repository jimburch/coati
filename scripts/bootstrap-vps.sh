#!/usr/bin/env bash
# bootstrap-vps.sh — Provision a fresh Ubuntu 22.04+ VPS for Coati
# Safe to re-run (idempotent). Run as root.

set -euo pipefail

echo "=== Coati VPS Bootstrap ==="

# -----------------------------------------------
# 1. System updates
# -----------------------------------------------
echo ">>> Updating system packages..."
apt update && apt upgrade -y

# -----------------------------------------------
# 2. Node.js 22 (via NodeSource)
# -----------------------------------------------
if ! command -v node &>/dev/null || [[ "$(node --version)" != v22* ]]; then
	echo ">>> Installing Node.js 22..."
	curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
	apt install -y nodejs
else
	echo ">>> Node.js 22 already installed: $(node --version)"
fi

# -----------------------------------------------
# 3. pnpm (via corepack)
# -----------------------------------------------
echo ">>> Enabling corepack and pnpm..."
corepack enable
corepack prepare pnpm@latest --activate

# -----------------------------------------------
# 4. PM2
# -----------------------------------------------
if ! command -v pm2 &>/dev/null; then
	echo ">>> Installing PM2..."
	npm install -g pm2
else
	echo ">>> PM2 already installed: $(pm2 --version)"
fi

# -----------------------------------------------
# 5. PostgreSQL 17
# -----------------------------------------------
if ! command -v psql &>/dev/null; then
	echo ">>> Installing PostgreSQL 17..."
	apt install -y gnupg2
	echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
		>/etc/apt/sources.list.d/pgdg.list
	curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/pgdg.gpg
	apt update
	apt install -y postgresql-17
else
	echo ">>> PostgreSQL already installed: $(psql --version)"
fi

systemctl enable postgresql
systemctl start postgresql

# -----------------------------------------------
# 6. Create databases and user
# -----------------------------------------------
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='coati'" | grep -q 1 || {
	echo ">>> Creating database user 'coati'..."
	sudo -u postgres psql -c "CREATE USER coati WITH PASSWORD '${DB_PASSWORD}';"
}

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='coati_dev'" | grep -q 1 || {
	echo ">>> Creating database 'coati_dev'..."
	sudo -u postgres psql -c "CREATE DATABASE coati_dev OWNER coati;"
}

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='coati_prod'" | grep -q 1 || {
	echo ">>> Creating database 'coati_prod'..."
	sudo -u postgres psql -c "CREATE DATABASE coati_prod OWNER coati;"
}

# -----------------------------------------------
# 7. Caddy
# -----------------------------------------------
if ! command -v caddy &>/dev/null; then
	echo ">>> Installing Caddy..."
	apt install -y debian-keyring debian-archive-keyring apt-transport-https
	curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
	curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
	apt update
	apt install -y caddy
else
	echo ">>> Caddy already installed: $(caddy version)"
fi

systemctl enable caddy

# -----------------------------------------------
# 8. Deploy user
# -----------------------------------------------
if ! id deploy &>/dev/null; then
	echo ">>> Creating deploy user..."
	useradd --system --create-home --home-dir /home/deploy --shell /bin/bash deploy
else
	echo ">>> Deploy user already exists"
fi

# -----------------------------------------------
# 9. Directory structure
# -----------------------------------------------
echo ">>> Setting up directory structure..."
mkdir -p /opt/coati/dev/build
mkdir -p /opt/coati/prod/build
chown -R deploy:deploy /opt/coati

# Create .env templates if they don't exist
for env in dev prod; do
	ENV_FILE="/opt/coati/${env}/.env"
	if [[ ! -f "$ENV_FILE" ]]; then
		cat >"$ENV_FILE" <<'ENVEOF'
# Database
DATABASE_URL=postgresql://coati:PASSWORD@localhost:5432/coati_ENV

# GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Public URL
PUBLIC_SITE_URL=https://SUBDOMAIN.coati.sh

# Server
PORT=PORT_NUMBER
HOST=127.0.0.1
ORIGIN=https://SUBDOMAIN.coati.sh
ENVEOF
		chown deploy:deploy "$ENV_FILE"
		chmod 600 "$ENV_FILE"
	fi
done

# -----------------------------------------------
# 10. PM2 startup
# -----------------------------------------------
echo ">>> Configuring PM2 startup..."
pm2 startup systemd -u deploy --hp /home/deploy

# -----------------------------------------------
# Done
# -----------------------------------------------
echo ""
echo "==========================================="
echo "  Coati VPS Bootstrap Complete!"
echo "==========================================="
echo ""
echo "  Database password for 'coati' user:"
echo "  ${DB_PASSWORD}"
echo ""
echo "  SAVE THIS PASSWORD — it won't be shown again."
echo ""
echo "  Next steps:"
echo "  1. Update /opt/coati/dev/.env with real values"
echo "  2. Copy your Caddyfile to /etc/caddy/Caddyfile"
echo "  3. Set up SSH key for the deploy user"
echo "  4. Add GitHub Actions secrets"
echo "==========================================="
