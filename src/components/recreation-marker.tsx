import { Marker, Polygon } from 'react-native-maps';
import {
  RECREATION_CATEGORIES,
  RECREATION_MARKER_COLOR,
} from '@/constants/recreation';
import {
  recreationDetails,
  recreationTitle,
  type RecreationArea,
} from '@/utils/recreation';

/** Outlines of areas that came with a shape (only when the map is zoomed in). */
function RecreationOutlines({ areas }: { areas: RecreationArea[] }) {
  return areas.flatMap((a) =>
    (a.polygons ?? []).map((p, i) => {
      const { fill, stroke } = RECREATION_CATEGORIES[a.category];
      return (
        <Polygon
          key={`${a.id}-${i}`}
          coordinates={p.outer}
          holes={p.holes}
          fillColor={fill}
          strokeColor={stroke}
          strokeWidth={1}
          tappable={false}
        />
      );
    })
  );
}

/** Markers (and outlines, when present) for recreation areas on the map tab. */
export default function RecreationMarkers({
  areas,
}: {
  areas: RecreationArea[];
}) {
  return (
    <>
      <RecreationOutlines areas={areas} />
      {areas.map((a) => (
        <Marker
          key={a.id}
          coordinate={{ latitude: a.latitude, longitude: a.longitude }}
          title={recreationTitle(a)}
          description={recreationDetails(a) || undefined}
          pinColor={RECREATION_MARKER_COLOR}
        />
      ))}
    </>
  );
}
