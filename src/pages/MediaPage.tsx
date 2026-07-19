import { useSearchParams } from 'react-router-dom';
import type { ContentType } from '../db/models';
import SegmentedControl from '../components/ui/SegmentedControl';
import LibraryPage from './LibraryPage';
import UpcomingPage from './UpcomingPage';

type MediaView = 'library' | 'upcoming';

interface Props {
  contentType: ContentType;
}

export default function MediaPage({ contentType }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const view: MediaView = searchParams.get('view') === 'upcoming' ? 'upcoming' : 'library';
  const title = contentType === 'movie' ? 'Movies' : 'Series';

  const setView = (nextView: MediaView) => {
    setSearchParams(nextView === 'upcoming' ? { view: 'upcoming' } : {});
  };

  return (
    <div className="space-y-6">
      <div className="relative z-40 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="page-title">{title}</h1>
        <SegmentedControl
          options={[
            { value: 'library', label: 'Library' },
            { value: 'upcoming', label: 'Upcoming' },
          ]}
          value={view}
          onChange={(value) => setView(value as MediaView)}
          ariaLabel={`${title} view`}
        />
      </div>

      <div role="tabpanel" aria-label={`${title} ${view}`}>
        {view === 'library' ? (
          <LibraryPage contentType={contentType} />
        ) : (
          <UpcomingPage contentType={contentType} />
        )}
      </div>
    </div>
  );
}
