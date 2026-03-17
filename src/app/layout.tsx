import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'AI Hub - Unified AI Creative Studio',
  description: 'Generate images and videos with Kling and Google AI in one unified studio',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white min-h-screen flex">
        <Sidebar />
        <main className="flex-1 ml-60 min-h-screen overflow-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
