import Link from "next/link";
import { Activity, Bot, ShieldCheck } from "lucide-react";

import { hasPermission } from "@/lib/rbac/permissions";
import { requireUser } from "@/lib/rbac/guard";
import { modules } from "@/modules/registry";

export const dynamic = "force-dynamic";

export default async function ShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();

  const moduleNav = modules.filter((module) =>
    hasPermission(user.roles, module.requiredPermission),
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-[#d8ded0] bg-[#fbfcf7] px-5 py-6 lg:block">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-md bg-[#162016] text-[#d9ff73]">
            <Activity size={20} />
          </span>
          <span>
            <span className="block text-sm font-semibold uppercase text-[#5f6d58]">
              PAM
            </span>
            <span className="block text-lg font-semibold">Operating Portal</span>
          </span>
        </Link>

        <nav className="mt-10 space-y-8">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase text-[#6c7865]">
              Command
            </p>
            <Link className="portal-nav-link" href="/dashboard">
              <Activity size={18} />
              Dashboard
            </Link>
            {hasPermission(user.roles, "gtm.briefs.read") ? (
              <Link className="portal-nav-link" href="/ai-team">
                <Bot size={18} />
                AI Team
              </Link>
            ) : null}
          </div>

          {moduleNav.map((module) => (
            <div key={module.id}>
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-[#6c7865]">
                <module.icon size={14} />
                {module.label}
              </p>
              <div className="space-y-1">
                {module.nav
                  .filter((item) => hasPermission(user.roles, item.requiredPermission))
                  .map((item) => (
                    <Link className="portal-nav-link" href={item.href} key={item.href}>
                      <item.icon size={18} />
                      {item.label}
                    </Link>
                  ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-[#d8ded0] bg-[#f4f5f1]/90 px-5 py-4 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <Link href="/dashboard" className="font-semibold lg:hidden">
              PAM Ops
            </Link>
            <div className="hidden items-center gap-2 text-sm text-[#5e6958] lg:flex">
              <ShieldCheck size={16} />
              Shell-enforced RBAC
            </div>
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-medium">
                {user.displayName ?? user.email}
              </p>
              <p className="truncate text-xs uppercase text-[#6c7865]">
                {user.roles.join(", ") || "no role"}
              </p>
            </div>
          </div>
        </header>
        <main className="px-5 py-6 sm:px-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
