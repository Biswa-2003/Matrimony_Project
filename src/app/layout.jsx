import 'bootstrap/dist/css/bootstrap.min.css'; // Bootstrap styles
import BootstrapClientLoader from './components/BootstrapClientLoader'; // Bootstrap JS loader
import DashNav from '@/app/components/dashnav';
import Footer from '@/app/components/footer';
import AIAssistant from '@/app/components/AIAssistant';
import MainWrapper from '@/app/components/MainWrapper';
import ScrollProgress from '@/app/components/motion/ScrollProgress';
import { LanguageProvider } from '@/lib/i18n/LanguageProvider';
import { ServiceWorkerRegister } from '@/app/components/InstallApp';
import RefCapture from '@/app/components/RefCapture';
import { Suspense } from 'react';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { Inter, Poppins } from 'next/font/google';
// Display serif is self-hosted from npm (Turbopack's Google loader fails on this family)
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/cormorant-garamond/latin-700.css';
import '@fontsource/cormorant-garamond/latin-500-italic.css';
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
  metadataBase: new URL((process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')),
  title: 'MatriMoney — Premium Indian Matrimony',
  description: 'Verified brides and grooms, family-first matchmaking and complete privacy. Begin your sacred journey on MatriMoney.',
  icons: { icon: '/images/logo-mark.svg', apple: '/icons/icon-192.png' },
  openGraph: {
    type: 'website',
    siteName: 'MatriMoney',
    title: 'MatriMoney — Premium Indian Matrimony',
    description: 'Verified brides and grooms, family-first matchmaking and complete privacy.',
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'MatriMoney', statusBarStyle: 'default' },
};

export const viewport = {
  themeColor: '#5a0f22',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className="antialiased">
        <LanguageProvider>
        {/* ✅ Load Bootstrap JS only on client */}
        <BootstrapClientLoader />
        <ServiceWorkerRegister />
        <Suspense fallback={null}><RefCapture /></Suspense>

        {/* ✅ Top scroll progress bar */}
        <ScrollProgress />

        {/* ✅ Keep Navbar mounted across all pages */}
        <DashNav />

        {/* ✅ Dynamic wrapper for public and admin pages */}
        <MainWrapper>
          {children}
        </MainWrapper>

        {/* ✅ Footer below everything */}
        <Footer />

        {/* ✅ AI Assistant - Available on all pages */}
        <AIAssistant />
        </LanguageProvider>
      </body>
    </html>
  );
}
