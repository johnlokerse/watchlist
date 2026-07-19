import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppShell from './components/layout/AppShell';
import MediaPage from './pages/MediaPage';
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

function LegacyMediaRedirect({ view }: { view: 'library' | 'upcoming' }) {
  const [searchParams] = useSearchParams();
  const path = searchParams.get('tab') === 'series' ? '/series' : '/movies';
  return <Navigate to={view === 'upcoming' ? `${path}?view=upcoming` : path} replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/movies" replace />} />
        <Route path="/movies" element={<MediaPage contentType="movie" />} />
        <Route path="/series" element={<MediaPage contentType="series" />} />
        <Route path="/library" element={<LegacyMediaRedirect view="library" />} />
        <Route path="/upcoming" element={<LegacyMediaRedirect view="upcoming" />} />
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
