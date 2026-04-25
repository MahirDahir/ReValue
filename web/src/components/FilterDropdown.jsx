import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'

export default function FilterDropdown({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const selected = options.find(o => o.value === value) || options[0]
  const hasValue = value !== '' && value !== undefined

  return (
    <div className="filter-dropdown-wrap" ref={ref}>
      {label && <span className="filter-dropdown-label">{label}</span>}
      <button
        type="button"
        className={`filter-dropdown-btn${open ? ' open' : ''}${hasValue ? ' has-value' : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        <span>{selected.label}</span>
        <span className="filter-dropdown-caret">▼</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="filter-dropdown-menu"
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.13, ease: [0.4, 0, 0.2, 1] }}
          >
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                className={`filter-dropdown-item${opt.value === value ? ' active' : ''}`}
                onClick={() => { onChange(opt.value); setOpen(false) }}
              >
                <span>{opt.label}</span>
                {opt.value === value && (
                  <span className="filter-dropdown-check">✓</span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
