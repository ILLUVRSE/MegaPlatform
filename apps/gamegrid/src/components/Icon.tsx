import iconManifest from '../assets/icons/manifest.json';

interface IconProps {
  name: keyof typeof iconManifest | string;
  className?: string;
  label?: string;
}

export function Icon({ name, className, label }: IconProps) {
  const symbol = iconManifest[name as keyof typeof iconManifest] ?? `icon-${name}`;
  return (
    <svg className={className} aria-hidden={label ? undefined : 'true'} role={label ? 'img' : undefined} aria-label={label}>
      <use href={`/icons/sprite.svg#${symbol}`} />
    </svg>
  );
}

