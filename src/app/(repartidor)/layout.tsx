import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Entregas — En Minutas",
  description: "App de repartidores",
};

export default function RepartidorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      {children}
    </div>
  );
}
