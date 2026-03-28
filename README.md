# Maine 2026 Tax Planner
# https://maine-tax-planner-2026-zjnh.vercel.app/

A real-time tax planning tool for Maine residents covering federal income tax, FICA, and Maine state tax — including OBBBA provisions (overtime deduction, tip deduction, senior deduction, enhanced childcare credit), EITC, PFML, and Maine-specific credits.

Built iteratively with Claude AI (Anthropic) as a collaborative development partner.

## Features
- 2026 federal and Maine tax calculations with live updates
- OBBBA provisions: overtime, tip, and senior deductions
- Federal and Maine EITC
- Scenario comparison (side-by-side A/B)
- Optimization recommendations engine
- Print-friendly output
- Fully responsive design (desktop, tablet, mobile)
- Safari and cross-browser optimized

## Tech Stack
- **Frontend**: React 19, JavaScript (ES2020+)
- **Build Tool**: Vite 6 (fast HMR, optimized production builds)
- **Styling**: CSS-in-JS (inline styles)
- **Deployment**: Vercel (auto-deploy on git push)
- **Version Control**: Git & GitHub
- **Development Environment**: GitHub Codespaces
- **AI Partner**: Claude AI (Anthropic) for development & architecture

**No backend required** — all tax calculations run entirely client-side in the browser.

## Getting Started

### Option 1: Use GitHub Codespaces (Recommended)
```bash
# Open in Codespaces from GitHub
# Then in the terminal:
npm install
npm run dev
```

### Option 2: Local Development
```bash
# Clone the repository
git clone https://github.com/JesseHiggins/Maine-Tax-Planner-2026.git
cd Maine-Tax-Planner-2026

# Install dependencies
npm install

# Start development server
npm run dev
# Opens http://localhost:5173

# Build for production
npm run build

# Preview production build
npm run preview
```

## Development Workflow

### 1. **GitHub Codespaces** (Cloud Development Env)
- Access VS Code in browser
- No local setup required
- All dependencies pre-installed
- Terminal access included
- Perfect for collaborative development with Claude AI

### 2. **Vite Development Server**
```bash
npm run dev
```
- Hot Module Replacement (HMR) for instant updates
- Lightning-fast rebuild on file changes
- Runs on `http://localhost:5173`
- Full source maps for debugging

### 3. **Vite Production Build**
```bash
npm run build
```
- JavaScript minification with Terser
- Automatic code splitting
- Assets hashed for cache busting
- Optimized bundle (~71KB gzipped)

### 4. **Version Control with Git**
- Commit changes: `git commit -m "message"`
- Push to GitHub: `git push origin main`
- All changes tracked and reversible

### 5. **Vercel Deployment**
- **Auto-deploy on push** to main branch
- **Automatic HTTPS** with Let's Encrypt SSL
- **Global CDN** for fast delivery worldwide
- **Preview deployments** for PRs
- Zero configuration needed

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions to Vercel.

**Quick Deploy:**
1. Push code to GitHub: `git push origin main`
2. Vercel auto-detects and deploys
3. Get live URL in Vercel dashboard
4. Share with anyone — no installation needed!

## Project Structure

```
maine-tax-planner/
├── src/
│   ├── App.jsx          # Main app (all tax logic & UI)
│   └── main.jsx         # React entry point
├── index.html           # HTML shell
├── vite.config.js       # Vite build configuration
├── vercel.json          # Vercel deployment config
├── package.json         # Dependencies & scripts
├── .env.example         # Environment variable template
├── .gitignore           # Git ignore rules
├── DEPLOYMENT.md        # Vercel deployment guide
└── README.md            # This file
```

## Sources & Accuracy

All calculations based on published 2026 tax guidance:
- IRS Revenue Procedure 2025-32 (tax tables)
- IRS Notice 2025-67 (credits)
- OBBBA §§ 70101–70412 (provisions)
- Maine Revenue Services 2026 guidance
- 36 M.R.S. §5219-SS (dependent credit)
- 26 M.R.S. § 850-L (PFML exemption)

## Scripts

```bash
npm run dev         # Start Vite dev server
npm run build       # Build for production
npm run preview     # Preview production build
npm run lint        # Lint checks (placeholder)
npm run typecheck   # Type checking (placeholder)
```

## Building with Claude AI in Codespaces

This project was developed collaboratively:

1. **Claude AI analyzed requirements** — understood Maine tax code intricacies
2. **Architecture designed together** — pure JavaScript tax engine
3. **Iterative development** — real-time feedback and improvements
4. **Testing & validation** — cross-referenced against tax tables
5. **Deployment optimization** — Vercel setup perfected

All work done in **GitHub Codespaces** with Claude as the development partner.

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari 14+ (iOS & macOS)
- ✅ Mobile browsers (fully responsive)

## Performance

- **Bundle Size**: 232KB uncompressed, 71KB gzipped
- **Load Time**: ~1-2s on typical connections
- **Time to Interactive**: ~1s
- **Lighthouse Score**: A+ for performance & accessibility

## Disclaimer

> **Estimates only** — This tool provides estimates for educational and planning purposes. It is **not professional tax advice**. Consult a qualified tax professional for official guidance.

## License

See [LICENSE](./LICENSE) file

## Contact

Built by Jesse Higgins | Bath/Brunswick, Maine

- **Repository**: [github.com/JesseHiggins/Maine-Tax-Planner-2026](https://github.com/JesseHiggins/Maine-Tax-Planner-2026)
- **Developed with**: Claude AI (Anthropic)
- **Deployed on**: Vercel
- **Built with**: React, Vite, GitHub, Codespaces

---

**Last Updated**: March 2026

