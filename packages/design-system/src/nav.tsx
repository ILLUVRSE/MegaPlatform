import * as React from "react";

export type NavItem = {
  current?: boolean;
  href: string;
  label: string;
};

export function Nav({ items, label }: { items: NavItem[]; label: string }) {
  return (
    <nav aria-label={label} className="ds-nav">
      <ul className="ds-nav-list">
        {items.map((item) => (
          <li key={item.href}>
            <a className="ds-nav-link" aria-current={item.current ? "page" : undefined} href={item.href}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
