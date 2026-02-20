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
    swatches: ['#3d3d3d', '#b0b0b0', '#e05555', '#50c878', '#5a8de0'],
    vars: {
      '--color-surface':          '#0f0f0f',
      '--color-surface-raised':   '#1a1a1a',
      '--color-surface-overlay':  '#242424',
      '--color-border-subtle':    '#2a2a2a',
      '--color-accent':           '#6366f1',
      '--color-accent-hover':     '#818cf8',
      '--color-text-primary':     '#f5f5f5',
      '--color-text-secondary':   '#a3a3a3',
      '--color-text-muted':       '#737373',
      '--color-success':          '#22c55e',
      '--color-warning':          '#f59e0b',
      '--color-danger':           '#ef4444',
    },
  },
  {
    id: 'dracula',
    name: 'Dracula',
    swatches: ['#282a36', '#f8f8f2', '#ff5555', '#50fa7b', '#bd93f9'],
    vars: {
      '--color-surface':          '#191a21',
      '--color-surface-raised':   '#282a36',
      '--color-surface-overlay':  '#44475a',
      '--color-border-subtle':    '#44475a',
      '--color-accent':           '#bd93f9',
      '--color-accent-hover':     '#caa9fa',
      '--color-text-primary':     '#f8f8f2',
      '--color-text-secondary':   '#6272a4',
      '--color-text-muted':       '#6272a4',
      '--color-success':          '#50fa7b',
      '--color-warning':          '#f1fa8c',
      '--color-danger':           '#ff5555',
    },
  },
  {
    id: 'nord',
    name: 'Nord',
    swatches: ['#2e3440', '#c5cdd9', '#bf616a', '#a3be8c', '#88c0d0'],
    vars: {
      '--color-surface':          '#242933',
      '--color-surface-raised':   '#2e3440',
      '--color-surface-overlay':  '#3b4252',
      '--color-border-subtle':    '#434c5e',
      '--color-accent':           '#88c0d0',
      '--color-accent-hover':     '#8fbcbb',
      '--color-text-primary':     '#eceff4',
      '--color-text-secondary':   '#d8dee9',
      '--color-text-muted':       '#616e88',
      '--color-success':          '#a3be8c',
      '--color-warning':          '#ebcb8b',
      '--color-danger':           '#bf616a',
    },
  },
  {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    swatches: ['#002b36', '#657b83', '#dc322f', '#859900', '#268bd2'],
    vars: {
      '--color-surface':          '#001e26',
      '--color-surface-raised':   '#002b36',
      '--color-surface-overlay':  '#073642',
      '--color-border-subtle':    '#0f4550',
      '--color-accent':           '#268bd2',
      '--color-accent-hover':     '#2aa198',
      '--color-text-primary':     '#fdf6e3',
      '--color-text-secondary':   '#93a1a1',
      '--color-text-muted':       '#657b83',
      '--color-success':          '#859900',
      '--color-warning':          '#b58900',
      '--color-danger':           '#dc322f',
    },
  },
  {
    id: 'solarized-light',
    name: 'Solarized Light',
    swatches: ['#fdf6e3', '#839496', '#dc322f', '#859900', '#268bd2'],
    vars: {
      '--color-surface':          '#eee8d5',
      '--color-surface-raised':   '#fdf6e3',
      '--color-surface-overlay':  '#e5dfc8',
      '--color-border-subtle':    '#ccc4ae',
      '--color-accent':           '#268bd2',
      '--color-accent-hover':     '#2aa198',
      '--color-text-primary':     '#073642',
      '--color-text-secondary':   '#586e75',
      '--color-text-muted':       '#839496',
      '--color-success':          '#859900',
      '--color-warning':          '#b58900',
      '--color-danger':           '#dc322f',
    },
  },
  {
    id: 'gruvbox',
    name: 'Gruvbox',
    swatches: ['#3c3836', '#ebdbb2', '#cc241d', '#b8bb26', '#458588'],
    vars: {
      '--color-surface':          '#1d2021',
      '--color-surface-raised':   '#282828',
      '--color-surface-overlay':  '#3c3836',
      '--color-border-subtle':    '#504945',
      '--color-accent':           '#458588',
      '--color-accent-hover':     '#83a598',
      '--color-text-primary':     '#ebdbb2',
      '--color-text-secondary':   '#a89984',
      '--color-text-muted':       '#7c6f64',
      '--color-success':          '#b8bb26',
      '--color-warning':          '#d79921',
      '--color-danger':           '#cc241d',
    },
  },
];

export function applyTheme(id: string): void {
  const theme = THEMES.find((t) => t.id === id) ?? THEMES[0];
  const root = document.documentElement;
  for (const [prop, value] of Object.entries(theme.vars)) {
    root.style.setProperty(prop, value);
  }
}
