"use client";

// Plain <img> that removes itself if the file 404s, so the store looks intact
// before /logo-mark.png and /logo.png are added (no broken-image glyph). next/image
// static import would break the build until the files exist — this won't.
// ponytail: onError hide, not a placeholder system — text lockup is the real fallback.
export function BrandLogo({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}
