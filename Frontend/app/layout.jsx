import { Inter, Space_Grotesk } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { Suspense } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import './globals.css';
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' });
export const metadata = {
    title: 'CampFood - Campus Food, Smarter & Faster',
    description: 'Order from halls, campus kitchens, and student homemade food - Delivered by RU students at Rajshahi University.',
    icons: {
        icon: [
            {
                url: '/icon-light-32x32.png',
                media: '(prefers-color-scheme: light)',
            },
            {
                url: '/icon-dark-32x32.png',
                media: '(prefers-color-scheme: dark)',
            },
            {
                url: '/icon.svg',
                type: 'image/svg+xml',
            },
        ],
        apple: '/apple-icon.png',
    },
};
export const viewport = {
    themeColor: '#2d8a4e',
    width: 'device-width',
    initialScale: 1,
};
export default function RootLayout({ children, }) {
    return (<html lang="en">
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased`} suppressHydrationWarning>
        <Suspense fallback={null}>
          <AuthGate>{children}</AuthGate>
        </Suspense>
        <Analytics />
      </body>
    </html>);
}
