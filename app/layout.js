import './globals.css';

export const viewport = {
  themeColor: '#2563eb',
};

export const metadata = {
  title: 'NFC Google Review Manager',
  description: 'Sistem Manajemen Papan Akrilik NFC & QR Code Google Review',
  manifest: '/manifest.json',
  icons: {
    icon: '/app-icon.png',
    shortcut: '/app-icon.png',
    apple: '/app-icon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="icon" href="/app-icon.png" sizes="any" />
        <link rel="apple-touch-icon" href="/app-icon.png" />
      </head>
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
