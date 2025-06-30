import React from 'react';

interface LogoProps {
  size?: number;
}

const Logo: React.FC<LogoProps> = ({ size = 48 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Declutter Cloud Logo"
    >
      <defs>
        <linearGradient id="cloudGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#60A5FA', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#3B82F6', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <g>
        {/* Cloud Shape */}
        <path
          d="M47.7,21.9c-1.2-5.9-6.3-10.4-12.6-10.4c-2.8,0-5.3,0.9-7.5,2.4c-2.9-2.5-6.7-4-10.8-4C9,9.9,3.5,15.4,3.5,23 c0,0.8,0.1,1.7,0.2,2.5C1.5,26.8,0,29.3,0,32.2c0,4.6,3.7,8.3,8.3,8.3h39.4c4.6,0,8.3-3.7,8.3-8.3C56,26.6,52.5,22.6,47.7,21.9z"
          fill="url(#cloudGradient)"
        />
        {/* Sparkle */}
        <path
          d="M32 23c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 5l-1.4 1.4c-.8.8-.8 2 0 2.8l1.4 1.4c.8.8 2 .8 2.8 0l1.4-1.4c.8-.8.8-2 0-2.8l-1.4-1.4c-.8-.8-2-.8-2.8 0zm12 0l-1.4 1.4c-.8.8-.8 2 0 2.8l1.4 1.4c.8.8 2 .8 2.8 0l1.4-1.4c.8-.8.8-2 0-2.8l-1.4-1.4c-.8-.8-2-.8-2.8 0z"
          fill="#FFFFFF"
        />
        <path
          d="M32 20l-1 2-2 1 2 1 1 2 1-2 2-1-2-1-1-2z"
          fill="#FBBF24"
        />
      </g>
    </svg>
  );
};

export default Logo; 