export const metadata = {
  title: 'NFC Google Review',
  description: 'Sistem NFC Google Review',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="apple-touch-icon" href="https://cdn-icons-png.flaticon.com/512/3522/3522467.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body style={{
        margin: 0,
        padding: 0,
        backgroundColor: '#f1f5f9',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        color: '#0f172a',
        WebkitFontSmoothing: 'antialiased'
      }}>
        {children}
      </body>
    </html>
  );
}
