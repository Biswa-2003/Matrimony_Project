import 'bootstrap/dist/css/bootstrap.min.css'; // Bootstrap styles
import BootstrapClientLoader from './components/BootstrapClientLoader'; // Bootstrap JS loader
import DashNav from '@/app/components/dashnav';
import Footer from '@/app/components/footer';
import AIAssistant from '@/app/components/AIAssistant';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata = {
  title: 'MatriMoney',
  description: 'Matrimony platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className="antialiased">
        {/* ✅ Load Bootstrap JS only on client */}
        <BootstrapClientLoader />

        {/* ✅ Keep Navbar mounted across all pages */}
        <DashNav />

        {/* ✅ Add margin-top so content isn't hidden behind navbar */}
        <main style={{ marginTop: '90px' }}>
          {children}
        </main>

        {/* ✅ Footer below everything */}
        <Footer />

        {/* ✅ AI Assistant - Available on all pages */}
        <AIAssistant />
      </body>
    </html>
  );
}
