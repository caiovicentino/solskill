'use client';

import { PrivyProvider } from '@privy-io/react-auth';

// Privy App ID - hardcoded for reliability in production
const PRIVY_APP_ID = 'cml7a2c6s0033jm0dlx8sdc1a';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#14F195',
        },
        loginMethods: ['email', 'twitter'],
        embeddedWallets: {
          solana: {
            createOnLogin: 'users-without-wallets',
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
