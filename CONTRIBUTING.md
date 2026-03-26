# Contributing to Maine Tax Planner

Thank you for your interest in contributing! This document explains how to extend and improve the Maine 2026 Tax Planner.

## Development Setup

### Quick Start (GitHub Codespaces Recommended)

```bash
# 1. Open in Codespaces from GitHub (or clone locally)
git clone https://github.com/JesseHiggins/Maine-Tax-Planner-2026.git
cd Maine-Tax-Planner-2026

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
# Opens http://localhost:5173
```

### Local Development with Git

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Make changes and test
npm run dev

# Build and verify
npm run build

# Commit with clear messages
git commit -m "feat: add new tax calculation" -m "Description of changes"

# Push and create pull request
git push origin feature/your-feature-name
```

## Project Structure

### Main Application

**[src/App.jsx](src/App.jsx)** (~1,050 lines)
- All tax calculation logic (pure JavaScript)
- React UI components (Card, Field, Toggle, KPI, HBar, Num)
- React state management (useState for inputs, tabs)
- All 2026 tax calculations for federal and Maine taxes

### Tax Calculations

Key functions in `src/App.jsx`:
- `ptax(income, status)` — Maine state income tax
- `calc()` — Master calculation engine
- `calcEitc()` — Federal Earned Income Tax Credit
- `calcCDCTC()` — Child and Dependent Care Credit
- `stfcCalc()` — Maine Dependent Credit

All calculations are based on:
- IRS Rev. Proc. 2025-32 (tax tables)
- IRS Notice 2025-67 (credits)
- OBBBA §§ 70101–70412 (Maine provisions)
- Maine Revenue Services 2026 guidance

### Configuration Files

- **[vite.config.js](vite.config.js)** — Vite build tool configuration
- **[vercel.json](vercel.json)** — Vercel deployment configuration
- **[index.html](index.html)** — HTML shell with meta tags

## Making Changes

### Bug Fixes

1. Create a branch: `git checkout -b fix/description`
2. Make changes in `src/App.jsx`
3. Test with `npm run dev`
4. Verify build works: `npm run build`
5. Commit: `git commit -m "fix: description"`

### Adding Tax Calculations

If you need to add a new tax calculation:

1. Research the 2026 tax rules and create the function
2. Base it on IRS or Maine Revenue Services guidance
3. Add the calculation function to `src/App.jsx`
4. Integrate into the `calc()` master function
5. Test with known tax return examples
6. Document the source (IRS section, statute number, etc.)

### Adding UI Features

If you want to add new UI elements:

1. Edit `src/App.jsx` in the JSX section
2. Follow the existing component patterns (Card, Field, Toggle, etc.)
3. Use inline styles (CSS-in-JS) matching the current pattern
4. Test responsive design:
   ```bash
   npm run dev
   # Test on mobile (F12 → responsive mode)
   ```
5. Use existing CSS media queries for responsive breakpoints

### Code Style

- **JavaScript**: ES2020+, no TypeScript (not configured)
- **React**: Functional components with hooks only
- **CSS**: Inline styles (no external CSS files)
- **Comments**: Add comments for complex tax logic

Example pattern:
```javascript
// Calculate Maryland Earned Income Tax Credit (hypothetical)
const calcMEITC = () => {
  // Based on 2026 EITC table, 36 M.R.S. § 5219
  // Maximum credit $3,995 for MFJ filer
  const rate = status === 'mfj' ? 0.205 : 0.198;
  return Math.min(income * rate, 3995);
};
```

## Testing Your Changes

### Development Testing

```bash
npm run dev
# Open http://localhost:5173
# Test all features manually
```

### Production Build Testing

```bash
npm run build
npm run preview
# Should function identically to dev build
# Bundle should be <100KB gzipped
```

### Mobile Testing

1. In DevTools (F12), enable responsive design mode
2. Test at breakpoints: 480px, 768px, 1024px
3. Test on actual mobile device if possible
4. Test Safari specifically (use BrowserStack or actual iOS device if available)

### Verification Checklist

- ✅ Feature works as expected
- ✅ No console errors or warnings
- ✅ Mobile responsive (all screen sizes)
- ✅ Build succeeds: `npm run build`
- ✅ No syntax errors after changes

## Tax Calculation Verification

Before committing tax calculation changes:

1. **Reference the IRS Publication**: Link to specific IRS Rev. Proc., Notice, or statute
2. **Test with known values**: Use published examples or calculate by hand
3. **Cross-check**: Compare against official tax software (TurboTax, etc.) for 2026
4. **Document sources**: Add comments with statute/section numbers

## Version Control Workflow

### Commit Message Format

```
<type>: <description>

<optional body explaining why>

Fixes #123 (if fixing an issue)
```

Types:
- `feat:` — New feature or calculation
- `fix:` — Bug fix
- `docs:` — Documentation changes
- `refactor:` — Code restructuring (no feature change)
- `perf:` — Performance improvement
- `test:` — Test additions

### Example Commits

```bash
# Adding a new calculation
git commit -m "feat: add Maine dependent credit calculation
- Implements 36 M.R.S. §5219-SS
- Supports dependent age verification
- Maximum \$150 per dependent"

# Fixing a bug
git commit -m "fix: correct EITC phase-out calculation
- EITC was incorrectly calculating for incomes > \$50k
- Fixes #42"

# Documentation
git commit -m "docs: add CONTRIBUTING guide"
```

## Deployment

Once your changes are complete:

1. **Push to GitHub**:
   ```bash
   git push origin feature/your-feature
   ```

2. **Create a Pull Request** (optional):
   - Go to GitHub repository
   - PR description should explain what changed and why
   - Reference any issues: "Fixes #123"

3. **Automatic Deployment**:
   - Push to `main` branch → Vercel auto-deploys to production
   - Push to other branch → Vercel creates preview deployment
   - All deployments to https://maine-tax-planner.vercel.app (or custom domain)

## Performance Considerations

- Keep bundle size under 100KB gzipped
- Don't add new npm dependencies without discussion (currently using React + Vite only)
- Test on slower network connections
- Monitor bundle size: `npm run build` shows final size

## Accessibility

- Use semantic HTML elements
- Ensure all form fields have labels
- Test keyboard navigation (Tab, Enter, Escape)
- Use sufficient color contrast
- Support screen readers (alt text, ARIA labels where needed)

## Browser Support

Minimum support:
- Chrome/Edge latest
- Firefox latest
- Safari 14+ (iOS and macOS)
- Mobile browsers (iOS Safari, Android Chrome)

Don't use features only supported in newer browsers without fallbacks.

## Questions?

- Check [README.md](./README.md) for project overview
- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment details
- Review existing code in [src/App.jsx](src/App.jsx) for patterns
- Open a GitHub Issue to discuss major changes before starting

## Code of Conduct

- Be respectful and inclusive
- Welcome feedback and suggestions
- Help others learn and grow
- Focus on the code, not the person

## License

By contributing, you agree your changes are licensed under the same license as the project (see [LICENSE](./LICENSE)).

---

**Happy contributing!** 🎉

For questions or to propose major changes, please open an issue on GitHub first to discuss.
