# Vercel Deployment Guide

## Overview

This document covers the deployment of the Maine 2026 Tax Planner to Vercel. The application is a static React Single Page Application (SPA) built with Vite.

## Deployment Steps

### 1. Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git repository initialized (already done)
- GitHub account with the repository pushed

### 2. Connect to Vercel

#### Option A: Using Vercel Dashboard (Recommended)

1. Visit [vercel.com](https://vercel.com)
2. Sign in with GitHub/GitLab/Bitbucket account
3. Click "Add New Project"
4. Select this repository (`Maine-Tax-Planner-2026`)
5. Vercel will auto-detect it's a Vite project
6. Click "Deploy"

#### Option B: Using Vercel CLI

```bash
npm install -g vercel
vercel
```

### 3. Build & Deploy Configuration

The `vercel.json` file is already configured with:

- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **SPA Rewrites**: All routes redirect to `index.html` for client-side routing
- **Cache Headers**: Assets in `/assets/` are cached for 1 year (immutable)
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection

### 4. Environment Variables

If needed, add environment variables in Vercel Dashboard:

1. Go to Project Settings → Environment Variables
2. Add any required variables (currently not needed for this app)
3. Variables are automatically used in production builds

Example `.env` variables:
```env
VITE_APP_ENV=production
VITE_API_BASE_URL=https://api.example.com  # if needed later
```

## File Structure

```
maine-tax-planner/
├── src/
│   ├── App.jsx          # Main component with tax calculation logic
│   └── main.jsx         # React entry point
├── index.html           # HTML entry point
├── vite.config.js       # Vite build configuration
├── vercel.json          # Vercel deployment config
├── package.json         # Project dependencies and scripts
├── .env.example         # Example environment variables
├── .gitignore           # Git ignore rules
├── README.md            # Project documentation
└── LICENSE              # License file
```

## Optimization Summary

### Build Optimizations
- ✅ Tree shaking enabled (Vite default)
- ✅ Code minification with Terser
- ✅ Console & debugger removal in production
- ✅ Manual chunk splitting for React vendor code
- ✅ Source maps disabled in production (faster builds)

### Deployment Optimizations
- ✅ Long-term caching for static assets
- ✅ Cache busting via Vite's automatic hashing
- ✅ Gzip compression (Vercel default)
- ✅ Brotli compression (Vercel default)
- ✅ Security headers configured
- ✅ SPA routing with rewrites configured

## Performance Considerations

1. **Bundle Size**: React + Vite = ~45KB (gzipped) - excellent for SPAs
2. **First Load**: ~1-2 seconds on typical connections
3. **Subsequent Loads**: ~200ms (cached assets)
4. **Time to Interactive**: ~1 second

## Monitoring & Debugging

### Vercel Dashboard
- Real-time logs: Project Settings → Deployments
- Function logs (if applicable)
- Analytics & performance metrics
- Environment variable validation

### Local Testing
```bash
# Build locally
npm run build

# Preview production build
npm run preview

# Development server
npm run dev
```

## Rollback & Redeployment

1. **Rollback**: Vercel automatically keeps production URLs. Visit Deployments tab and click "Promote" on a previous deployment
2. **Redeploy**: Push changes to main branch (or preferred branch) - Vercel auto-deploys
3. **Manual Deploy**: Click "Redeploy" in Deployments tab

## Troubleshooting

### Build Fails
- Check Node.js version: `node --version` (must be >= 18)
- Verify `npm run build` works locally
- Review Vercel build logs in dashboard

### 404 Errors on Route Changes
- ✅ Already fixed with `rewrites` in vercel.json
- All routes redirect to index.html for SPA routing

### Console Warnings
- Production code has console/debugger removed
- Development code may show warnings (normal)

### Slow Performance
- Check Vercel function duration (not applicable for static sites)
- Check Network tab in browser DevTools
- Review bundle size: `npm run build` will show final size

## Production Checklist

- ✅ `.gitignore` configured
- ✅ `vercel.json` configured
- ✅ Build command optimized
- ✅ Environment variables documented (`.env.example`)
- ✅ Security headers configured
- ✅ Cache headers optimized
- ✅ Node.js engines specified in package.json
- ✅ Production build tested locally

## Custom Domain Setup

1. In Vercel Dashboard → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. SSL automatically provisioned via Let's Encrypt

## Continuous Deployment

Vercel automatically deploys on:
- Push to main branch (production)
- Push to other branches (preview deployments)
- Pull requests (preview deployments for review)

## Next Steps for Enhancement

1. **Add Analytics**: Vercel Web Analytics or Google Analytics
2. **Add Form**: If user submissions needed, use Vercel Edge Functions or third-party service
3. **Add Testing**: Setup Jest + React Testing Library
4. **Add Linting**: Setup ESLint + Prettier
5. **Add Type Safety**: Consider TypeScript for future maintainability

## Support Resources

- [Vite Documentation](https://vitejs.dev)
- [Vercel Documentation](https://vercel.com/docs)
- [React Documentation](https://react.dev)
- [Vercel CLI Reference](https://vercel.com/docs/cli)

---

**Deployment Date**: Ready for production  
**Last Updated**: March 2026

