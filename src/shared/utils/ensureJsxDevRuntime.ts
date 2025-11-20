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
