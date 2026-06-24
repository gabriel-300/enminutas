import { redirect } from "next/navigation";

export default function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  void searchParams;
  redirect("/admin/clientes-b2b");
}
