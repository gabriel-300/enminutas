import { GoogleAds } from "@/components/marketing/google-ads";
import { SiteShell } from "@/components/site/shell";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <GoogleAds />
      <SiteShell>{children}</SiteShell>
    </>
  );
}
