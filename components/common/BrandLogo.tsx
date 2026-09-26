type BrandLogoProps = {
  /** Ukuran kotak logo dalam tailwind spacing (8 = 32px, 9 = 36px). */
  size?: 8 | 9;
};

/**
 * Logo "Cap": huruf C tebal + titik amber sebagai "tinta cap".
 * Monokrom seperti aplikasi, amber hanya untuk titik tinta.
 */
export default function BrandLogo({ size = 8 }: BrandLogoProps) {
  const box = size === 9 ? "h-9 w-9" : "h-8 w-8";
  const letter = size === 9 ? "text-xl" : "text-lg";
  return (
    <div
      aria-hidden
      className={`relative flex ${box} shrink-0 items-center justify-center rounded-lg bg-white`}
    >
      <span className={`${letter} font-black tracking-tighter text-black`}>
        C
      </span>
      <span className="absolute right-1 bottom-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
    </div>
  );
}
