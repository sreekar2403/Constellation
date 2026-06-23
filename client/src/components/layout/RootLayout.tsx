import React from 'react';
import { Outlet } from 'react-router-dom';
import { TopHUD } from './TopHUD';
import { TacticalRail } from './TacticalRail';
import { CommandPalette } from '../CommandPalette';

export const RootLayout: React.FC = () => {
  return (
    <div className="flex h-full w-full flex-col bg-bg-primary text-text-primary">
      <TopHUD />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
      <TacticalRail />
      <CommandPalette />
    </div>
  );
};
