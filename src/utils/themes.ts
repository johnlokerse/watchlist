export interface Theme {
  id: string;
  name: string;
  /** 5 swatches: [bg-preview, text/white, red, green, accent] */
  swatches: [string, string, string, string, string];
  vars: Record<string, string>;
}

export const THEMES: Theme[] = [
  {
    id: 'default',
    name: 'Default',
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
    id: 'dracula',
    name: 'Dracula',
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
    id: 'gruvbox',
    name: 'Gruvbox',
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

export function applyTheme(id: string): void {
  const theme = THEMES.find((t) => t.id === id) ?? THEMES[0];
  const root = document.documentElement;
  for (const [prop, value] of Object.entries(theme.vars)) {
    root.style.setProperty(prop, value);
  }
  root.dataset.theme = theme.id;
  root.style.colorScheme = theme.id === 'solarized-light' ? 'light' : 'dark';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.vars['--color-surface'] ?? '#000000');
}
