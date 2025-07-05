function Avatar({
  src,
  alt,
  size = 'md',
  fallback,
  status,
  className = ''
}) {
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl'
  };

  const statusColors = {
    online: 'bg-green-400',
    offline: 'bg-gray-400',
    busy: 'bg-red-400',
    away: 'bg-yellow-400'
  };

  const getFallbackText = () => {
    if (fallback) return fallback;
    if (alt) {
      const names = alt.split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`;
      }
      return alt[0];
    }
    return '?';
  };

  return (
    <div className="relative inline-block">
      <div
        className={`
          ${sizes[size]}
          rounded-full
          overflow-hidden
          flex
          items-center
          justify-center
          bg-primary-100
          ${className}
        `}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className={`
            ${sizes[size]}
            items-center
            justify-center
            text-primary-600
            font-medium
            ${src ? 'hidden' : 'flex'}
          `}
        >
          {getFallbackText()}
        </div>
      </div>
      {status && (
        <span
          className={`
            absolute
            bottom-0
            right-0
            block
            h-2.5
            w-2.5
            rounded-full
            ring-2
            ring-white
            ${statusColors[status]}
          `}
        />
      )}
    </div>
  );
}

export default Avatar;