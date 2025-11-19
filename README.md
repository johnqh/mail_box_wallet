# Identity Wallet - Browser Extension

A secure, identity-focused crypto wallet browser extension that supports signing operations for authentication and identity use cases.

## 🚀 Quick Start

### Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

3. **Load extension in browser**

   **Chrome/Edge/Brave:**
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `dist` folder from this project

   The extension will hot-reload when you make changes!

4. **Test with mock dApp**
   ```bash
   npm run mock-dapp
   ```
   - Open http://localhost:3000/mock-dapp.html in your browser
   - The mock dApp provides buttons to test all wallet features

### Testing

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Code Quality

```bash
# Type check
npm run type-check

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

## 📂 Project Structure

```
mail_box_wallet/
├── src/
│   ├── background/          # Background service worker
│   ├── content/             # Content script (bridge)
│   ├── inpage/              # Provider injection
│   ├── popup/               # React popup UI
│   │   ├── pages/           # Page components
│   │   │   └── Debug.tsx    # Debug panel
│   │   ├── components/      # Reusable components
│   │   └── App.tsx          # Main app
│   └── shared/              # Shared utilities
│       ├── logger/          # Debug logger
│       ├── types/           # TypeScript types
│       └── utils/           # Helper functions
├── tests/
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── e2e/                 # End-to-end tests
├── scripts/
│   └── mock-dapp.html       # Test page for provider
└── plans/
    └── WALLET.md            # Technical design doc
```

## 🧪 Testing the Extension

### 1. Open the Popup
- Click the extension icon in your browser toolbar
- You should see the Identity Wallet popup
- Click "Debug" button to access the debug panel

### 2. Test Debug Panel
- View logs in real-time
- Test background communication
- Clear storage
- Export logs

### 3. Test Provider Injection
- Start the mock dApp: `npm run mock-dapp`
- Open http://localhost:3000/mock-dapp.html
- The page should detect `window.ethereum`
- Try the various test buttons:
  - ✅ Connect wallet
  - ✅ Sign messages
  - ✅ Sign typed data
  - ❌ Send transaction (should be rejected)

## 🛠️ Development Tools

### Debug Logger

The project includes a comprehensive debug logger:

```typescript
import { logger, LogContext } from '@/shared/logger';

// Log with context
logger.info(LogContext.BACKGROUND, 'Message', { data: 'value' });
logger.warn(LogContext.POPUP, 'Warning');
logger.error(LogContext.CRYPTO, 'Error', error);

// Automatically filters sensitive data (passwords, keys, etc.)
```

### Debug Panel

Access via the "Debug" button in the popup:
- View all logs with filtering
- Test background communication
- Clear extension storage
- Export logs for debugging

### Hot Reload

The extension automatically reloads when you make changes to:
- Background scripts
- Content scripts
- Popup UI
- Manifest

Just save your file and the extension updates!

## 📋 Phase 1 Checklist

Phase 1: Development Setup ✅

- [x] Vite + React + TypeScript project initialized
- [x] Extension manifest (V3) configured
- [x] Background service worker running
- [x] Content script and inpage provider skeleton
- [x] Popup UI displaying
- [x] Debug logger implemented and tested
- [x] Debug panel UI created
- [x] Vitest configured with passing tests
- [x] Mock dApp page created
- [x] ESLint and Prettier configured
- [x] Hot reload working
- [x] Extension loads successfully

**Next Steps:**
- Phase 2: Cryptography & Vault implementation
- See `plans/WALLET.md` for complete implementation plan

## 🔍 Debugging Tips

### View Extension Console
- **Background Worker:** Chrome DevTools → Extensions → Service Worker → Inspect
- **Popup:** Right-click extension icon → Inspect popup
- **Content Script:** Open page DevTools → check console

### Common Issues

**Extension not loading:**
- Make sure you ran `npm run dev` first
- Check that you loaded the `dist` folder (not the root folder)
- Look for errors in the terminal output

**Hot reload not working:**
- Check that the dev server is running (`npm run dev`)
- Try reloading the extension manually in `chrome://extensions`

**Tests failing:**
- Make sure you ran `npm install` first
- Check for TypeScript errors: `npm run type-check`

## 📄 License

ISC

## 🤝 Contributing

This is currently in active development. See `plans/WALLET.md` for the technical design and roadmap.
