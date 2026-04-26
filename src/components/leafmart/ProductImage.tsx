import Image from "next/image";
import { ProductSilhouette } from "./ProductSilhouette";

type Shape = "bottle" | "can" | "jar" | "tin" | "serum" | "box";

interface ProductImageProps {
  src?: string | null;
  alt: string;
  shape: Shape;
  bg: string;
  deep: string;
  height?: number;
  big?: boolean;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

/**
 * Renders a real product photo when available, otherwise the abstract
 * ProductSilhouette stand-in. Both render at the same height so swaps are
 * non-jarring.
 */
export function ProductImage({
  src,
  alt,
  shape,
  bg,
  deep,
  height = 280,
  big = false,
  className,
  priority = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw",
}: ProductImageProps) {
  if (!src) {
    return (
      <ProductSilhouette
        shape={shape}
        bg={bg}
        deep={deep}
        height={height}
        big={big}
        className={className}
      />
    );
  }
  return (
    <div
      className={className}
      style={{
        backgroundImage: `linear-gradient(180deg, ${bg} 0%, color-mix(in srgb, ${bg} 82%, ${deep}) 100%)`,
        backgroundColor: bg,
        borderRadius: 28,
        position: "relative",
        overflow: "hidden",
        height,
      }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        style={{ objectFit: "contain", padding: "0 24px" }}
      />
    </div>
  );
}
