export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="system-skin min-h-screen bg-crema-50 flex items-center justify-center px-4">
      {children}
    </div>
  );
}
