import React from 'react';

/**
 * SegmentedControl renders a two or more option toggle.
 * PUBLIC_INTERFACE
 * @param {{options: {id:string,label:string}[], value: string, onChange: (id:string)=>void}} props
 * @returns JSX.Element
 */
export default function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="segmented" role="tablist" aria-label="Panel options">
      {options.map(opt => (
        <button
          key={opt.id}
          role="tab"
          aria-selected={opt.id === value}
          className="small"
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
