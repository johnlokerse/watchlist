import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppShell from './components/layout/AppShell';
import UpcomingPage from './pages/UpcomingPage';
import LibraryPage from './pages/LibraryPage';
import DiscoverPage from './pages/DiscoverPage';
import SettingsPage from './pages/SettingsPage';
import MovieDetailPage from './pages/MovieDetailPage';
import SeriesDetailPage from './pages/SeriesDetailPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/upcoming" replace />} />
            <Route path="/upcoming" element={<UpcomingPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/movie/:id" element={<MovieDetailPage />} />
            <Route path="/series/:id" element={<SeriesDetailPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
