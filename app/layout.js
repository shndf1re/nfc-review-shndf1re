export const metadata = {
  title: 'NFC Google Review',
  description: 'Aplikasi NFC Google Review',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#f4f6f8' }}>
        {children}
      </body>
    </html>
  );
}
