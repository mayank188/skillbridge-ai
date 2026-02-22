# SkillBridge AI - Deployment Guide

## Production Deployment Checklist

### Prerequisites
- Node.js 18+ installed
- MongoDB Atlas account with production cluster
- OpenAI API account with available credits
- Domain name (optional but recommended)
- SSL certificate (for HTTPS)

## Local Setup for Testing

1. **Install dependencies**
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

2. **Configure .env**
   ```bash
   # Copy from .env or .env.example
   # Update with your production values:
   # - MONGODB_URI: Your MongoDB Atlas connection string
   # - JWT_SECRET: Strong random string (min 32 chars)
   # - OPENAI_API_KEY: Your OpenAI API key
   ```

3. **Build frontend**
   ```bash
   cd client
   npm run build
   # Creates optimized production build in client/dist
   cd ..
   ```

4. **Start backend**
   ```bash
   NODE_ENV=production npm start
   # Or with nodemon for development:
   npm run dev
   ```

## Deployment Platforms

### Option 1: Heroku Deployment

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   heroku login
   ```

2. **Create app**
   ```bash
   heroku create skillbridge-ai
   ```

3. **Set environment variables**
   ```bash
   heroku config:set MONGODB_URI=your_mongodb_uri
   heroku config:set JWT_SECRET=your_jwt_secret
   heroku config:set OPENAI_API_KEY=your_openai_key
   heroku config:set NODE_ENV=production
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

### Option 2: Railway Deployment

1. **Connect GitHub repository**
   - Go to railway.app
   - Create new project
   - Connect GitHub repo

2. **Configure variables**
   - Set all environment variables in Railway dashboard

3. **Deploy**
   - Automatic deployment on push to main

### Option 3: Render Deployment

1. **Create Web Service**
   - Connect GitHub repository
   - Select Node as environment
   - Set build command: `npm install && cd client && npm run build && cd ..`
   - Set start command: `npm start`

2. **Add environment variables**
   - MONGODB_URI
   - JWT_SECRET
   - OPENAI_API_KEY
   - NODE_ENV=production

### Option 4: AWS EC2 Deployment

1. **Launch EC2 instance**
   - Ubuntu 20.04 LTS
   - t2.small or larger
   - Configure security groups (allow 80, 443, 5000)

2. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Clone repository**
   ```bash
   git clone your-repo
   cd hackathon
   npm install && cd client && npm install && cd ..
   ```

4. **Setup environment**
   ```bash
   # Create .env with production values
   nano .env
   ```

5. **Build frontend**
   ```bash
   cd client && npm run build && cd ..
   ```

6. **Install PM2**
   ```bash
   sudo npm install -g pm2
   pm2 start server.js --name "skillbridge"
   pm2 startup
   pm2 save
   ```

7. **Setup Nginx reverse proxy**
   ```bash
   sudo apt-get install nginx
   # Configure nginx to proxy http://localhost:5000
   ```

## Production Environment Variables

```env
# Server
NODE_ENV=production
PORT=5000

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/skillbridge?retryWrites=true&w=majority

# Security
JWT_SECRET=generate_with: $(openssl rand -base64 32)
JWT_EXPIRE=7d

# OpenAI
OPENAI_API_KEY=sk-...

# Frontend
CORS_ORIGIN=https://your-domain.com

# Optional: CDN
# CLOUDINARY_NAME=...
# CLOUDINARY_API_KEY=...
```

## Frontend Deployment

### Option 1: Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from client directory
cd client
vercel
```

### Option 2: Netlify
```bash
# Build
npm run build

# Deploy dist folder to Netlify
# Or connect GitHub repo for automatic deployment
```

### Option 3: GitHub Pages
```bash
# Update vite.config.js base path
# Push to gh-pages branch
npm run build
npm install gh-pages
```

## MongoDB Atlas Setup

1. **Create cluster**
   - Choose shared cluster for development
   - Choose dedicated cluster for production

2. **Network Access**
   - Add IP address of your server
   - For production: Use VPC peering or IP whitelist

3. **Database Access**
   - Create database user
   - Use strong password
   - Enable password authentication

4. **Connection String**
   - Use SRV connection string
   - Copy to MONGODB_URI

## SSL/HTTPS Setup

### Using Let's Encrypt (Nginx)
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d your-domain.com
# Configure Nginx to use certificate
```

### Using CloudFlare
1. Add domain to CloudFlare
2. Enable Universal SSL
3. Set SSL mode to "Full (strict)"

## Performance Optimization

### Frontend
- Enable gzip compression
- Optimize images
- Code splitting with React.lazy
- Use CDN for static assets

### Backend
- Enable HTTP/2
- Implement caching (Redis)
- Database query optimization
- Connection pooling

### Database
- Create indexes on frequently queried fields
- Implement data archiving
- Regular backups

## Monitoring & Logging

### Application Monitoring
-install New Relic, DataDog, or Scout
- Monitor error rates
- Track response times
- CPU and memory usage

### Error Tracking
- Sentry for JavaScript errors
- LogRocket for session replay
- Custom logging to files

### Health Checks
```bash
# Monitor endpoint
curl https://your-domain.com/health

# Expected response:
# {"status":"ok","mongodb":"connected","uptime":123.45}
```

## Backup Strategy

1. **Database Backups**
   - MongoDB Atlas: Enable automated backups
   - Use point-in-time recovery

2. **Code Backups**
   - GitHub as primary repository
   - Regular branch backups

3. **Configuration Backups**
   - Export environment variables
   - Document deployment settings

## Security Hardening

1. **Dependencies**
   ```bash
   # Regular security audits
   npm audit
   npm update
   ```

2. **Rate Limiting**
   - Implemented in Express
   - Adjust based on traffic

3. **CORS**
   - Only allow trusted origins
   - In production: Set specific domain

4. **HTTPS**
   - Force redirect HTTP → HTTPS
   - Use secure cookies

5. **Headers**
   - Helmet.js enabled
   - X-Frame-Options: DENY
   - Content-Security-Policy configured

## Maintenance

### Regular Tasks
- Monitor error logs
- Update dependencies monthly
- Review analytics
- Test disaster recovery

### Updates& Patches
- Apply security patches immediately
- Test updates in staging environment
- Plan deployment windows

### Database Maintenance
- Analyze slow queries
- Optimize indexes
- Clean up old data
- Verify backups

## Troubleshooting Production Issues

### Application Crashes
1. Check error logs
2. Review recent changes
3. Monitor resource usage
4. Restart with `pm2 restart skillbridge`

### Database Connection Issues
1. Verify MONGODB_URI
2. Check IP whitelist
3. Confirm network connectivity
4. Review MongoDB Atlas logs

### Performance Degradation
1. Check database query performance
2. Monitor server resources
3. Review slow request logs
4. Check for memory leaks

### SSL Certificate Issues
```bash
# Renew Let's Encrypt certificate
sudo certbot renew --dry-run
sudo certbot renew
```

## Scaling Strategy

### Horizontal Scaling
- Load balancer (Nginx, HAProxy)
- Multiple Node.js instances
- Sticky sessions for user persistence

### Vertical Scaling
- Upgrade server specifications
- Increase database capacity
- Optimize existing resources

### Database Scaling
- MongoDB sharding
- Read replicas
- Connection pooling

## Support & Documentation

- Keep detailed deployment notes
- Document custom configurations
- Maintain runbooks for common issues
- Set up monitoring alerts

---

For production deployments, follow security best practices and test thoroughly before going live.
