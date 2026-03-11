import type { ReactNode } from "react";
import { TYPOGRAPHY_CLASS } from "@/lib/ui/typography";

type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  className?: string;
};

export default function SectionHeader({ eyebrow, title, description, className = "" }: SectionHeaderProps) {
  return (
    <header className={`space-y-2 ${className}`.trim()}>
      <p className={`${TYPOGRAPHY_CLASS.eyebrow} text-illuvrse-muted`}>{eyebrow}</p>
      <h2 className={TYPOGRAPHY_CLASS.titleSection}>{title}</h2>
      {description ? <p className={TYPOGRAPHY_CLASS.body}>{description}</p> : null}
    </header>
  );
}
