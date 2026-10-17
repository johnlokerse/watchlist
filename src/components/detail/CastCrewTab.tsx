import type { TMDBCastMember, TMDBCrewMember } from '../../api/types';
import { profileUrl } from '../../utils/image';

interface Props {
  cast: TMDBCastMember[];
  crew: TMDBCrewMember[];
}

export default function CastCrewTab({ cast, crew }: Props) {
  const directors = crew.filter((c) => c.job === 'Director');
  const writers = crew.filter((c) => ['Writer', 'Screenplay'].includes(c.job));
  const producers = crew.filter((c) => c.job === 'Producer').slice(0, 4);
  const composers = crew.filter((c) => c.job === 'Original Music Composer');
  const topCast = cast.slice(0, 12);

  return (
    <div className="space-y-8">
      {/* Key Crew */}
      {(directors.length > 0 || writers.length > 0 || producers.length > 0 || composers.length > 0) && (
        <div>
          <h3 className="section-title mb-3 px-1">Crew</h3>
          <div className="grouped grid grid-cols-2 md:grid-cols-4 [&>*+*]:before:hidden">
            {directors.length > 0 && (
              <CrewBlock label="Director" names={directors.map((d) => d.name)} />
            )}
            {writers.length > 0 && (
              <CrewBlock label="Writer" names={writers.map((w) => w.name)} />
            )}
            {producers.length > 0 && (
              <CrewBlock label="Producer" names={producers.map((p) => p.name)} />
            )}
            {composers.length > 0 && (
              <CrewBlock label="Composer" names={composers.map((c) => c.name)} />
            )}
          </div>
        </div>
      )}

      {/* Cast */}
      {topCast.length > 0 && (
        <div>
          <h3 className="section-title mb-3 px-1">Top Billed Cast</h3>
          <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {topCast.map((member) => (
              <PersonCard key={member.id} member={member} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CrewBlock({ label, names }: { label: string; names: string[] }) {
  return (
    <div className="px-4 py-3">
      <p className="t-label mb-1">{label}</p>
      <p className="t-callout font-semibold text-text-primary">{names.join(', ') || 'Unknown'}</p>
    </div>
  );
}

function PersonCard({ member }: { member: TMDBCastMember }) {
  const photo = profileUrl(member.profile_path, 'w185');
  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-full bg-surface-overlay ring-1 ring-inset ring-hairline">
        {photo ? (
          <img src={photo} alt={member.name} loading="lazy" className="h-full w-full object-cover object-top" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-muted">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21a8 8 0 0 0-16 0" />
              <circle cx="12" cy="8" r="4" />
            </svg>
          </div>
        )}
      </div>
      <div className="pt-2 text-center">
        <p className="truncate text-[0.8125rem] font-semibold text-text-primary">{member.name}</p>
        <p className="t-caption truncate">{member.character}</p>
      </div>
    </div>
  );
}
