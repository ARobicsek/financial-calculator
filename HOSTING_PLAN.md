# Hosting Plan: Free & Easy Deployment Options

## Overview

This document provides step-by-step instructions for hosting your retirement calculator web app for **free** using modern, easy-to-use platforms. Since your app is a **static site** (vanilla JavaScript + Vite), it can be hosted on any static hosting service.

---

## Recommended Option: **Netlify** (Easiest)

### Why Netlify?

✅ **Completely free** for personal projects
✅ **Automatic builds** from GitHub
✅ **Custom domain** support (free SSL)
✅ **Instant rollbacks** if something breaks
✅ **No credit card** required
✅ **Continuous deployment** (auto-updates when you push to GitHub)

### Step-by-Step Deployment

#### Step 1: Prepare Your Repository

Your app is already in Git. Push it to GitHub:

```bash
# If you haven't already created a GitHub repo:
# 1. Go to https://github.com/new
# 2. Create a new repository (e.g., "retirement-calculator")
# 3. DON'T initialize with README (you already have code)

# Then push your code:
git remote add origin https://github.com/YOUR_USERNAME/retirement-calculator.git
git branch -M main
git push -u origin main
```

#### Step 2: Sign Up for Netlify

1. Go to [https://www.netlify.com/](https://www.netlify.com/)
2. Click **"Sign up"**
3. Choose **"Sign up with GitHub"** (easiest - connects automatically)
4. Authorize Netlify to access your GitHub repositories

#### Step 3: Deploy Your Site

1. Once logged in, click **"Add new site"** → **"Import an existing project"**
2. Select **"Deploy with GitHub"**
3. Choose your repository: `retirement-calculator`
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - Leave other settings as default
5. Click **"Deploy site"**

#### Step 4: Your Site is Live!

Within 1-2 minutes, Netlify will:
- Install dependencies (`npm install`)
- Build your app (`npm run build`)
- Deploy the `dist` folder
- Give you a URL like: `https://random-name-12345.netlify.app`

#### Step 5: Custom Domain (Optional)

**Free Netlify Subdomain:**
1. Go to **Site settings** → **Domain management**
2. Click **"Edit site name"**
3. Change `random-name-12345` to something like `retirement-planner`
4. Your URL becomes: `https://retirement-planner.netlify.app`

**Your Own Domain ($10-15/year):**
1. Buy a domain (e.g., from [Namecheap](https://www.namecheap.com/) or [Google Domains](https://domains.google/))
2. In Netlify: **Domain management** → **"Add custom domain"**
3. Follow instructions to update DNS settings
4. Netlify provides **free SSL** (HTTPS) automatically

### Automatic Updates

Every time you push to GitHub:
```bash
git add .
git commit -m "Update calculator"
git push
```

Netlify automatically rebuilds and redeploys your site in ~1 minute.

---

## Alternative Option 1: **Vercel** (Also Excellent)

### Why Vercel?

✅ Free tier (similar to Netlify)
✅ Extremely fast global CDN
✅ Great performance analytics
✅ Automatic HTTPS

### Deployment Steps

1. Go to [https://vercel.com/](https://vercel.com/)
2. Sign up with GitHub
3. Click **"Add New Project"**
4. Select your `retirement-calculator` repository
5. Vercel auto-detects Vite settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Click **"Deploy"**
7. Your site is live at: `https://retirement-calculator.vercel.app`

### Custom Domain

Same process as Netlify - free SSL included.

---

## Alternative Option 2: **GitHub Pages** (Free, Simple)

### Why GitHub Pages?

✅ Free hosting on GitHub
✅ No extra account needed
✅ Direct integration with your repo
❌ Slightly more manual setup
❌ No automatic builds (need to push `dist` folder)

### Deployment Steps

#### Option A: Manual Deployment (Simpler)

1. Build your app locally:
   ```bash
   npm run build
   ```

2. Install GitHub Pages deployment tool:
   ```bash
   npm install -D gh-pages
   ```

3. Add deploy script to `package.json`:
   ```json
   "scripts": {
     "dev": "vite",
     "build": "vite build",
     "preview": "vite preview",
     "deploy": "npm run build && gh-pages -d dist"
   }
   ```

4. Update `vite.config.js` to set the base path:
   ```javascript
   import { defineConfig } from 'vite';

   export default defineConfig({
     root: '.',
     base: '/retirement-calculator/',  // Match your repo name
     build: {
       outDir: 'dist',
       emptyOutDir: true
     }
   });
   ```

5. Deploy:
   ```bash
   npm run deploy
   ```

6. Enable GitHub Pages:
   - Go to your repo on GitHub
   - **Settings** → **Pages**
   - Source: **Deploy from a branch**
   - Branch: **gh-pages** / (root)
   - Click **Save**

7. Your site is live at: `https://YOUR_USERNAME.github.io/retirement-calculator/`

#### Option B: GitHub Actions (Automatic)

1. Create `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches: [ main ]

   jobs:
     build-and-deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3

         - name: Setup Node
           uses: actions/setup-node@v3
           with:
             node-version: '18'

         - name: Install dependencies
           run: npm ci

         - name: Build
           run: npm run build

         - name: Deploy
           uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./dist
   ```

2. Update `vite.config.js` as in Option A

3. Push to GitHub - site auto-deploys on every push

---

## Alternative Option 3: **Cloudflare Pages** (Fast & Free)

### Why Cloudflare Pages?

✅ Free unlimited bandwidth
✅ Global CDN (very fast)
✅ Built-in analytics
✅ Great for high-traffic sites

### Deployment Steps

1. Go to [https://pages.cloudflare.com/](https://pages.cloudflare.com/)
2. Sign up (free account)
3. **Create a project** → **Connect to Git**
4. Authorize GitHub access
5. Select your repository
6. Configure build:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
7. Click **"Save and Deploy"**
8. Live at: `https://retirement-calculator.pages.dev`

---

## Comparison Table

| Platform | Free Tier | Custom Domain | Auto-Deploy | Build Time | SSL | Ease of Use |
|----------|-----------|---------------|-------------|------------|-----|-------------|
| **Netlify** | ✅ Unlimited | ✅ Yes | ✅ Yes | ~1 min | ✅ Free | ⭐⭐⭐⭐⭐ |
| **Vercel** | ✅ Unlimited | ✅ Yes | ✅ Yes | ~30 sec | ✅ Free | ⭐⭐⭐⭐⭐ |
| **GitHub Pages** | ✅ Unlimited | ✅ Yes | ⚠️ Manual* | ~1 min | ✅ Free | ⭐⭐⭐⭐ |
| **Cloudflare Pages** | ✅ Unlimited | ✅ Yes | ✅ Yes | ~1 min | ✅ Free | ⭐⭐⭐⭐ |

*GitHub Pages can have auto-deploy with GitHub Actions

---

## Recommended Setup: Netlify (Complete Guide)

### Full Walkthrough from Scratch

#### Prerequisites
- GitHub account
- Your code pushed to GitHub

#### Step 1: Push to GitHub (if not done yet)

```bash
# Navigate to your project
cd "C:\Users\ariro\OneDrive\Documents\Financial calculator"

# Check status
git status

# If you have uncommitted changes:
git add .
git commit -m "Prepare for deployment"

# Create GitHub repo at https://github.com/new
# Then:
git remote add origin https://github.com/YOUR_USERNAME/retirement-calculator.git
git push -u origin main
```

#### Step 2: Deploy to Netlify

1. **Go to**: [https://app.netlify.com/signup](https://app.netlify.com/signup)
2. Click **"GitHub"** to sign up with your GitHub account
3. Authorize Netlify (read access to your repos)
4. Click **"Add new site"** → **"Import an existing project"**
5. Click **"GitHub"** (may need to authorize again)
6. Find and select **"retirement-calculator"** repo
7. Build settings (auto-detected for Vite):
   ```
   Build command: npm run build
   Publish directory: dist
   ```
8. Click **"Deploy retirement-calculator"**

#### Step 3: Wait for Deployment

You'll see a build log:
```
Initializing...
Cloning repository...
Installing dependencies...
Building site...
Site is live!
```

Takes about 1-2 minutes.

#### Step 4: Access Your Site

You'll get a URL like:
```
https://inspiring-mcclintock-a1b2c3.netlify.app
```

Click the link to see your live app!

#### Step 5: Customize URL

1. Click **"Site settings"** (top navigation)
2. Under **"Site information"** → **"Site name"**
3. Click **"Change site name"**
4. Enter a custom name (e.g., `retirement-planner`)
5. URL becomes: `https://retirement-planner.netlify.app`

#### Step 6: Set Up Continuous Deployment (Automatic)

Already done! Every time you push to GitHub:

```bash
# Make changes to your code
# Then:
git add .
git commit -m "Update features"
git push
```

Netlify automatically detects the push and rebuilds your site.

---

## Environment-Specific Settings

### Update `vite.config.js` for Production

Your current config is fine, but you can add optimizations:

```javascript
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',  // Works for all platforms
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,  // Don't include source maps in production
    rollupOptions: {
      output: {
        manualChunks: {
          'chart': ['chart.js']  // Separate Chart.js for caching
        }
      }
    }
  },
  server: {
    port: 5173,
    open: true
  }
});
```

### Add `.gitignore` if not present

Create `.gitignore` file:
```
node_modules/
dist/
.DS_Store
*.log
.env
```

---

## Testing Before Deployment

### Local Production Build

Before deploying, test the production build locally:

```bash
# Build for production
npm run build

# Preview the production build
npm run preview
```

This opens a local server serving the `dist` folder (exactly what will be deployed).

Check:
- All features work
- No console errors
- Charts render correctly
- Calculations are accurate

---

## Post-Deployment Checklist

After deploying, verify:

- [ ] Site loads correctly
- [ ] All pages/sections work
- [ ] Risk questionnaire functions
- [ ] Monte Carlo simulations run
- [ ] Charts render properly
- [ ] Strategy cards selectable
- [ ] Results display correctly
- [ ] Mobile responsive (check on phone)
- [ ] No console errors (open DevTools)

### Mobile Testing

1. Open site on your phone
2. Or use Chrome DevTools:
   - Press F12
   - Click "Toggle device toolbar" (phone icon)
   - Test different screen sizes

---

## Custom Domain Setup (Optional)

### Buy a Domain

**Recommended Registrars:**
- [Namecheap](https://www.namecheap.com/) - ~$10/year
- [Google Domains](https://domains.google/) - ~$12/year
- [Cloudflare](https://www.cloudflare.com/products/registrar/) - At-cost pricing

**Good domain ideas:**
- `retirementplanner.app`
- `your-retirement-calc.com`
- `montecarlo-retirement.com`

### Connect to Netlify

1. In Netlify: **Domain management** → **"Add custom domain"**
2. Enter your domain (e.g., `retirementplanner.app`)
3. Netlify shows DNS settings to configure
4. In your domain registrar (Namecheap, etc.):
   - Find **DNS settings**
   - Add an **A record**: `@` → `75.2.60.5` (Netlify's IP)
   - Add **CNAME record**: `www` → `your-site.netlify.app`
5. Wait 5-60 minutes for DNS propagation
6. Netlify automatically provisions SSL (HTTPS)

Your site is now at `https://retirementplanner.app` 🎉

---

## Monitoring and Analytics

### Netlify Analytics (Optional - $9/month)

Provides:
- Page views
- Top pages
- Bandwidth usage
- No cookies/tracking (privacy-friendly)

### Free Alternative: Google Analytics

1. Get tracking ID from [Google Analytics](https://analytics.google.com/)
2. Add to `index.html` before `</head>`:
   ```html
   <!-- Google Analytics -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
   <script>
     window.dataLayer = window.dataLayer || [];
     function gtag(){dataLayer.push(arguments);}
     gtag('js', new Date());
     gtag('config', 'G-XXXXXXXXXX');
   </script>
   ```

---

## Troubleshooting

### Build Fails on Netlify

**Error: "Module not found"**
- Solution: Make sure all dependencies are in `package.json` (not just `devDependencies` for runtime deps)

**Error: "Build command failed"**
- Check build logs on Netlify
- Test locally: `npm run build`
- Ensure Node version compatibility

**Fix Node version on Netlify:**
Add to `package.json`:
```json
"engines": {
  "node": "18.x"
}
```

### Site Shows 404

- Check **Publish directory** is `dist` (not `build` or `/`)
- Verify build completed successfully

### Site Loads But Blank Page

- Check browser console for errors (F12)
- Verify `base` in `vite.config.js` is `'./'`
- Check that all asset paths are relative

---

## Cost Summary

### Completely Free Option

**Netlify Free Tier:**
- Hosting: $0
- SSL: $0
- Bandwidth: 100 GB/month (plenty for a personal project)
- Build minutes: 300/month (you'll use ~5/month)
- Sites: Unlimited

**Total: $0/month**

### With Custom Domain

- Domain registration: ~$10-15/year
- Hosting: $0 (Netlify free tier)

**Total: ~$10-15/year** (just the domain)

---

## Maintenance

### Updating Your Site

```bash
# Make changes to code
# Test locally:
npm run dev

# When ready:
git add .
git commit -m "Description of changes"
git push

# Netlify auto-deploys in ~1 minute
```

### Rollback if Something Breaks

Netlify keeps every deployment:
1. Go to **Deploys** tab
2. Find the last working version
3. Click **"Publish deploy"**
4. Instant rollback!

---

## Security Considerations

### Your App is Client-Side Only

✅ No backend = no server to hack
✅ No database = no data breaches
✅ No user accounts = no authentication vulnerabilities

### Best Practices

1. **Never commit API keys** (you don't have any, but good to know)
2. **Use HTTPS** (Netlify provides free)
3. **Keep dependencies updated**:
   ```bash
   npm outdated
   npm update
   ```

---

## Summary: Easiest Path to Hosting

1. **Push to GitHub**: `git push origin main`
2. **Sign up for Netlify**: [https://netlify.com](https://netlify.com) (use GitHub login)
3. **Import your repo**: Click "Add new site" → Select repo
4. **Deploy**: Netlify auto-configures and deploys
5. **Share your URL**: `https://your-site.netlify.app`

**Total time: ~10 minutes**

**Total cost: $0**

---

## Next Steps

### After Deployment

1. Share the link with friends/family for feedback
2. Test on different devices
3. Monitor usage (if you add analytics)
4. Iterate based on feedback

### Advanced: CI/CD Pipeline

If you want automated testing before deployment:

1. Add tests to your project
2. Create `.github/workflows/test.yml`:
   ```yaml
   name: Tests
   on: [push]
   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
         - run: npm ci
         - run: npm test
   ```

3. Only deploy if tests pass

---

## Recommended Hosting Choice

**For your retirement calculator, I recommend: Netlify**

**Why:**
1. ✅ Easiest setup (10 minutes)
2. ✅ Free forever for personal projects
3. ✅ Automatic deployments
4. ✅ Great performance
5. ✅ Easy rollbacks if needed
6. ✅ Custom domain support
7. ✅ Excellent documentation

**Alternative if you prefer:** Vercel (virtually identical, equally good)

**Budget option:** GitHub Pages (free, but slightly more manual)

---

## Final Checklist

Before going live:
- [ ] All features tested locally
- [ ] Code pushed to GitHub
- [ ] Netlify account created
- [ ] Site deployed successfully
- [ ] Custom domain configured (optional)
- [ ] Tested on mobile
- [ ] No console errors
- [ ] Shared with test users

🎉 **You're ready to host your retirement calculator!**

---

**Questions or Issues?**

If you run into problems:
1. Check Netlify build logs
2. Test build locally: `npm run build && npm run preview`
3. Search Netlify documentation: [docs.netlify.com](https://docs.netlify.com)
4. Netlify support forum: [answers.netlify.com](https://answers.netlify.com)
