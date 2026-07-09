/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      /* ── ShadCN token system ─────────────────────────────── */
      colors: {
        border: 'hsl(var(--border))',
        input:  'hsl(var(--input))',
        ring:   'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary:     { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary:   { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted:   { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent:  { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card:    { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },

        /* ── CloudVault named palette ─────────────────────── */
        vault: {
          base:    '#070B14',
          surface: '#0F172A',
          card:    '#111827',
          elevated:'#161F2F',
          border:  'rgba(255,255,255,0.06)',
        },
      },

      /* ── Border radius ────────────────────────────────────── */
      borderRadius: {
        '4xl': '2rem',
        '3xl': '1.5rem',
        '2xl': '1rem',
        xl:    '0.75rem',
        lg:    'var(--radius)',
        md:    'calc(var(--radius) - 2px)',
        sm:    'calc(var(--radius) - 4px)',
      },

      /* ── Typography ───────────────────────────────────────── */
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px', letterSpacing: '0.05em' }],
        xs:    ['12px', { lineHeight: '16px' }],
        sm:    ['13px', { lineHeight: '20px' }],
        base:  ['14px', { lineHeight: '22px' }],
        lg:    ['16px', { lineHeight: '24px' }],
        xl:    ['18px', { lineHeight: '28px' }],
        '2xl': ['22px', { lineHeight: '32px' }],
        '3xl': ['28px', { lineHeight: '36px' }],
      },

      /* ── Spacing ──────────────────────────────────────────── */
      spacing: {
        4.5: '1.125rem',
        13:  '3.25rem',
        15:  '3.75rem',
        18:  '4.5rem',
        22:  '5.5rem',
        26:  '6.5rem',
        sidebar: '260px',
        'sidebar-collapsed': '72px',
      },

      /* ── Shadows ──────────────────────────────────────────── */
      boxShadow: {
        'vault-sm':  '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
        'vault':     '0 4px 16px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.2)',
        'vault-lg':  '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
        'vault-xl':  '0 16px 48px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)',
        'glow-sm':   '0 0 12px rgba(99,102,241,0.2)',
        'glow':      '0 0 24px rgba(99,102,241,0.25)',
        'glow-lg':   '0 0 40px rgba(99,102,241,0.3)',
        'glow-card': '0 0 0 1px rgba(99,102,241,0.15), 0 8px 32px rgba(99,102,241,0.08)',
        'inner-glow':'inset 0 1px 0 rgba(255,255,255,0.08)',
        'card-hover':'0 0 0 1px rgba(99,102,241,0.25), 0 8px 32px rgba(99,102,241,0.1), 0 2px 8px rgba(0,0,0,0.3)',
      },

      /* ── Animations & Keyframes ───────────────────────────── */
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
        'fade-in':   { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-out':  { from: { opacity: '1' }, to: { opacity: '0' } },
        'slide-in-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(12px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-down': {
          from: { transform: 'translateY(-100%)', opacity: '0' },
          to:   { transform: 'translateY(0)', opacity: '1' },
        },
        'zoom-in-95': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-4px)' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(99,102,241,0.3)' },
          '50%':      { boxShadow: '0 0 24px rgba(99,102,241,0.6)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.92)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
      },

      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        'fade-in':        'fade-in 0.25s ease-out both',
        'fade-out':       'fade-out 0.25s ease-out both',
        'slide-in-up':    'slide-in-up 0.3s ease-out both',
        'slide-in-left':  'slide-in-left 0.3s ease-out both',
        'slide-in-right': 'slide-in-right 0.3s ease-out both',
        'slide-down':     'slide-down 0.3s ease-out both',
        'zoom-in-95':     'zoom-in-95 0.25s ease-out both',
        'float':          'float 3s ease-in-out infinite',
        'shimmer':        'shimmer 2s ease-in-out infinite',
        'pulse-glow':     'pulse-glow 2s ease-in-out infinite',
        'spin-slow':      'spin-slow 8s linear infinite',
        'scale-in':       'scale-in 0.2s ease-out both',
      },

      /* ── Background patterns ──────────────────────────────── */
      backgroundImage: {
        'grid-dark': 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        'dots-dark':  'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'vault-hero': 'radial-gradient(ellipse 80% 60% at 50% -10%, #1a1040 0%, #0a0d1a 60%, #060810 100%)',
      },

      backgroundSize: {
        'grid': '40px 40px',
        'dots': '24px 24px',
      },

      /* ── Transitions ──────────────────────────────────────── */
      transitionDuration: {
        250: '250ms',
        350: '350ms',
        400: '400ms',
      },

      transitionTimingFunction: {
        'spring':      'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'ease-out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',
      },

      /* ── Blur ─────────────────────────────────────────────── */
      backdropBlur: {
        xs: '2px',
        '4xl': '72px',
      },
    },
  },
  plugins: [],
};
