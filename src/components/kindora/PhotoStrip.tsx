import { useQuery } from "@tanstack/react-query";

import { resolvePhotoUrls } from "@/lib/actions";

export function PhotoStrip({ photos, title }: { photos: string[]; title: string }) {
  const { data } = useQuery({
    queryKey: ["photo-urls", photos],
    enabled: photos.length > 0,
    staleTime: 30 * 60 * 1000,
    queryFn: () => resolvePhotoUrls(photos),
  });

  if (!photos.length) return null;

  return (
    <div className="grid grid-cols-2 gap-3">
      {(data ?? photos.map(() => "")).map((url, index) => (
        <div key={index} className="overflow-hidden rounded-2xl bg-secondary">
          {url ? (
            <img src={url} alt={`${title} — photo ${index + 1}`} loading="lazy" className="h-40 w-full object-cover" />
          ) : (
            <div className="h-40 w-full animate-pulse" />
          )}
        </div>
      ))}
    </div>
  );
}
