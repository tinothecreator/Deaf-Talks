import { requireAccount } from "@/lib/auth/session";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  await requireAccount();
  return children;
}
