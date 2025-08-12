import React from 'react';

/**
 * EyeIcon SVG component.
 * PUBLIC_INTERFACE
 * Renders an eye icon, typically used to indicate viewer count or visibility.
 * @param {React.SVGProps<SVGSVGElement>} props
 */
export const EyeIcon = (props) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7Zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-2.5A2.5 2.5 0 1 0 12 9a2.5 2.5 0 0 0 0 5Z" fill="currentColor"/>
  </svg>
);

/**
 * SunIcon SVG component.
 * PUBLIC_INTERFACE
 * Renders a sun icon for light theme indication.
 * @param {React.SVGProps<SVGSVGElement>} props
 */
export const SunIcon = (props) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.8 1.42-1.42ZM1 13h3v-2H1v2Zm10 10h2v-3h-2v3Zm8.66-4.95 1.41-1.41-1.79-1.8-1.41 1.42 1.79 1.79ZM20 11v2h3v-2h-3ZM4.96 18.36l1.41 1.41 1.8-1.79-1.42-1.41-1.79 1.79ZM11 1v3h2V1h-2Zm1 6a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" fill="currentColor"/>
  </svg>
);

/**
 * MoonIcon SVG component.
 * PUBLIC_INTERFACE
 * Renders a moon icon for dark theme indication.
 * @param {React.SVGProps<SVGSVGElement>} props
 */
export const MoonIcon = (props) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M12.43 2.3A9 9 0 1 0 21.7 11.57 7 7 0 0 1 12.43 2.3Z" fill="currentColor"/>
  </svg>
);
