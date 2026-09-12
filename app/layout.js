export const metadata = {
  title: 'NFC Google Review Manager',
  description: 'Aplikasi Manajemen Papan NFC & QR Code Google Review',
  icons: {
    icon: '/app-icon.png',
    apple: '/app-icon.png',
  },
};

export default function RootLayout({ children }) {
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '';

  return (
    <html lang="id">
      <head>
        {/* SDK Midtrans Snap (Sandbox Mode) untuk Pop-up QRIS & Virtual Account */}
        {clientKey && (
          <script
            type="text/javascript"
            src="https://app.sandbox.midtrans.com/snap/snap.js"
            data-client-key={clientKey}
          />
        )}
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
