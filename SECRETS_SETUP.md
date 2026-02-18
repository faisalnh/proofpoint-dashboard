# GitHub Secrets Setup

## Required Secrets for Deployment

Add these secrets to your GitHub repository:

**Go to:** https://github.com/faisalnh/proofpoint-dashboard/settings/secrets/actions

### Required Secrets

| Secret Name | Description | Example |
|------------|-------------|---------|
| `KOMODO_WEBHOOK_URL` | Webhook URL to trigger deployment | `http://your-komodo-server.com/deploy` |
| `KOMODO_WEBHOOK_SECRET` | Webhook secret for authentication | `your-webhook-secret-key` |
| `DATABASE_URL` | Database connection string | `postgresql://user:pass@host:5432/db` |
| `NEXTAUTH_URL` | Application URL | `http://your-server.com:3060` |
| `NEXTAUTH_SECRET` | NextAuth secret key | `your-secret-key` |

### No SSH Credentials Needed

✓ No KOMODO_HOST required
✓ No KOMODO_USER required  
✓ No KOMODO_PASSWORD required

The deployment uses a simple HTTP webhook instead of SSH.

## Setup on Komodo Server

Your webhook receiver should:

1. Accept POST requests with JSON payload
2. Verify the `x-webhook-secret` header
3. Run the deployment script with the image name
4. Apply Prisma migrations automatically

Example webhook handler:
```bash
#!/bin/bash
# On Komodo server
IMAGE_NAME=$(echo "$1" | jq -r '.image')
cd /root/proofpoint-dashboard
./scripts/komodo-deploy.sh "$IMAGE_NAME"
```
