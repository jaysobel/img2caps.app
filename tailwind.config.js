module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23333333' fill-opacity='0.12' fill-rule='evenodd'%3E%3Cpath d='M0 0h40v1H0zm0 20h40v1H0zM0 39h40v1H0z'/%3E%3Cpath d='M0 0h1v40H0zm20 0h1v40h-1zM39 0h1v40h-1z'/%3E%3C/g%3E%3C/svg%3E\")",
      },
      animation: {
        'pulse-glow': 'pulse-glow 3s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'pulse-opacity': 'pulse-opacity 3s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'tech-ping': 'tech-ping 3s cubic-bezier(0, 0, 0.2, 1) infinite',
        'tech-ripple': 'tech-ripple 3s cubic-bezier(0, 0, 0.2, 1) infinite',
        'tech-ripple-delayed': 'tech-ripple 3s cubic-bezier(0, 0, 0.2, 1) infinite 1s',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.5)' },
          '50%': { boxShadow: '0 0 20px 6px rgba(59, 130, 246, 0.7)' },
        },
        'pulse-opacity': {
          '0%, 100%': { opacity: '0' },
          '50%': { opacity: '0.3' },
        },
        'tech-ping': {
          '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.7)' },
          '15%': { transform: 'scale(1)', boxShadow: '0 0 0 6px rgba(59, 130, 246, 0)' },
          '30%': { transform: 'scale(0.97)', boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)' },
          '45%': { transform: 'scale(1)', boxShadow: '0 0 10px 0 rgba(59, 130, 246, 0.4)' },
          '70%': { transform: 'scale(0.98)', boxShadow: '0 0 5px 0 rgba(59, 130, 246, 0.1)' },
          '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)' },
        },
        'tech-ripple': {
          '0%': { 
            boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)', 
            border: '2px solid rgba(59, 130, 246, 0)' 
          },
          '15%': { 
            boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.3)', 
            border: '2px solid rgba(59, 130, 246, 0.3)' 
          },
          '25%': { 
            boxShadow: '0 0 0 10px rgba(59, 130, 246, 0)', 
            border: '2px solid rgba(59, 130, 246, 0.5)' 
          },
          '50%': { 
            boxShadow: '0 0 0 20px rgba(59, 130, 246, 0)', 
            border: '2px solid rgba(59, 130, 246, 0)' 
          },
          '100%': { 
            boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)', 
            border: '2px solid rgba(59, 130, 246, 0)' 
          },
        },
      },
    },
  },
  plugins: [],
} 