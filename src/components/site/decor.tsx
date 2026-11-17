// Decoración de marca: "rayitos" del ícono del logo y círculos (blob).
import s from "@/styles/site.module.css";
import { cn } from "@/lib/utils";

export function Rays({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn(s.rays, className)}>
      <i /><i /><i />
    </span>
  );
}

export function Blob({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <span aria-hidden className={cn(s.blob, className)} style={style} />;
}
