'use client'; 

import type { Metadata } from 'next'; 
import { Inter, Roboto_Mono } from 'next/font/google'; // Changed to Inter and Roboto_Mono
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type React from 'react';

const inter = Inter({ // Changed from GeistSans to Inter
  variable: '--font-inter', // Updated CSS variable name
  subsets: ['latin'],
  display: 'swap',
});

const robotoMono = Roboto_Mono({ // Changed from GeistMono to Roboto_Mono
  variable: '--font-roboto-mono', // Updated CSS variable name
  subsets: ['latin'],
  display: 'swap',
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
      <head>
        <title>Kasbon temen Guweh</title>
        <meta name="description" content="Aplikasi untuk menghitung dan mengelola hutang." />
      </head>
      <body className={`${inter.variable} ${robotoMono.variable} font-sans antialiased`}> {/* Use updated font variables and ensure font-sans is applied */}
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster />
        </QueryClientProvider>
      </body>
    </html>
  );
}
