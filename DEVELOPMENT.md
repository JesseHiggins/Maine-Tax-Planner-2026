# Development Workflow Guide

This document explains how the Maine 2026 Tax Planner was developed and how you can extend it using the same workflow.

## Development Environment

### GitHub Codespaces (Recommended)

[GitHub Codespaces](https://github.com/features/codespaces) provides a cloud-based VS Code environment pre-configured with Node.js, Git, and all development tools.

**Advantages:**
- ✅ No local installation needed
- ✅ Same environment for all developers
- ✅ Works from any browser or VS Code
- ✅ Built-in terminal
- ✅ Pre-installed Node.js and npm
- ✅ Integrated Git support

**Getting Started:**
1. Go to [github.com/JesseHiggins/Maine-Tax-Planner-2026](https://github.com/JesseHiggins/Maine-Tax-Planner-2026)
2. Click Code → Codespaces → Create codespace on main
3. Wait 1-2 minutes for environment setup
4. Run: `npm install && npm run dev`
5. Click "Open in Browser" on port 5173

**Cost:** Free tier = 120 hours/month per user

### Local Development

```bash
# Prerequisites: Node.js 18+, npm 9+, Git

git clone https://github.com/JesseHiggins/Maine-Tax-Planner-2026.git
cd Maine-Tax-Planner-2026
npm install
npm run dev
```

Runs on `http://localhost:5173` with hot reload.

## Build Pipeline

### 1. Development Phase (`npm run dev`)

```bash
npm run dev
```

**What happens:**
- Vite starts a local development server
- React component loads with hot reloading
- Changes to `/src` files instantly reload in browser
- Full source maps for debugging
- No minification (fast builds)
- Port 5173 (or next available)

**Workflow:**
1. Edit `src/App.jsx`
2. Save file
3. Browser refreshes automatically (~100ms)
4. Test changes immediately

### 2. Testing Phase

#### Manual Testing
- Test all calculations with known tax return examples
- Verify cross-browser (Chrome, Firefox, Safari)
- Test mobile responsiveness (DevTools responsive mode)
- Check console for errors (F12 → Console tab)

#### Build Verification
```bash
npm run build
# Checks for syntax errors
# Shows bundle size
# Creates optimized dist/ folder
```

#### Production Preview
```bash
npm run preview
# Runs production build locally
# Tests everything as it will be on Vercel
# Verify bundle size
```

### 3. Production Build Phase (`npm run build`)

```bash
npm run build
```

**What happens:**
1. **Transpilation**: JavaScript compiled for browser compatibility
2. **Bundling**: All modules combined into chunks
3. **Minification**: Code shrunk with Terser
4. **Removal**: Console/debugger statements stripped
5. **Hashing**: Asset filenames include content hash
6. **Output**: `/dist` folder ready for deployment

**Output:**
```
dist/
├── index.html           (HTML shell, ~1KB)
├── assets/
│   ├── react-vendor.js  (React library, ~12KB gzipped)
│   └── index.js         (App code, ~71KB gzipped)
└── ...
```

**Total bundle: ~232KB uncompressed, 71KB gzipped**

## Development with Claude AI

This project was developed with Claude (Anthropic) as a development partner. Here's the workflow:

### Collaborative Development Cycle

**1. Requirement Analysis**
- Describe the feature or fix needed in plain English
- Claude analyzes the request and suggests architecture
- Discuss trade-offs and approach

**2. Implementation**
- Claude generates code based on discussion
- You review and test in VS Code
- Iterate on refinements
- Test in browser via `npm run dev`

**3. Verification**
- Test against known tax examples
- Cross-reference IRS publications
- Verify responsive design
- Test on multiple browsers

**4. Integration**
- Merge changes into codebase
- Commit to Git with clear message
- Push to GitHub
- Vercel auto-deploys

### Example: Adding a Tax Calculation

```
You: "Add a calculation for the Maine Dependent Credit under 36 M.R.S. §5219-SS"

Claude: "I'll add a function that:
  1. Checks if dependent qualifies (age/relationship)
  2. Calculates credit amount ($150 max per dependent)
  3. Verifies income phase-out rules
  4. Integrates into the calc() function"

[Claude provides code]

You: "Review the code, test with examples:
  - Married filing jointly, 2 dependents = $300
  - Single, 1 dependent = $150"

Claude: "Code looks good. Verified against 36 M.R.S. §5219-SS (2026 guidance)"

You: Test in browser via npm run dev → Verify calculations → Commit → Push
```

## Git Workflow

### Standard Feature Development

```bash
# 1. Create feature branch
git checkout -b feature/tax-calculation-update

# 2. Make changes
# Edit src/App.jsx, test with npm run dev

# 3. Build and verify
npm run build

# 4. Commit changes
git add -A
git commit -m "feat: add Maine dependent credit

- Implements 36 M.R.S. §5219-SS
- $150 per qualifying dependent
- Income phase-out at $75k (MFJ)"

# 5. Push to GitHub
git push origin feature/tax-calculation-update

# 6. Create pull request (optional)
# Or push directly to main for auto-deploy:
# git push origin feature/your-feature:main
```

### Useful Git Commands

```bash
# Check status
git status

# View changes
git diff src/App.jsx

# Undo changes to a file
git checkout src/App.jsx

# Undo last commit (keep changes)
git reset --soft HEAD~1

# View commit history
git log --oneline

# Create a backup branch before major changes
git branch backup/my-backup
```

## Debugging Workflow

### Browser DevTools (F12)

1. **Console Tab**
   - Shows errors and warnings
   - Test functions: `calc()` directly
   - Log variables: `console.log(calculatedTax)`

2. **Sources Tab**
   - Set breakpoints (click line number)
   - Step through code
   - Inspect variables
   - Resume execution

3. **Network Tab**
   - Verify assets load
   - Check bundle size
   - Monitor load times

### VS Code Debugging

```javascript
// Add debugger statement in src/App.jsx
debugger;

// Then in VS Code:
// 1. Open Run & Debug (Ctrl+Shift+D)
// 2. Click "Create a launch.json file"
// 3. Select Node.js
// 4. Run dev server and click debug button
```

### Console Testing

With `npm run dev` running, test calculations directly:

```javascript
// Open browser console (F12)
// These variables are in scope:

calc()                    // Run full calculation
calculatedTax            // Get current tax amount
ptax(50000, 'single')    // Test Maine tax function
calcEitc()               // Test EITC calculation
```

## Performance Monitoring

### Build Time
```bash
npm run build
# Shows build time and file size
# Current target: < 5 seconds, < 100KB gzipped
```

### Bundle Analysis
```bash
# Check bundle composition
npx vite-bundle-visualizer

# Or estimate manually after build:
npm run build | grep gzip
```

### Runtime Performance
1. Open DevTools → Performance tab
2. Click Record button
3. Interact with app (enter income, change values)
4. Stop recording
5. Analyze frame rate and function calls

**Target: 60 FPS, calculations < 50ms**

## Deployment Workflow

### Local → GitHub → Vercel

```
┌─────────────────┐
│ Make changes    │
│ npm run dev     │  ← Test locally
└────────┬────────┘
         │
┌────────▼────────┐
│ npm run build   │  ← Verify production build
│ npm run preview │  ← Test production locally
└────────┬────────┘
         │
┌────────▼────────────────┐
│ git commit + git push   │  ← Commit to GitHub
└────────┬─────────────────┘
         │
┌────────▼──────────────────┐
│ Vercel detects push       │
│ Runs: npm run build       │
│ Deploys to production     │  ← Live!
│ Gets unique URL           │
└───────────────────────────┘
```

### Automatic Deployments

**Main branch → Production**
```bash
git push origin main
# Vercel automatically deploys to production
# https://maine-tax-planner.vercel.app
# Takes ~2-3 minutes
```

**Other branches → Preview**
```bash
git push origin feature/my-feature
# Vercel creates preview deployment
# Unique URL for testing before merge
```

## Continuous Improvement

### Regular Tasks

**Weekly:**
- Review tax law updates (IRS.gov, Maine DOR)
- Test with recent tax return examples
- Monitor Lighthouse scores

**Monthly:**
- Update dependencies: `npm update`
- Review performance metrics
- Plan new features

**Quarterly:**
- Major feature review
- User feedback analysis
- Architecture improvements

## File Organization

```
Maine-Tax-Planner-2026/
├── src/
│   ├── App.jsx              ← Main app (1,050 lines)
│   │   ├── Tax calculations
│   │   ├── React components
│   │   └── UI state management
│   └── main.jsx             ← React entry point
├── index.html               ← HTML shell
├── vite.config.js           ← Build configuration
├── vercel.json              ← Deployment configuration
├── package.json             ← Dependencies + scripts
├── README.md                ← Project overview
├── DEPLOYMENT.md            ← Vercel docs
├── DEVELOPMENT.md           ← This file
├── CONTRIBUTING.md          ← Contributing guide
├── .gitignore               ← What to exclude from git
├── .env.example             ← Environment variables
└── LICENSE                  ← GPL v3 license
```

## Key Decisions

### Why React?
- Component-based UI
- State management (useState)
- Hot reloading in development
- Active community and documentation

### Why Vite?
- 💨 Lightning-fast development server
- ⚡ Instant hot module replacement
- 📦 Optimized production builds
- 🎯 Minimal configuration needed

### Why Vercel?
- ✅ Zero-config deployment
- ① Auto-deploy on git push
- 🌍 Global CDN
- 🔒 Automatic HTTPS
- 💰 Free tier generous

### Why GitHub Codespaces?
- 🌐 No local setup needed
- 🚀 Ready in 2 minutes
- 🔄 Works on any device
- 💡 IDE parity with VS Code

### Why No External Tax Library?
- 📚 Full transparency on calculations
- 🛡️ No external dependencies
- ⚡ Fast, lightweight
- 🔍 Easy to audit and modify

## Useful Docs

- [README.md](./README.md) — Project overview
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Vercel deployment
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Contributing guide
- [Vite Docs](https://vitejs.dev) — Build tool
- [React Docs](https://react.dev) — UI framework
- [Vercel Docs](https://vercel.com/docs) — Deployment platform

## Tips & Tricks

### Speed Up Development

```bash
# Clear npm cache if build gets stuck
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules
npm install

# Use Codespaces for consistent environment
# (avoids "works on my machine" problems)
```

### Debug Tax Calculations

```javascript
// In src/App.jsx, add logging:
const calc = () => {
  // ... existing code ...
  console.log('Federal tax:', federalTax);
  console.log('Maine tax:', maineTax);
  console.log('EITC:', eitc);
  // ...
};

// Run npm run dev and check browser console (F12)
```

### Test Responsive Design

```bash
# DevTools responsive mode (F12)
# Key breakpoints to test:
# - 320px (small phone)
# - 480px (phone)
# - 768px (tablet)
# - 1024px (desktop)
# - 1440px (large desktop)
```

## Getting Help

1. **Check existing code**: Review `src/App.jsx` for patterns
2. **Read docs**: README, DEPLOYMENT, CONTRIBUTING
3. **Google it**: "Vite React" + your question
4. **Ask Claude**: Describe what you're trying to do
5. **Open GitHub Issue**: Document problem + steps to reproduce

---

**Happy developing!** 🚀

The project is set up to be collaborative and approachable. Don't hesitate to experiment, break things, and learn!
