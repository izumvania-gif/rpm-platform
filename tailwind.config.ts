import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

const config = {
  darkMode: ['class'],
  // Tailwind's content-based purge strips class selectors never referenced literally in
  // scanned source — since no dark-mode toggle exists yet, `.dark` in globals.css was being
  // silently dropped from the compiled CSS despite being fully authored. Safelisted so the
  // dark theme tokens are actually reachable once a toggle (or system-preference detection) exists.
  safelist: ['dark'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      fontFamily: {
        // Gilroy первым — фирменный шрифт Рутокен. Файл не раздаётся (см.
        // комментарий в app/layout.tsx): у кого он установлен локально,
        // браузер возьмёт его, остальным достанется Manrope из
        // `--font-display`. Один и тот же стек для текста и заголовков —
        // так задано брендбуком, разница только в начертании.
        sans: ['Gilroy', 'var(--font-display)', ...defaultTheme.fontFamily.sans],
        display: ['Gilroy', 'var(--font-display)', ...defaultTheme.fontFamily.sans],
        mono: ['var(--font-mono)', ...defaultTheme.fontFamily.mono],
      },
      // Same rem sizes as Tailwind's stock scale (nothing reflows) — the
      // deliberate part is negative tracking on lg+ ("optical sizing": larger
      // text sits tighter) plus a slightly roomier `base` line-height for
      // long-form body text. Every `text-*` utility already used across the
      // app picks this up with zero markup changes (Фаза 1).
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.6rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.006em' }],
        xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.011em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.014em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.017em' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em' }],
        '5xl': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.022em' }],
        '6xl': ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.024em' }],
        '7xl': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.024em' }],
        '8xl': ['6rem', { lineHeight: '1', letterSpacing: '-0.024em' }],
        '9xl': ['8rem', { lineHeight: '1', letterSpacing: '-0.024em' }],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      // Signature easing (see --ease-signature in globals.css) as the new
      // DEFAULT for every `transition-*` utility — every existing hover/focus
      // transition in the app (button, card, nav link, inline field…) picks
      // this up automatically, no component file touched.
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'card-settle': {
          '0%': { transform: 'scale(1.04)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'card-settle': 'card-settle 320ms cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config

export default config
