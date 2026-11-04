// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { ThemeEngine } from '../../src/datagrid/theme/ThemeEngine';
import { appleLight } from '../../src/datagrid/theme/presets/appleLight';
import { appleDark } from '../../src/datagrid/theme/presets/appleDark';
import { googleLight } from '../../src/datagrid/theme/presets/googleLight';
import { googleDark } from '../../src/datagrid/theme/presets/googleDark';
import { IGridThemeTokens } from '../../src/datagrid/theme/IGridTheme';

describe('ThemeEngine', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Preset Resolution', () => {
    it('should resolve built-in themes by preset name', () => {
      expect(ThemeEngine.resolve('apple-light')).toBe(appleLight);
      expect(ThemeEngine.resolve('apple-dark')).toBe(appleDark);
      expect(ThemeEngine.resolve('google-light')).toBe(googleLight);
      expect(ThemeEngine.resolve('google-dark')).toBe(googleDark);
    });

    it('should fallback to appleLight for unknown preset string', () => {
      expect(ThemeEngine.resolve('non-existent-theme' as any)).toBe(appleLight);
      expect(ThemeEngine.resolve('cyberpunk' as any)).toBe(appleLight);
    });

    it('should return theme object directly when passed custom tokens object', () => {
      const customTheme: IGridThemeTokens = {
        ...appleLight,
        fontFamily: 'Roboto, sans-serif',
        fontSize: 14,
      };

      expect(ThemeEngine.resolve(customTheme)).toBe(customTheme);
    });
  });

  describe('System Color Scheme Resolution', () => {
    it('should resolve to appleDark when system prefers dark mode', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      expect(ThemeEngine.resolve('system')).toBe(appleDark);
      expect(ThemeEngine.resolve(undefined)).toBe(appleDark);
    });

    it('should resolve to appleLight when system prefers light mode', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      expect(ThemeEngine.resolve('system')).toBe(appleLight);
      expect(ThemeEngine.resolve(undefined)).toBe(appleLight);
    });
  });

  describe('Custom Preset Registration', () => {
    it('should allow registering and resolving a custom theme preset', () => {
      const neonDark: IGridThemeTokens = {
        ...appleDark,
        fontFamily: 'Fira Code',
        dom: {
          ...appleDark.dom,
          accentColor: '#39FF14',
        },
      };

      ThemeEngine.registerPreset('neon-dark', neonDark);

      expect(ThemeEngine.resolve('neon-dark' as any)).toBe(neonDark);
    });
  });

  describe('DOM Styling & CSS Variables (applyToElement)', () => {
    it('should set all expected CSS custom properties on target HTMLElement', () => {
      const dummyEl = document.createElement('div');

      ThemeEngine.applyToElement(dummyEl, appleLight);

      expect(dummyEl.style.getPropertyValue('--grid-font-family')).toBe(appleLight.fontFamily);
      expect(dummyEl.style.getPropertyValue('--grid-font-size')).toBe(`${appleLight.fontSize}px`);
      expect(dummyEl.style.getPropertyValue('--grid-header-font-size')).toBe(`${appleLight.headerFontSize}px`);
      expect(dummyEl.style.getPropertyValue('--grid-toolbar-bg')).toBe(appleLight.dom.toolbarBg);
      expect(dummyEl.style.getPropertyValue('--grid-toolbar-border')).toBe(appleLight.dom.toolbarBorder);
      expect(dummyEl.style.getPropertyValue('--grid-toolbar-text')).toBe(appleLight.dom.toolbarText);
      expect(dummyEl.style.getPropertyValue('--grid-accent-color')).toBe(appleLight.dom.accentColor);
      expect(dummyEl.style.getPropertyValue('--grid-input-bg')).toBe(appleLight.dom.inputBg);
      expect(dummyEl.style.getPropertyValue('--grid-popover-bg')).toBe(appleLight.dom.popoverBg);
    });
  });

  describe('watchSystem Listener', () => {
    it('should subscribe to matchMedia change event and return unlisten function', () => {
      let listenerCallback: ((e: any) => void) | null = null;
      const addEventListenerMock = vi.fn((event: string, cb: any) => {
        if (event === 'change') listenerCallback = cb;
      });
      const removeEventListenerMock = vi.fn();

      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: addEventListenerMock,
        removeEventListener: removeEventListenerMock,
      }));

      const onChangeSpy = vi.fn();
      const unlisten = ThemeEngine.watchSystem(onChangeSpy);

      expect(addEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));

      // Simulate system theme change
      if (listenerCallback) {
        (listenerCallback as any)({ matches: true });
        expect(onChangeSpy).toHaveBeenCalledWith(true);
      }

      unlisten();
      expect(removeEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });
});
