import React from 'react';
import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased">
      <Outlet />
    </div>
  );
}
