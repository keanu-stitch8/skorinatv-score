import './globals.css';
import QueryProvider from './query-provider';

export const metadata = {
  title: 'Skorina TV',
  description: 'Scoreboard studio untuk Persib Bandung vs FC Seoul.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" data-theme="dark" className="bg-background font-sans text-foreground scheme-dark">
      <body className="m-0"><QueryProvider>{children}</QueryProvider></body>
    </html>
  );
}
