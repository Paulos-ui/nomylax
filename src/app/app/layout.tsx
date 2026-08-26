'use client';

import { usePathname } from 'next/navigation';
import { WorkspaceProvider } from '@/lib/store';
import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';
import { NetworkBanner } from '@/components/shell/NetworkBanner';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const bare = path.startsWith('/app/onboarding');

  return (
    <WorkspaceProvider>
      <NetworkBanner />
      {bare ? (
        <main style={{ minHeight: '100vh' }}>{children}</main>
      ) : (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <Sidebar />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Topbar />
            <main style={{ padding: 24, maxWidth: 1440 }}>{children}</main>
          </div>
        </div>
      )}
    </WorkspaceProvider>
  );
}
