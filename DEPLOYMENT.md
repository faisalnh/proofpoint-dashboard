# Deployment Guide

This guide covers how to deploy the ProofPoint Dashboard to production.

## Deployment Architecture

The deployment process uses a **hybrid approach**:
- **GitHub Actions**: Builds application and triggers server deployment
- **Server-side script**: Handles the actual deployment with database backups

## GitHub Actions Setup

### Required Secrets

Go to repository → **Settings** → **Secrets and variables** → **Actions** and add:

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `SERVER_HOST` | Server IP address | `172.16.0.189` |
| `SERVER_USER` | SSH username | `root` |
| `SERVER_PASSWORD` | SSH password | `your_password` |
| `DATABASE_URL` | Database connection string | `postgresql://...` |
| `NEXTAUTH_URL` | Application URL | `http://172.16.0.189:3060` |
| `NEXTAUTH_SECRET` | Auth secret | `your_secret_key` |

### How It Works

When you push to `main` branch:

1. **GitHub Actions (CI)**
   - Checks out code
   - Installs dependencies
   - Generates Prisma Client
   - Builds Next.js application
   - SSHs into server
   - Triggers server deployment script

2. **Server Script (CD)**
   - Creates database backup
   - Pulls latest code
   - Installs dependencies
   - Applies migrations
   - Restarts application
   - Health checks

## Deployment Options

### Option 1: Automatic (GitHub Actions) - **Recommended**

Push to `main` branch:
```bash
git add .
git commit -m "Your changes"
git push origin main
```

GitHub Actions automatically builds and deploys. Watch progress in the **Actions** tab.

### Option 2: Manual Local Script

From your local machine:
```bash
./deploy.sh
```

This does the same as GitHub Actions but triggered manually.

### Option 3: Server-Side Only

SSH into server and run:
```bash
ssh root@172.16.0.189
cd /root/proofpoint-dashboard
./scripts/server-deploy.sh
```

### Option 4: Quick Deploy (For Small Updates)

```bash
./quick-deploy.sh
```

Skips the build step. Use for:
- Database migrations only
- Environment variable changes
- Small CSS fixes

## Server-Side Setup

### Initial Setup (One-Time)

Run these on the server once:

```bash
# SSH to server
ssh root@172.16.0.189

# Navigate to project
cd /root/proofpoint-dashboard

# Make scripts executable
chmod +x scripts/server-deploy.sh
chmod +x scripts/post-deploy.sh
chmod +x deploy.sh
chmod +x quick-deploy.sh

# Create docker-compose.yml if needed
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

### `scripts/server-deploy.sh` (Main Server Script)

Full production deployment:
```bash
./scripts/server-deploy.sh
```

**Steps:**
1. Database backup
2. Pull latest code
3. Install dependencies (`npm ci`)
4. Generate Prisma Client
5. Apply migrations
6. Build application (`npm run build`)
7. Restart container
8. Health check

### `scripts/post-deploy.sh` (Post-Deploy Hook)

Runs after deployment for additional tasks:
```bash
./scripts/post-deploy.sh
```

**Steps:**
1. Generate Prisma Client
2. Apply migrations
3. Clear Next.js cache
4. Restart application
5. Health verification

### `deploy.sh` (Local Machine)

Triggers server deployment from your local machine:
```bash
./deploy.sh
```

### `quick-deploy.sh` (Fast Updates)

Quick deployment without rebuild:
```bash
./quick-deploy.sh
```

## Database Migrations

### Creating a Migration

After modifying `prisma/schema.prisma`:

```bash
# Create migration locally
npm run db:migrate:dev --name description

# Test it
npm run db:push

# Commit the migration
git add prisma/migrations/
git commit -m "Add migration: description"
git push origin main
```

Migrations are **automatically applied** during deployment!

### Manual Migration

To apply migrations without full deployment:

```bash
ssh root@172.16.0.189
cd /root/proofpoint-dashboard
npm run db:migrate:deploy
```

## Monitoring

### Check Deployment Status

```bash
# GitHub Actions
# Go to repository → Actions tab

# Server logs
ssh root@172.16.0.189
docker logs proofpoint-app --tail 100 -f

# Container status
docker ps --filter name=proofpoint
```

### Application Health

```bash
# HTTP check
curl http://172.16.0.189:3060

# Container health
ssh root@172.16.0.189 'docker ps --filter name=proofpoint'
```

## Troubleshooting

### Deployment Fails

1. **Check GitHub Actions logs** in the Actions tab
2. **Check server logs:**
   ```bash
   ssh root@172.16.0.189
   docker logs proofpoint-app --tail 100
   ```
3. **Restart manually:**
   ```bash
   cd /root/proofpoint-dashboard
   docker-compose restart app
   ```

### Migration Errors

If migrations fail:

```bash
ssh root@172.16.0.189
cd /root/proofpoint-dashboard

# Check migration status
npx prisma migrate status

# Reset last migration (WARNING: Can't undo)
npx prisma migrate resolve --rolled-back [migration-name]

# Or reset everything (WARNING: Deletes data!)
npm run db:migrate:reset
```

### Rollback

To rollback to previous version:

```bash
ssh root@172.16.0.189
cd /root/proofpoint-dashboard

# Reset to previous commit
git reset --hard HEAD~1

# Rebuild and restart
npm run build
docker-compose restart app
```

Or from GitHub:
1. Go to Actions tab
2. Find previous successful workflow
3. Re-run that workflow

## Best Practices

1. **Test migrations locally first**
   ```bash
   npm run db:migrate:dev --name test_migration
   npm run db:push
   ```

2. **Small, frequent deployments** are better than large ones

3. **Always check Actions tab** after pushing to ensure deployment succeeded

4. **Monitor application** after deployment:
   - Check if critical features work
   - Monitor error logs
   - Verify database operations

5. **Keep backups** - The script automatically creates backups before deployment

## Production Checklist

Before deploying to production:

- [ ] Code tested locally
- [ ] Migration tested on staging/dev
- [ ] Environment variables configured
- [ ] Database backup verified
- [ ] Sufficient disk space on server
- [ ] Docker containers healthy
- [ ] Rollback plan ready

## Security Notes

- ⚠️ **Never commit `.env` file** to git
- ⚠️ **Use GitHub Secrets** for sensitive data
- ⚠️ **Rotate passwords** regularly
- ⚠️ **Keep dependencies updated** with `npm audit fix`
- ⚠️ **Limit SSH access** to specific IPs (firewall)
- ⚠️ **Use HTTPS** in production (setup reverse proxy)

## URLs

- **Application:** http://172.16.0.189:3060
- **GitHub Actions:** https://github.com/[your-repo]/actions
- **Server:** ssh root@172.16.0.189

## Support

For deployment issues:
1. Check GitHub Actions logs
2. Check server logs: `docker logs proofpoint-app`
3. Review this documentation
4. Check Prisma docs: https://www.prisma.io/docs
