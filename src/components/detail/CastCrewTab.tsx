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
    <div className="space-y-6">
      {/* Key Crew */}
      {(directors.length > 0 || writers.length > 0 || producers.length > 0 || composers.length > 0) && (
        <div>
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Crew</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Top Billed Cast</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
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
    <div className="bg-surface-raised rounded-lg p-3">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="text-sm font-medium">{names.join(', ') || 'Unknown'}</p>
    </div>
  );
}

function PersonCard({ member }: { member: TMDBCastMember }) {
  const photo = profileUrl(member.profile_path, 'w185');
  return (
    <div className="bg-surface-raised rounded-lg overflow-hidden">
      <div className="aspect-[2/3] bg-surface-overlay">
        {photo ? (
          <img src={photo} alt={member.name} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl text-text-muted">👤</div>
        )}
      </div>
      <div className="p-2">
        <p className="text-xs font-semibold truncate">{member.name}</p>
        <p className="text-xs text-text-muted truncate">{member.character}</p>
      </div>
    </div>
  );
}
