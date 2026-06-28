import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { RootLayout } from './components/layout/RootLayout';
import { Dashboard } from './pages/Dashboard';
import { Kanban } from './pages/Kanban';
import { Platforms } from './pages/Platforms';
import Genome from './pages/Genome';
import { Tasks } from './pages/Tasks';
import { Skills } from './pages/Skills';
import { Settings } from './pages/Settings';

const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/kanban', element: <Kanban /> },
      { path: '/platforms', element: <Platforms /> },
      { path: '/platforms/connect/:providerId', element: <Platforms /> },
      { path: '/genome', element: <Genome /> },
      { path: '/genome/:skillId', element: <Genome /> },
      { path: '/tasks', element: <Tasks /> },
      { path: '/tasks/:taskId', element: <Tasks /> },
      { path: '/skills', element: <Skills /> },
      { path: '/skills/:skillId', element: <Skills /> },
      { path: '/settings', element: <Settings /> },
    ],
  },
];

export const router = createBrowserRouter(routes);