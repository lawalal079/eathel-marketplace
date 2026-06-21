'use client';

import React from 'react';
import { PrivyProvider } from '@privy-io/react-auth';

// ─── Privy config ─────────────────────────────────────────────────────────────
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? '';

if (typeof window !== 'undefined') {
  // Suppress third-party extension error about window.ethereum being read-only
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const msg = args.map(arg => (arg && arg.message) || String(arg)).join(' ');
    if (
      msg.includes('Cannot set property ethereum') ||
      msg.includes('pageProvider.js') ||
      msg.includes('unique "key" prop') ||
      msg.includes('Check the render method of') ||
      msg.includes('isDefaultWallet') ||
      msg.includes('Error checking default wallet status')
    ) {
      return;
    }
    originalError.apply(console, args);
  };

  // Suppress Privy's showWalletLoginFirst warning
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const msg = args.map(arg => String(arg)).join(' ');
    if (msg.includes('showWalletLoginFirst')) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  if (!PRIVY_APP_ID) {
    console.warn('Privy App ID is missing. Please set NEXT_PUBLIC_PRIVY_APP_ID in your environment.');
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ['wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#4E8981',
          logo: 'https://aethellabs.com/logo.png', // Optional
          showWalletLoginFirst: true,
        },
        // Remove createOnLogin if you only want connect functionality without embedded wallets
        embeddedWallets: {
          ethereum: { createOnLogin: 'off' },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
