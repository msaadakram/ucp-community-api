export const metadata = {
  title: 'UCP Campus API — Admin',
  description: 'Control panel for the UCP Campus combined backend.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
