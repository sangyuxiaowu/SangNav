import React, { useEffect, useState } from 'react';
import { getCachedFavicon } from '../services/faviconDb';

interface CachedFaviconProps {
  src: string;
  className?: string;
  fallback?: React.ReactNode;
}

export const CachedFavicon: React.FC<CachedFaviconProps> = ({ src, className, fallback = null }) => {
  const [image, setImage] = useState<{ source: string; objectUrl: string } | null>(null);
  const [failedSource, setFailedSource] = useState<string | null>(null);

  useEffect(() => {
    if (!src) return;
    let active = true;
    let objectUrl: string | undefined;
    void getCachedFavicon(src).then((blob) => {
      if (!active) return;
      if (blob) objectUrl = URL.createObjectURL(blob);
      setImage({ source: src, objectUrl: objectUrl || src });
      setFailedSource(null);
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (!src || image?.source !== src || failedSource === src) return <>{fallback}</>;

  return (
    <img
      src={image.objectUrl}
      alt=""
      className={className}
      onError={() => setFailedSource(src)}
    />
  );
};