import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-10 flex justify-center">
          <Logo />
        </Link>
        {children}
        <p className="meta mt-10 text-center">
          Elenos · Software studio · Remote / USA
        </p>
      </div>
    </div>
  );
}
