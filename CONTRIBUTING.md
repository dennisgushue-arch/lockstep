# Contributing to Lockstep

Thank you for your interest in contributing to Lockstep! We welcome bug reports, feature requests, documentation improvements, and code contributions.

## 🚀 Getting Started

### 1. Fork and Clone

```bash
git clone https://github.com/YOUR-USERNAME/lockstep.git
cd lockstep
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Start Development Server

```bash
pnpm dev
```

The app will start in mock mode at `http://localhost:5000`.

### 4. Create a Feature Branch

```bash
git checkout -b feature/my-feature
# or
git checkout -b fix/my-bug
```

## 📋 Development Standards

### Code Style

- **Language:** TypeScript (prefer types over `any`)
- **Formatter:** Prettier (auto-formats on save)
- **Linter:** ESLint
- **CSS:** Tailwind CSS (avoid inline styles)

### Before Committing

```bash
# Type check
pnpm check

# Format code
pnpm format  # (if available)

# Run tests (if available)
pnpm test
```

### Commit Messages

Follow conventional commit format::

``````
feat: add new commitment feature
fix: resolve authentication bug
docs: update README
refactor: simplify state management
``````


## 🧪 Testing

### Running Tests

```bash
pnpm test
```

### What to Test

- **New features** - Write tests for happy path and edge cases
- **Bug fixes** - Add a test that reproduces the bug
- **UI changes** - Manual testing in browser + screenshot in PR
- **API changes** - Test with Supabase Edge Functions

## 📚 Documentation

### Update docs when you:

- Add a new feature
- Change existing behavior
- Modify configuration steps
- Add new environment variables

**Files to consider updating:**

- `README.md` - Quick start, tech stack
- `DEPLOYMENT.md` - Deployment instructions
- `.env.example` - Environment variable template
- Feature-specific `.md` files (STRIPE_SETUP.md, etc.)

## 🔐 Security

### Reporting Security Vulnerabilities

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, email [security@lockstep.app](mailto:security@lockstep.app) with::
- Description of the vulnerability
- Affected components
- Potential impact
- Suggested fix (optional)

### Security Best Practices

- Never commit secrets, API keys, or credentials
- Use environment variables for sensitive data
- Validate user input on both client and server
- Keep dependencies updated
- Review OWASP top 10 vulnerabilities

## 🎯 Pull Request Process

1. **Create a feature branch** from `main`
2. **Make your changes** with clear commit messages
3. **Keep commits atomic** - one change = one commit
4. **Write/update tests** for new functionality
5. **Update documentation** if needed
6. **Create a PR** with description of changes
7. **Address review feedback** promptly
8. **Wait for approval** before merging

### PR Title Format

```
[TYPE] Short description

Examples:
[FEAT] Add voice note recording
[FIX] Fix authentication redirect
[DOCS] Update README deployment guide
```

## 📦 Project Structure

```bash
lockstep/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Route pages
│   │   ├── lib/              # Utilities, hooks, context
│   │   └── index.css         # Global styles
│   └── index.html
├── supabase/
│   └── functions/            # Edge Functions (Deno)
├── shared/                    # Shared types
├── DEPLOYMENT.md
├── STRIPE_SETUP.md
├── SUPABASE_AUTH_SETUP.md
└── README.md
```

## 🐛 Debugging Tips

### Local Testing with Supabase

```bashbash
# Copy .env.example to .env.local
cp client/.env.example client/.env.local

# Add your Supabase credentials
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-key-here

# Restart dev server
pnpm dev
```

### Browser Console

Check the browser console (F12) for:

- Console errors and warnings
- Network requests to API
- State/context values

### VS Code Extensions

Recommended extensions:
- **ESLint** - Code quality linting
- **Prettier** - Code formatter
- **Tailwind CSS IntelliSense** - Styling assistance
- **Thunder Client** - API testing

## 📝 Common Tasks

### Adding a New Page

1. Create `client/src/pages/my-page.tsx`
2. Add route to `client/src/App.tsx`
3. Link from navigation in `client/src/components/layout.tsx`

### Adding a New API Endpoint

1. Create `supabase/functions/my-function/index.ts`
2. Deploy: `supabase functions deploy my-function`
3. Call from client with Supabase client

### Adding Environment Variables

1. Add to `.env.example` with placeholder
2. Add to `client/.env.local` with actual value
3. Reference as `import.meta.env.VITE_YOUR_VAR`

## 🤝 Code Review

When reviewing PRs, focus on:
- **Correctness** - Does the code work as intended?
- **Readability** - Is the code easy to understand?
- **Performance** - Are there obvious optimizations?
- **Security** - Are secrets/inputs validated?
- **Tests** - Are critical paths tested?

## 📞 Getting Help

- **Questions?** Open an issue with [QUESTION] tag
- **Bug?** Check existing issues first, then report
- **Unsure?** Comment before starting large changes

## 📄 License

By contributing, you agree that your contributions are licensed under the MIT License.

---

**Thank you for contributing to Lockstep! 🙌**

