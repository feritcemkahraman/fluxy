#!/bin/bash
# Fluxy Backend Deployment Script
# This script deploys your backend to the VDS server

# Configuration - UPDATE THESE VALUES
VDS_IP="87.121.103.236"
VDS_USER="root"
BACKEND_DIR="/var/www/fluxy-backend"
DOMAIN="87.121.103.236"  # Will be updated with domain later

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Deploying Fluxy Backend to VDS${NC}"
echo "===================================="

# Check if we can connect to VDS
echo -e "${YELLOW}📡 Testing SSH connection...${NC}"
if ! ssh -o ConnectTimeout=5 $VDS_USER@$VDS_IP "echo '✅ SSH connection successful'"; then
    echo -e "${RED}❌ Cannot connect to VDS. Please check:${NC}"
    echo "  - VDS IP address: $VDS_IP"
    echo "  - SSH access"
    echo "  - Firewall settings"
    exit 1
fi

# Create backup of current deployment
echo -e "${YELLOW}💾 Creating backup...${NC}"
ssh $VDS_USER@$VDS_IP "cd $BACKEND_DIR && tar -czf backup-\$(date +%Y%m%d-%H%M%S).tar.gz --exclude=node_modules --exclude=uploads . 2>/dev/null || echo 'No previous deployment to backup'"

# Sync backend files (excluding node_modules, .git, etc.)
echo -e "${YELLOW}📤 Uploading backend files...${NC}"
rsync -avz --progress \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='.env' \
    --exclude='uploads' \
    --exclude='logs' \
    --exclude='*.log' \
    --exclude='backup-*' \
    ./ $VDS_USER@$VDS_IP:$BACKEND_DIR/

# Install dependencies and restart
echo -e "${YELLOW}📦 Installing dependencies on VDS...${NC}"
ssh $VDS_USER@$VDS_IP << 'ENDSSH'
cd /var/www/fluxy-backend

# Install/update dependencies
npm install --production

# Create necessary directories
mkdir -p uploads logs

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# Start or restart the application
if pm2 list | grep -q "fluxy-backend"; then
    echo "Restarting application..."
    pm2 restart fluxy-backend
else
    echo "Starting application for the first time..."
    pm2 start ecosystem.config.js --env production
    pm2 save
fi

# Show status
pm2 status
pm2 logs fluxy-backend --lines 20

ENDSSH

echo ""
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "===================================="
echo -e "Backend URL: ${GREEN}https://$DOMAIN${NC}"
echo ""
echo "Useful commands:"
echo "  - View logs: ssh $VDS_USER@$VDS_IP 'pm2 logs fluxy-backend'"
echo "  - Check status: ssh $VDS_USER@$VDS_IP 'pm2 status'"
echo "  - Restart: ssh $VDS_USER@$VDS_IP 'pm2 restart fluxy-backend'"
echo ""
