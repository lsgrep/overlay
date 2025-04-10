import React from 'react';

interface LoadingDotsProps {
  /**
   * Optional className to add to the container
   */
  className?: string;

  /**
   * Color of the dots, defaults to muted-foreground/50
   */
  color?: string;

  /**
   * Size of the dots in pixels, defaults to 6px
   */
  size?: number;

  /**
   * Spacing between dots, defaults to 4px
   */
  spacing?: number;
}

export const LoadingDots: React.FC<LoadingDotsProps> = ({
  className = '',
  color = 'bg-muted-foreground/50',
  size = 6,
  spacing = 4,
}) => {
  const dotStyle = {
    width: `${size}px`,
    height: `${size}px`,
    marginRight: `${spacing}px`,
  };

  // Remove margin from the last dot
  const lastDotStyle = {
    ...dotStyle,
    marginRight: 0,
  };

  return (
    <div className={`flex items-center justify-center mt-2 ${className}`}>
      <div className={`${color} rounded-full animate-bounce`} style={{ ...dotStyle, animationDelay: '0ms' }} />
      <div className={`${color} rounded-full animate-bounce`} style={{ ...dotStyle, animationDelay: '200ms' }} />
      <div className={`${color} rounded-full animate-bounce`} style={{ ...lastDotStyle, animationDelay: '400ms' }} />
    </div>
  );
};

export default LoadingDots;
