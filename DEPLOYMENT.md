# Deployment Guide

This guide covers how to deploy the ProofPoint Dashboard to production using automated scripts.

## Deployment Options

### 1. Local Deployment Script (Recommended)

Use the deployment script from your local machine:

```bash
./deploy.sh
```

This script will:
- ✅ Check dependencies
- ✅ Backup the database
- ✅ Pull latest code from git
- ✅ Install dependencies
- ✅ Generate Prisma Client
- ✅ Apply database migrations
- ✅ Build the application
- ✅ Restart the application

### 2. Quick Deploy (For Small Updates)

For quick updates that don't require a full rebuild:

```bash
./quick-deploy.sh
```

This skips the build step and just restarts the application.

### 3. GitHub Actions (CI/CD)

Automatically deploy when pushing to `main` branch:

**Setup Required:**

1. Go to GitHub repository settings
2. Navigate to **Secrets and variables** → **Actions**
3. Add the following secrets:

| Secret Name | Value | Description |
|------------|-------|-------------|
| `SERVER_HOST` | `172.16.0.189` | Server IP address |
| `SERVER_USER` | `root` | SSH username |
| `SERVER_PASSWORD` | `root` | SSH password |

4. Enable GitHub Actions in your repository
5. Push to `main` branch - deployment runs automatically

**Manual Trigger:**

You can also trigger the workflow manually from GitHub:
1. Go to **Actions** tab
2. Select **Deploy to Production**
3. Click **Run workflow**

### 4. Manual Server Deployment

SSH into the server and run:

```bash
ssh root@172.16.0.189
cd /root/proofpoint-dashboard
git pull origin main
npm install
npm run db:generate
npm run db:migrate:deploy
npm run build
docker-compose restart app
```

## Server-Side Setup

### Initial Setup

Run these commands once on the server:

```bash
# SSH to server
ssh root@172.16.0.189

# Navigate to project directory
cd /root/proofpoint-dashboard

# Make post-deploy script executable
chmod +x scripts/post-deploy.sh

# Create docker-compose.yml if not exists
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  db:
    image: postgres:15
    container_name: proofpoint-db
    environment:
      POSTGRES_DB: proofpoint
      POSTGRES_USER: proofpoint
      POSTGRES_PASSWORD: UgQp4XEDDFsbpRZYkhEEdMXP
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  app:
    build: .
    container_name: proofpoint-app
    ports:
      - "3060:3000"
    environment:
      - DATABASE_URL=postgresql://proofpoint:UgQp4XEDDFsbpRZYkhEEdMXP@db:5432/proofpoint
      - NODE_ENV=production
    depends_on:
      - db
    restart: unless-stopped

volumes:
  postgres_data:
EOF

# Start containers
docker-compose up -d
```

## Deployment Scripts

### `deploy.sh` (Full Deployment)

Full deployment with database backup and rebuild:

```bash
./deploy.sh
```

**Features:**
- Database backup before deployment
- Pull latest code
- Install dependencies
- Generate Prisma Client
- Apply migrations
- Build Next.js app
- Restart application
- Health check

### `quick-deploy.sh` (Fast Deployment)

Quick deployment without rebuild:

```bash
./quick-deploy.sh
```

**Use when:**
- Only database changes (migrations)
- Environment variable changes
- Small CSS/fix changes

**Don't use when:**
- New dependencies added
- Major code changes
- API changes

## Database Migrations

### Creating a Migration

After modifying `prisma/schema.prisma`:

```bash
# Create migration locally
npm run db:migrate:dev --name description

# Commit the migration
git add prisma/migrations/
git commit -m "Add migration: description"
git push origin main
```

### Applying Migrations on Production

Migrations are **automatically applied** during deployment via:
- `deploy.sh` (local script)
- GitHub Actions workflow
- `quick-deploy.sh`

To manually apply migrations:

```bash
# From local machine
sshpass -p 'root' ssh root@172.16.0.189 \
  'cd /root/proofpoint-dashboard && npm run db:migrate:deploy'
```

## Troubleshooting

### Deployment Fails

1. **Check logs:**
   ```bash
   ssh root@172.16.0.189
   docker logs proofpoint-app --tail 100
   ```

2. **Check container status:**
   ```bash
   docker ps
   ```

3. **Restart manually:**
   ```bash
   cd /root/proofpoint-dashboard
   docker-compose restart app
   ```

### Migration Conflicts

If migrations fail:

```bash
# Check migration status
ssh root@172.16.0.189
cd /root/proofpoint-dashboard
npx prisma migrate status

# Reset (WARNING: Deletes data!)
npm run db:migrate:reset
```

### Rollback

To rollback to previous version:

```bash
ssh root@172.16.0.189
cd /root/proofpoint-dashboard
git reset --hard HEAD~1
docker-compose restart app
```

## Monitoring

### Check Application Health

```bash
# Check if app is running
curl http://172.16.0.189:3060

# Check container status
ssh root@172.16.0.189 'docker ps --filter name=proofpoint'
```

### View Logs

```bash
# Real-time logs
ssh root@172.16.0.189 'docker logs -f proofpoint-app'

# Last 100 lines
ssh root@172.16.0.189 'docker logs --tail 100 proofpoint-app'
```

## Best Practices

1. **Always backup before major changes**
   - The `deploy.sh` script creates automatic backups

2. **Test migrations locally first**
   ```bash
   # Local test
   npm run db:migrate:dev --name test_migration
   
   # Only then commit and push
   git add .
   git commit -m "Add migration"
   git push
   ```

3. **Use GitHub Actions for team deployments**
   - Prevents manual errors
   - Keeps deployment history
   - Easy rollback

4. **Monitor after deployment**
   - Check application health
   - Monitor error logs
   - Verify critical features

## Production Checklist

Before deploying to production:

- [ ] Tests pass locally
- [ ] Migration tested on staging
- [ ] Environment variables updated
- [ ] Database backup verified
- [ ] Sufficient disk space on server
- [ ] Docker containers healthy
- [ ] Rollback plan ready

## Security Notes

- ⚠️ **Never commit `.env` file** to git
- ⚠️ **Use strong passwords** for production
- ⚠️ **Keep dependencies updated** with `npm audit fix`
- ⚠️ **Use SSH keys** instead of passwords (preferred)
- ⚠️ **Limit SSH access** to specific IPs
- ⚠️ **Enable HTTPS** in production (use reverse proxy like nginx)

## URLs

- **Application:** http://172.16.0.189:3060
- **Prisma Studio:** Run `npm run db:studio` locally and connect to DATABASE_URL
