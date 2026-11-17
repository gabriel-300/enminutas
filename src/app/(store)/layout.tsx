import { GoogleAds } from "@/components/marketing/google-ads";
import { SiteShell } from "@/components/site/shell";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <GoogleAds />
      <SiteShell>
        <div className="min-h-screen bg-crema-50">{children}</div>
      </SiteShell>
    </>
  );
}
