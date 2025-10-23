#!/bin/bash
# Fluxy VDS Ubuntu 24.04 Setup Script
# Run this script on your VDS server as root

set -e

echo "🚀 Starting Fluxy Backend VDS Setup..."
echo "=================================="

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install essential tools
echo "🔧 Installing essential tools..."
apt install -y curl wget git build-essential software-properties-common ufw

# Install Node.js 20.x (LTS)
echo "📦 Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify Node.js installation
node -v
npm -v

# MongoDB Atlas kullanılıyor - Local MongoDB kurulumu atlanıyor
echo "📦 MongoDB Atlas (Cloud) kullanılacak - Local kurulum gerekmiyor"

# Install PM2 (Process Manager)
echo "📦 Installing PM2..."
npm install -g pm2

# Setup PM2 to start on boot
pm2 startup systemd -u root --hp /root
env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root

# Install Nginx
echo "📦 Installing Nginx..."
apt install -y nginx

# Configure firewall
echo "🔒 Configuring firewall..."
ufw --force enable
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 5000/tcp  # For direct access if needed
ufw status

# Install Certbot for SSL
echo "🔒 Installing Certbot for SSL..."
apt install -y certbot python3-certbot-nginx

# Create application directory
echo "📁 Creating application directory..."
mkdir -p /var/www/fluxy-backend
chown -R $USER:$USER /var/www/fluxy-backend

# Install fail2ban for security
echo "🔒 Installing fail2ban..."
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban

echo ""
echo "✅ VDS Setup Complete!"
echo "=================================="
echo "Next steps:"
echo "1. Clone your backend repository to /var/www/fluxy-backend"
echo "2. Create .env file with MongoDB Atlas connection string"
echo "3. Run 'npm install' in the backend directory"
echo "4. Start application with PM2"
echo ""
echo "⚠️  MongoDB Atlas Connection String gerekli!"
echo ""
