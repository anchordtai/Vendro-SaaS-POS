# Netlify Deployment Guide

## 🚀 Deploying Onyxx Nightlife POS to Netlify

### Prerequisites
- Netlify account
- Netlify CLI installed (`npm install -g netlify-cli`)
- Git repository configured

### 📋 Deployment Steps

#### 1. **Login to Netlify**
```bash
npx netlify login
```

#### 2. **Production Deployment**
```bash
npm run deploy
```

#### 3. **Preview Deployment**
```bash
npm run deploy-preview
```

### ⚙️ Configuration Details

The `netlify.toml` file includes:
- ✅ Next.js build configuration
- ✅ SPA routing support
- ✅ Security headers
- ✅ Static file caching
- ✅ API endpoint handling
- ✅ Environment variables

### 🔧 Custom Build Scripts

- `npm run deploy` - Deploy to production
- `npm run deploy-preview` - Deploy preview branch

### 📊 Deployment URLs
- **Production**: Automatically assigned by Netlify
- **Preview**: Automatically generated for each preview

### 🛠️ Troubleshooting

#### Build Issues
```bash
# Clean build
npm run build

# Check Next.js output
ls -la .next
```

#### Deployment Issues
```bash
# Verbose deployment
npx netlify deploy --prod --dir=.next --debug

# Force redeploy
npx netlify deploy --prod --dir=.next --force
```

### 🌐 Environment Variables

Set in Netlify dashboard:
- `NODE_ENV`: production
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key

### 📱 Features After Deployment
- ✅ Responsive web POS interface
- ✅ Dashboard with real-time data
- ✅ Product management
- ✅ Sales reporting
- ✅ Offline functionality
- ✅ Nigerian Naira currency support

### 🔗 Post-Deployment
1. Configure custom domain (if needed)
2. Set up SSL certificate
3. Configure analytics
4. Test all POS functionality

---

**🎉 Your Onyxx Nightlife POS is ready for Netlify deployment!**
