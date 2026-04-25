import { useState, useRef, useEffect } from 'react'

export default function FilterDropdown({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selected = options.find(o => o.value === value) || options[0]

  return (
    <div className="filter-dropdown-wrap" ref={ref}>
      <span className="filter-dropdown-label">{label}</span>
      <button
        className={`filter-dropdown-btn${open ? ' open' : ''}`}
        onClick={() => setOpen(v => !v)}
        type="button"
      >
        <span>{selected.label}</span>
        <span className="filter-dropdown-caret">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="filter-dropdown-menu">
          {options.map(opt => (
            <button
              key={opt.value}
              className={`filter-dropdown-item${opt.value === value ? ' active' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              type="button"
            >
              {opt.label}
              {opt.value === value && <span className="filter-dropdown-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
