"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

/** A nav Link that marks itself aria-current when the route is under it. */
export function NavLink({ href, ...rest }: ComponentProps<typeof Link> & { href: string }) {
  const pathname = usePathname();
  const active = href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return <Link href={href} aria-current={active ? "page" : undefined} {...rest} />;
}
