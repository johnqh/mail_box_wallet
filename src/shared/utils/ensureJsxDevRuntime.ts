/**
 * JSX Dev Runtime Shim for Browser Extension Context
 *
 * PROBLEM:
 * Vite production builds use react/jsx-runtime (production) but compiled code
 * expects jsxDEV from react/jsx-dev-runtime. In browser extensions, the
 * jsx-dev-runtime module isn't properly bundled by @crxjs/vite-plugin.
 *
 * SOLUTION:
 * Install Object.prototype setter that provides jsxDEV fallback before React loads.
 * Falls back to production jsx() function if jsxDEV unavailable.
 *
 * TRADE-OFFS:
 * - Loses React dev-mode features (enhanced errors, prop validation)
 * - Modifies Object.prototype (carefully with configurable: true)
 * - Necessary until Vite/crxjs properly bundles jsx-dev-runtime
 *
 * TODO: Monitor @crxjs/vite-plugin updates for proper jsx-dev-runtime bundling
 */

import { jsx } from 'react/jsx-runtime';

type JsxParams = Parameters<typeof jsx>;

const jsxDevFallback = (
  type: JsxParams[0],
  props: JsxParams[1],
  key?: JsxParams[2],
) => jsx(type, props, key);

const PATCH_SYMBOL = Symbol.for('mailbox.jsxDevPatched');

function installPrototypeShim() {
  const globalScope = globalThis as Record<string | symbol, unknown>;
  if (globalScope[PATCH_SYMBOL]) {
    return;
  }

  Object.defineProperty(Object.prototype, 'jsxDEV', {
    configurable: true,
    set(value) {
      Object.defineProperty(this, 'jsxDEV', {
        configurable: true,
        writable: true,
        value: typeof value === 'function' ? value : jsxDevFallback,
      });
    },
  });

  globalScope[PATCH_SYMBOL] = true;
}

export function ensureJsxDevRuntime() {
  installPrototypeShim();
}

ensureJsxDevRuntime();
