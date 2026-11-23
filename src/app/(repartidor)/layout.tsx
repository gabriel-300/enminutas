import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Entregas — En Minutas",
  description: "App de repartidores",
};

export default function RepartidorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-n-50">
      {children}
    </div>
  );
}
