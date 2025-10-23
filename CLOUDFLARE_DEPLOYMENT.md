# Cloudflare Pages Deployment Guide

## Prerequisites
- Domain added to Cloudflare
- VDS server with backend running
- GitHub repository connected

---

## Step 1: Add Domain to Cloudflare

1. Go to https://dash.cloudflare.com
2. Click "Add Site"
3. Enter your domain name
4. Choose Free plan
5. Update nameservers at your domain registrar

**Nameservers will be:**
```
xxx.ns.cloudflare.com
yyy.ns.cloudflare.com
```

Wait for DNS propagation (5-30 minutes)

---

## Step 2: Setup DNS Records

In Cloudflare DNS settings:

### A Record (Backend API)
```
Type: A
Name: api
IPv4: 87.121.103.236
Proxy: OFF (DNS only - gray cloud)
```

### CNAME Record (Frontend)
```
Type: CNAME
Name: @ (or app if you want app.domain.com)
Target: <your-project>.pages.dev
Proxy: ON (orange cloud)
```

---

## Step 3: Deploy Frontend to Cloudflare Pages

1. Go to https://dash.cloudflare.com
2. Navigate to **Pages**
3. Click **Create a project**
4. Connect to GitHub
5. Select `fluxy` repository

**Build Settings:**
```
Framework preset: Create React App
Build command: npm run build
Build output directory: build
Root directory: frontend
```

**Environment Variables:**
```
NODE_VERSION=20
NODE_OPTIONS=--max-old-space-size=4096
GENERATE_SOURCEMAP=false
CI=false
DISABLE_ESLINT_PLUGIN=true
REACT_APP_API_URL=https://api.fluxy.com.tr
REACT_APP_SOCKET_URL=https://api.fluxy.com.tr
REACT_APP_FRONTEND_URL=https://fluxy.com.tr
```

6. Click **Save and Deploy**

---

## Step 4: Setup Backend SSL with Let's Encrypt

SSH into your VDS:

```bash
# Install Certbot
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot certonly --standalone -d api.fluxy.com.tr

# Certificate will be at:
# /etc/letsencrypt/live/api.fluxy.com.tr/fullchain.pem
# /etc/letsencrypt/live/api.fluxy.com.tr/privkey.pem
```

---

## Step 5: Configure Nginx as Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/fluxy-backend
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name api.fluxy.com.tr;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.fluxy.com.tr;

    ssl_certificate /etc/letsencrypt/live/api.fluxy.com.tr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.fluxy.com.tr/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Headers
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for WebSocket
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

**Save:** Ctrl+O, Enter, Ctrl+X

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/fluxy-backend /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Setup auto-renewal
sudo certbot renew --dry-run
```

---

## Step 6: Update Backend CORS

SSH into VDS:

```bash
cd /var/www/fluxy/backend
nano .env
```

Update:
```env
FRONTEND_URL=https://fluxy.com.tr
ALLOWED_ORIGINS=https://fluxy.com.tr,https://api.fluxy.com.tr
```

Restart backend:
```bash
pm2 restart fluxy-backend
```

---

## Step 7: Verify Deployment

1. **Frontend**: Open https://fluxy.com.tr
2. **Backend API**: Open https://api.fluxy.com.tr (should show API info)
3. **WebSocket**: Check browser console for successful connection
4. **SSL**: Check padlock icon in browser

---

## Troubleshooting

### DNS Not Resolving
```bash
# Check DNS propagation
nslookup api.fluxy.com.tr
dig api.fluxy.com.tr
```

### SSL Certificate Error
```bash
# Stop Nginx temporarily
sudo systemctl stop nginx

# Retry certificate
sudo certbot certonly --standalone -d api.fluxy.com.tr

# Start Nginx
sudo systemctl start nginx
```

### WebSocket Not Connecting
```bash
# Check backend logs
pm2 logs fluxy-backend

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### CORS Errors
- Verify `FRONTEND_URL` in backend `.env`
- Check Cloudflare proxy settings (API should be DNS only)
- Restart backend: `pm2 restart fluxy-backend`

---

## Success Checklist

- ✅ Domain added to Cloudflare
- ✅ DNS records configured
- ✅ Frontend deployed to Cloudflare Pages
- ✅ SSL certificate installed on backend
- ✅ Nginx reverse proxy configured
- ✅ Backend CORS updated
- ✅ WebSocket connecting
- ✅ Registration/Login working
- ✅ Voice chat working

---

## Notes

- **No tunnel needed!** Direct HTTPS connection
- **WebSocket works natively**
- **SSL auto-renews** (Let's Encrypt)
- **Fast CDN** via Cloudflare
- **Free hosting** for frontend

**Your app is now production-ready!** 🚀
