/** The car wash icon (a wash gate over a foamy car), used wherever a wash is shown on the booking site. */
export default function CarWashMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/car-wash-icon.webp" alt="" width={256} height={256} decoding="async" className={`shrink-0 rounded-xl bg-black object-cover ${className}`} />
  );
}
