import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // -- Core palette ------------------------------------------
        bb: {
          black:       '#1C1917',
          white:       '#FFFFFF',
          amber:       '#C17A3A',
          'amber-light': '#F5ECD8',
          'amber-dark':  '#8C5420',
          green:       '#2E7D52',
          'green-light': '#E8F5EE',
          red:         '#C0392B',
          'red-light':   '#FDECEA',
          blue:        '#1A56A0',
          'blue-light':  '#E8F0FB',
        },
        stone: {
          50:  '#F7F5F2',
          100: '#EDE9E4',
          200: '#D6D0C8',
          300: '#BDB6AC',
          400: '#A09890',
          500: '#857D76',
          600: '#6B6460',
          700: '#524D4A',
          800: '#3A3530',
          900: '#1C1917',
        },
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },

      fontSize: {
        'display': ['28px', { lineHeight: '1.15', fontWeight: '600', letterSpacing: '-0.02em' }],
        'h1':      ['22px', { lineHeight: '1.2',  fontWeight: '600', letterSpacing: '-0.01em' }],
        'h2':      ['18px', { lineHeight: '1.25', fontWeight: '600' }],
        'h3':      ['15px', { lineHeight: '1.3',  fontWeight: '600' }],
        'body':    ['14px', { lineHeight: '1.6',  fontWeight: '400' }],
        'small':   ['12px', { lineHeight: '1.5',  fontWeight: '400' }],
        'label':   ['11px', { lineHeight: '1.4',  fontWeight: '500', letterSpacing: '0.06em' }],
        'micro':   ['10px', { lineHeight: '1.4',  fontWeight: '600', letterSpacing: '0.08em' }],
      },

      borderRadius: {
        'sm':  '4px',
        'md':  '6px',
        'lg':  '10px',
        'xl':  '14px',
        '2xl': '20px',
        'full': '9999px',
      },

      spacing: {
        '0.25': '1px',
        '4.5':  '18px',
        '13':   '52px',
        '15':   '60px',
        '18':   '72px',
        '22':   '88px',
        '26':   '104px',
        '30':   '120px',
      },

      boxShadow: {
        'focus':  '0 0 0 3px rgba(28, 25, 23, 0.08)',
        'focus-amber': '0 0 0 3px rgba(193, 122, 58, 0.2)',
        'card':   '0 1px 3px rgba(28, 25, 23, 0.06)',
        'none':   'none',
      },

      transitionDuration: {
        DEFAULT: '150ms',
      },

      transitionTimingFunction: {
        DEFAULT: 'ease',
      },

      keyframes: {
        shimmer: {
          '0%, 100%': { opacity: '0.5' },
          '50%':      { opacity: '1' },
        },
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },

      animation: {
        shimmer:    'shimmer 1.4s ease-in-out infinite',
        spin:       'spin 0.8s linear infinite',
        'fade-in':  'fadeIn 0.2s ease',
        'slide-down': 'slideDown 0.2s ease',
      },

      maxWidth: {
        'site':       '1280px',
        'content':    '720px',
        'card':       '380px',
        'feed':       '640px',
      },

      screens: {
        'xs':  '375px',
        'sm':  '640px',
        'md':  '768px',
        'lg':  '1024px',
        'xl':  '1280px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [],
}

export default config

