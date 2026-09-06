import { publicUrl } from "../lib/assets";

export function BrandMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <img
      src={publicUrl("favicon.svg")}
      alt=""
      width={32}
      height={32}
      className={className}
    />
  );
}
