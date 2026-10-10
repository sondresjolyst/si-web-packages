/** The widths the API serves an uploaded image at, as webp. */
export const CONTENT_IMAGE_WIDTHS: readonly number[] = [384, 640, 768, 1024, 1366, 1600];

/** Where the browser fetches an uploaded image. Site-relative, through the app's content images rewrite. */
export function contentImagePath(id: string, base = "/content-images"): string {
  return `${base}/${encodeURIComponent(id)}`;
}

/**
 * The `srcset` for an uploaded image. The API serves the nearest webp at or above the requested
 * width, or the original when the browser does not accept webp.
 */
export function contentImageSrcSet(id: string, widths: readonly number[] = CONTENT_IMAGE_WIDTHS, base?: string): string {
  return widths.map(w => `${contentImagePath(id, base)}?w=${w} ${w}w`).join(", ");
}

export interface ContentImageProps {
  /** Uploaded image id. Null falls back to `fallbackSrc`, which is served as it is. */
  imageId: string | null;
  /** Empty for an image that carries no meaning of its own, such as a decorative backdrop. */
  alt: string;
  /** Widths the image is shown at. Required, since a browser assumes 100vw without it. */
  sizes: string;
  /** A static path for when there is no uploaded image. */
  fallbackSrc?: string | undefined;
  className?: string | undefined;
  /** Intrinsic size, to reserve space. Only needed where the layout fixes no ratio. */
  width?: number | undefined;
  height?: number | undefined;
  /** Set on the one image visible without scrolling. It loads eagerly, at high priority. */
  priority?: boolean | undefined;
  "aria-hidden"?: boolean | undefined;
  /** Path the content images rewrite serves, `/content-images` by default. */
  base?: string | undefined;
  /** Widths in the `srcset`. Defaults to the widths the API serves. */
  widths?: readonly number[] | undefined;
}

/** An image from the content API, served responsively from the `sizes` a call site declares. */
export function ContentImage({
  imageId,
  alt,
  sizes,
  fallbackSrc,
  className,
  width,
  height,
  priority = false,
  "aria-hidden": ariaHidden,
  base,
  widths,
}: ContentImageProps) {
  const uploaded = imageId != null && imageId !== "";
  const src = uploaded ? contentImagePath(imageId, base) : fallbackSrc;
  if (!src) return null;

  return (
    // A plain img, because the API already serves the sizes. next/image would resize them again.
    <img
      src={src}
      srcSet={uploaded ? contentImageSrcSet(imageId, widths, base) : undefined}
      sizes={uploaded ? sizes : undefined}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding={priority ? "sync" : "async"}
      aria-hidden={ariaHidden}
    />
  );
}
