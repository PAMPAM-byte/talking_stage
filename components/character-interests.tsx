import { Badge } from './ui/primitives';

const artists = ['Asake', 'Olamide', 'Davido', 'Wizkid'];

export function CharacterInterests({ interests }: { interests: string[] }) {
  const favourites = artists.filter(artist => interests.some(interest => interest.toLowerCase() === artist.toLowerCase()));
  const otherInterests = interests.filter(interest => !artists.some(artist => artist.toLowerCase() === interest.toLowerCase()));
  return <div className="stack">
    {otherInterests.length > 0 && <section className="stack" aria-label="Interests">
      <h2 className="supporting">Interests</h2>
      <div className="row">{otherInterests.map(interest => <Badge key={interest}>{interest}</Badge>)}</div>
    </section>}
    {favourites.length > 0 && <section className="stack" aria-label="Favourite artists">
      <h2 className="supporting">On repeat</h2>
      <div className="row">{favourites.map(artist => <Badge key={artist}>{artist}</Badge>)}</div>
    </section>}
  </div>;
}
