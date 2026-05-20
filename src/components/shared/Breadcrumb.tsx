import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

type Crumb = {
  label: string;
  href?: string;
};

type Props = {
  items: Crumb[];
};

export function Breadcrumb({ items }: Props) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-[var(--crm-neutral-500)] flex-wrap">
      <Link href="/dashboard" className="hover:text-[var(--crm-neutral-800)] transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3 text-[var(--crm-neutral-300)]" />
            {isLast || !item.href ? (
              <span className={isLast ? "text-[var(--crm-neutral-900)] dark:text-white font-medium truncate max-w-[200px]" : ""}>
                {item.label}
              </span>
            ) : (
              <Link href={item.href} className="hover:text-[var(--crm-neutral-800)] transition-colors">
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
