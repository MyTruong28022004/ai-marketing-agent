import React from 'react'

export default function BrandIcon({ icon, size = 16, title }) {
  return <svg
    aria-hidden={title ? undefined : 'true'}
    aria-label={title}
    role={title ? 'img' : undefined}
    focusable="false"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
  >
    {title && <title>{title}</title>}
    <path d={icon.path}/>
  </svg>
}
