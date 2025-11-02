/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        // Animación de aparición del overlay
        overlayShow: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        // Animación de desaparición del overlay (generalmente la inversa)
        overlayHide: {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        // Animación de aparición del contenido (con el escalado y el movimiento)
        contentShow: {
          from: {
            opacity: '0',
            transform: 'translate(-50%, -48%) scale(0.96)', // Ligeramente por encima y más pequeño
          },
          to: {
            opacity: '1',
            transform: 'translate(-50%, -50%) scale(1)',    // En el centro y tamaño normal
          },
        },
        // Animación de desaparición del contenido
        contentHide: {
            from: {
                opacity: '1',
                transform: 'translate(-50%, -50%) scale(1)',
            },
            to: {
                opacity: '0',
                transform: 'translate(-50%, -48%) scale(0.96)',
            },
        },
    },
      animation: {
        // Mapeo de los keyframes a clases de utilidad
        overlayShow: 'overlayShow 150ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        overlayHide: 'overlayHide 150ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        contentShow: 'contentShow 150ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        contentHide: 'contentHide 150ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
}

