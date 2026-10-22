import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { GoogleAds } from "@/components/marketing/google-ads";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <GoogleAds />
      <Navbar />
      <main className="min-h-screen bg-crema-50">{children}</main>
      <Footer />
    </>
  );
}
