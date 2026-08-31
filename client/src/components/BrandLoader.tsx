import './BrandLoader.css';

type BrandLoaderVariant = 'page' | 'section' | 'inline' | 'button';

interface BrandLoaderProps {
  variant?: BrandLoaderVariant;
  label?: string;
  className?: string;
}

export default function BrandLoader({
  variant = 'section',
  label = 'Cargando...',
  className = '',
}: BrandLoaderProps) {
  const classes = `brand-loader brand-loader--${variant}${className ? ` ${className}` : ''}`;

  return (
    <div className={classes} role="status" aria-live="polite" aria-label={label}>
      <span className="brand-loader__visual" aria-hidden="true">
        <img src="/loading-flame.png" alt="" className="brand-loader__flame" />
      </span>
      {label && <span className="brand-loader__label">{label}</span>}
    </div>
  );
}
