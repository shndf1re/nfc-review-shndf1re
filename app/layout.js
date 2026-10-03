export const metadata = {
  title: 'NFC Google Review Manager',
  description: 'Aplikasi Manajemen Papan NFC & QR Code Google Review',
  icons: {
    icon: '/app-icon.png',
    apple: '/app-icon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: '#f8fafc',
          color: '#0f172a',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          minHeight: '100vh',
        }}
      >
        {children}
      </body>
    </html>
  );
}
