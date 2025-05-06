'use client'; 

import type { Metadata } from 'next'; 
import { Geist_Sans as GeistSans, Geist_Mono as GeistMono } from 'next/font/google'; // Corrected import names
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type React from 'react';

const geistSans = GeistSans({ // Use corrected name
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = GeistMono({ // Use corrected name
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// export const metadata: Metadata = { // Metadata needs to be handled differently for client components
//   title: 'Kasbon temen Guweh',
//   description: 'Aplikasi untuk menghitung dan mengelola hutang.',
// };

// Create a client
const queryClient = new QueryClient();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head> {/* You can add metadata tags directly here for client components or manage via a different hook */}
        <title>Kasbon temen Guweh</title>
        <meta name="description" content="Aplikasi untuk menghitung dan mengelola hutang." />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}> {/* Ensure font-sans is applied if Geist is sans-serif */}
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster />
        </QueryClientProvider>
      </body>
    </html>
  );
}
