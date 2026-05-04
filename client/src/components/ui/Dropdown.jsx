"use client"

import { useState, useRef, useEffect } from "react"

function Dropdown({ trigger, items, align = "right" }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const toggleDropdown = () => setIsOpen(!isOpen)

  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setIsOpen(false)
    }
  }

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const alignmentClasses = {
    left: "left-0",
    right: "right-0",
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={toggleDropdown} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          className={`absolute z-10 mt-2 w-48 bg-[#29252c] rounded-md shadow-lg overflow-hidden border border-gray-400 ${
            alignmentClasses[align]
          }`}
        >
          <div className="py-1">
            {items.map((item, index) => {
              if (item.type === "separator") {
                return <div key={index} className="border-t border-gray-400 my-1"></div>
              }

              if (item.type === "label") {
                return (
                  <div key={index} className="px-4 py-2 text-sm text-gray-200">
                    {item.label}
                  </div>
                )
              }

              return (
                <button
                  key={index}
                  className="flex w-full items-center px-4 py-2 text-sm text-gray-200 hover:backdrop-brightness-150"
                  onClick={() => {
                    setIsOpen(false)
                    item.onClick && item.onClick()
                  }}
                >
                  {item.icon}
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default Dropdown
