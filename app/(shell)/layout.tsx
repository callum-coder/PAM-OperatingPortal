import Link from "next/link";
import { Activity, Bot, Menu, ShieldCheck } from "lucide-react";

import { NavLink } from "./nav-link";

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
      <aside className="fixed inset-y-0 left-0 hidden w-72 overflow-y-auto border-r border-[#e6e8ef] bg-[#ffffff] px-5 py-6 lg:block">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-md bg-[#1a1a2e] text-[#2ec4a0]">
            <Activity size={20} />
          </span>
          <span>
            <span className="block text-sm font-semibold uppercase text-[#5b6472]">
              PAM
            </span>
            <span className="block text-lg font-semibold">Operating Portal</span>
          </span>
        </Link>

        <nav className="mt-10 space-y-8">
          <div>
            <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-wider text-[#8b94a3]">
              Command
            </p>
            <NavLink className="portal-nav-link" href="/dashboard">
              <Activity size={18} />
              Dashboard
            </NavLink>
            {hasPermission(user.roles, "gtm.briefs.read") ? (
              <NavLink className="portal-nav-link" href="/ai-team">
                <Bot size={18} />
                AI Team
              </NavLink>
            ) : null}
          </div>

          {moduleNav.map((module) => (
            <div key={module.id}>
              <p className="mb-3 flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-wider text-[#8b94a3]">
                <module.icon size={14} />
                {module.label}
              </p>
              <div className="space-y-1">
                {module.nav
                  .filter((item) => hasPermission(user.roles, item.requiredPermission))
                  .map((item) => (
                    <NavLink className="portal-nav-link" href={item.href} key={item.href}>
                      <item.icon size={18} />
                      {item.label}
                    </NavLink>
                  ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-[#e6e8ef] bg-white/90 px-5 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <details className="portal-mobile-nav relative lg:hidden">
              <summary className="flex items-center gap-2 font-semibold">
                <Menu size={18} />
                PAM Ops
              </summary>
              <div className="portal-mobile-nav-panel absolute left-0 top-full mt-2 hidden w-72 rounded-xl border border-[#e6e8ef] bg-white p-3 shadow-lg">
                <NavLink className="portal-nav-link" href="/dashboard"><Activity size={18} />Dashboard</NavLink>
                {hasPermission(user.roles, "gtm.briefs.read") ? <NavLink className="portal-nav-link" href="/ai-team"><Bot size={18} />AI Team</NavLink> : null}
                {moduleNav.map((module) => (
                  <div key={module.id} className="mt-2 border-t border-[#eef0f4] pt-2">
                    <p className="mb-1 px-3 text-[0.65rem] font-semibold uppercase tracking-wider text-[#8b94a3]">{module.label}</p>
                    {module.nav.filter((item) => hasPermission(user.roles, item.requiredPermission)).map((item) => (
                      <NavLink className="portal-nav-link" href={item.href} key={item.href}><item.icon size={18} />{item.label}</NavLink>
                    ))}
                  </div>
                ))}
              </div>
            </details>
            <div className="hidden items-center gap-2 text-sm text-[#5b6472] lg:flex">
              <ShieldCheck size={16} />
              Shell-enforced RBAC
            </div>
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-medium">
                {user.displayName ?? user.email}
              </p>
              <p className="truncate text-xs uppercase text-[#8b94a3]">
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
