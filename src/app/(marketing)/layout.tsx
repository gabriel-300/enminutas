import { GoogleAds } from "@/components/marketing/google-ads";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <GoogleAds />
      {children}
    </>
  );
}
