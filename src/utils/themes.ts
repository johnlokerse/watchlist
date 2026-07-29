export type ColorScheme = 'light' | 'dark';

export interface Theme {
  id: string;
  name: string;
  scheme: ColorScheme;
  /** 5 swatches: [bg-preview, text/white, red, green, accent] */
  swatches: [string, string, string, string, string];
  vars: Record<string, string>;
}

export const THEMES: Theme[] = [
  {
    id: 'default',
    name: 'Default',
    scheme: 'dark',
    swatches: ['#071014', '#f4f0e8', '#d65f4b', '#58c68a', '#0f9f9a'],
    vars: {
      '--color-surface':          '#071014',
      '--color-surface-raised':   '#101b20',
      '--color-surface-overlay':  '#17272d',
      '--color-border-subtle':    '#26393f',
      '--color-accent':           '#0f9f9a',
      '--color-accent-hover':     '#14b8ad',
      '--color-text-primary':     '#f4f0e8',
      '--color-text-secondary':   '#a9bbb9',
      '--color-text-muted':       '#6f8384',
      '--color-success':          '#58c68a',
      '--color-warning':          '#e7a93c',
      '--color-danger':           '#d65f4b',
    },
  },
  {
    id: 'oled-cinema',
    name: 'True OLED',
    scheme: 'dark',
    swatches: ['#000000', '#ffffff', '#ff5470', '#ff8a3d', '#ff8a3d'],
    vars: {
      '--color-surface':          '#000000',
      '--color-surface-raised':   '#000000',
      '--color-surface-overlay':  '#0a0a0c',
      '--color-border-subtle':    '#1c1c22',
      '--color-accent':           '#ff8a3d',
      '--color-accent-hover':     '#ffa564',
      '--color-text-primary':     '#ffffff',
      '--color-text-secondary':   '#a1a1aa',
      '--color-text-muted':       '#64646b',
      '--color-success':          '#34d399',
      '--color-warning':          '#fbbf24',
      '--color-danger':           '#ff5470',
    },
  },
  {
    id: 'midnight-velvet',
    name: 'Midnight Velvet',
    scheme: 'dark',
    swatches: ['#0c0a12', '#f5f0e8', '#e06b7a', '#6bcb8a', '#d4a84b'],
    vars: {
      '--color-surface':          '#0c0a12',
      '--color-surface-raised':   '#16121f',
      '--color-surface-overlay':  '#1f1a2b',
      '--color-border-subtle':    '#342c45',
      '--color-accent':           '#d4a84b',
      '--color-accent-hover':     '#e0b85e',
      '--color-text-primary':     '#f5f0e8',
      '--color-text-secondary':   '#b8b0c5',
      '--color-text-muted':       '#7a728c',
      '--color-success':          '#6bcb8a',
      '--color-warning':          '#e0a84b',
      '--color-danger':           '#e06b7a',
    },
  },
  {
    id: 'dracula',
    name: 'Dracula',
    scheme: 'dark',
    swatches: ['#141821', '#f7f3ef', '#ff6b7a', '#7ee787', '#b184f4'],
    vars: {
      '--color-surface':          '#141821',
      '--color-surface-raised':   '#202634',
      '--color-surface-overlay':  '#2d3447',
      '--color-border-subtle':    '#3d465c',
      '--color-accent':           '#bd93f9',
      '--color-accent-hover':     '#caa9fa',
      '--color-text-primary':     '#f8f8f2',
      '--color-text-secondary':   '#b8c0d7',
      '--color-text-muted':       '#7d88a8',
      '--color-success':          '#50fa7b',
      '--color-warning':          '#f1fa8c',
      '--color-danger':           '#ff5555',
    },
  },
  {
    id: 'nord',
    name: 'Nord',
    scheme: 'dark',
    swatches: ['#18202b', '#eceff4', '#bf616a', '#a3be8c', '#88c0d0'],
    vars: {
      '--color-surface':          '#18202b',
      '--color-surface-raised':   '#232d3a',
      '--color-surface-overlay':  '#303c4b',
      '--color-border-subtle':    '#425066',
      '--color-accent':           '#88c0d0',
      '--color-accent-hover':     '#8fbcbb',
      '--color-text-primary':     '#eceff4',
      '--color-text-secondary':   '#d8dee9',
      '--color-text-muted':       '#7c879b',
      '--color-success':          '#a3be8c',
      '--color-warning':          '#ebcb8b',
      '--color-danger':           '#bf616a',
    },
  },
  {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    scheme: 'dark',
    swatches: ['#05242c', '#f5efe0', '#dc5a4f', '#8aa943', '#2aa198'],
    vars: {
      '--color-surface':          '#05242c',
      '--color-surface-raised':   '#0a3038',
      '--color-surface-overlay':  '#123e47',
      '--color-border-subtle':    '#23545d',
      '--color-accent':           '#2aa198',
      '--color-accent-hover':     '#33b8ad',
      '--color-text-primary':     '#f5efe0',
      '--color-text-secondary':   '#adc3bf',
      '--color-text-muted':       '#78918e',
      '--color-success':          '#859900',
      '--color-warning':          '#b58900',
      '--color-danger':           '#dc322f',
    },
  },
  {
    id: 'solarized-light',
    name: 'Solarized Light',
    scheme: 'light',
    swatches: ['#f3f4ef', '#1d3033', '#d65f4b', '#5c9c68', '#188d88'],
    vars: {
      '--color-surface':          '#f3f4ef',
      '--color-surface-raised':   '#ffffff',
      '--color-surface-overlay':  '#e6ece8',
      '--color-border-subtle':    '#c6d2cf',
      '--color-accent':           '#188d88',
      '--color-accent-hover':     '#0f766f',
      '--color-text-primary':     '#1d3033',
      '--color-text-secondary':   '#506668',
      '--color-text-muted':       '#7e9293',
      '--color-success':          '#5c9c68',
      '--color-warning':          '#c88525',
      '--color-danger':           '#d65f4b',
    },
  },
  {
    id: 'paper-ink',
    name: 'Paper & Ink',
    scheme: 'light',
    swatches: ['#f6f1e8', '#1a1a1a', '#c45c4a', '#4f8f6a', '#c45c4a'],
    vars: {
      '--color-surface':          '#f6f1e8',
      '--color-surface-raised':   '#fffdf8',
      '--color-surface-overlay':  '#ebe4d8',
      '--color-border-subtle':    '#d4cbbd',
      '--color-accent':           '#c45c4a',
      '--color-accent-hover':     '#a84b3b',
      '--color-text-primary':     '#1a1a1a',
      '--color-text-secondary':   '#4a4540',
      '--color-text-muted':       '#7a736a',
      '--color-success':          '#4f8f6a',
      '--color-warning':          '#c4892b',
      '--color-danger':           '#c45c4a',
    },
  },
  {
    id: 'daylight-teal',
    name: 'Daylight Teal',
    scheme: 'light',
    swatches: ['#f3f6f5', '#142024', '#c45a48', '#3f9a6a', '#0d8a85'],
    vars: {
      '--color-surface':          '#f3f6f5',
      '--color-surface-raised':   '#ffffff',
      '--color-surface-overlay':  '#e5eceb',
      '--color-border-subtle':    '#c5d2d0',
      '--color-accent':           '#0d8a85',
      '--color-accent-hover':     '#0a716d',
      '--color-text-primary':     '#142024',
      '--color-text-secondary':   '#4a5d60',
      '--color-text-muted':       '#7a8c8e',
      '--color-success':          '#3f9a6a',
      '--color-warning':          '#c48420',
      '--color-danger':           '#c45a48',
    },
  },
  {
    id: 'nord-light',
    name: 'Nord Light',
    scheme: 'light',
    swatches: ['#eceff4', '#2e3440', '#bf616a', '#a3be8c', '#5e81ac'],
    vars: {
      '--color-surface':          '#eceff4',
      '--color-surface-raised':   '#ffffff',
      '--color-surface-overlay':  '#e5e9f0',
      '--color-border-subtle':    '#d8dee9',
      '--color-accent':           '#5e81ac',
      '--color-accent-hover':     '#4c6d99',
      '--color-text-primary':     '#2e3440',
      '--color-text-secondary':   '#4c566a',
      '--color-text-muted':       '#7b8499',
      '--color-success':          '#a3be8c',
      '--color-warning':          '#ebcb8b',
      '--color-danger':           '#bf616a',
    },
  },
  {
    id: 'gruvbox-light',
    name: 'Gruvbox Light',
    scheme: 'light',
    swatches: ['#fbf1c7', '#3c3836', '#9d0006', '#79740e', '#427b58'],
    vars: {
      '--color-surface':          '#fbf1c7',
      '--color-surface-raised':   '#f9f5d7',
      '--color-surface-overlay':  '#f2e5bc',
      '--color-border-subtle':    '#d5c4a1',
      '--color-accent':           '#427b58',
      '--color-accent-hover':     '#346648',
      '--color-text-primary':     '#3c3836',
      '--color-text-secondary':   '#504945',
      '--color-text-muted':       '#7c6f64',
      '--color-success':          '#79740e',
      '--color-warning':          '#b57614',
      '--color-danger':           '#9d0006',
    },
  },
  {
    id: 'rose-pine-dawn',
    name: 'Rosé Pine Dawn',
    scheme: 'light',
    swatches: ['#faf4ed', '#575279', '#b4637a', '#286983', '#907aa9'],
    vars: {
      '--color-surface':          '#faf4ed',
      '--color-surface-raised':   '#fffaf3',
      '--color-surface-overlay':  '#f2e9e1',
      '--color-border-subtle':    '#dfdad9',
      '--color-accent':           '#907aa9',
      '--color-accent-hover':     '#7a6594',
      '--color-text-primary':     '#575279',
      '--color-text-secondary':   '#6e6a86',
      '--color-text-muted':       '#9893a5',
      '--color-success':          '#286983',
      '--color-warning':          '#ea9d34',
      '--color-danger':           '#b4637a',
    },
  },
  {
    id: 'gruvbox',
    name: 'Gruvbox',
    scheme: 'dark',
    swatches: ['#1f211c', '#f0dfb7', '#d15c43', '#a6b84a', '#4d9488'],
    vars: {
      '--color-surface':          '#1f211c',
      '--color-surface-raised':   '#2b2d26',
      '--color-surface-overlay':  '#393b32',
      '--color-border-subtle':    '#515245',
      '--color-accent':           '#4d9488',
      '--color-accent-hover':     '#67aa9f',
      '--color-text-primary':     '#f0dfb7',
      '--color-text-secondary':   '#c8b98f',
      '--color-text-muted':       '#92846c',
      '--color-success':          '#a6b84a',
      '--color-warning':          '#d99a35',
      '--color-danger':           '#d15c43',
    },
  },
];

export const DEFAULT_LIGHT_THEME = 'paper-ink';
export const DEFAULT_DARK_THEME = 'midnight-velvet';

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function getThemesForScheme(scheme: ColorScheme): Theme[] {
  return THEMES.filter((t) => t.scheme === scheme);
}

export function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveThemeId(options: {
  dynamicTheme: boolean;
  theme: string;
  themeLight: string;
  themeDark: string;
  prefersDark?: boolean;
}): string {
  if (!options.dynamicTheme) return options.theme;
  const prefersDark = options.prefersDark ?? getSystemPrefersDark();
  return prefersDark ? options.themeDark : options.themeLight;
}

export function applyTheme(id: string): void {
  const theme = getTheme(id);
  const root = document.documentElement;
  for (const [prop, value] of Object.entries(theme.vars)) {
    root.style.setProperty(prop, value);
  }
  root.dataset.theme = theme.id;
  root.dataset.scheme = theme.scheme;
  root.style.colorScheme = theme.scheme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.vars['--color-surface'] ?? '#000000');
}
