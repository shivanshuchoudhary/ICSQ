"use client"

import React, { useState, useRef, useEffect } from "react"

function DropdownMenu({ children }) {
  return <div className="relative inline-block text-left">{children}</div>
}

function DropdownMenuTrigger({ children, asChild }) {
  const child = asChild ? React.Children.only(children) : <button>{children}</button>
  return child
}

function DropdownMenuContent({ children, align = "end", className = "" }) {
  const alignClasses = {
    start: "left-0",
    end: "right-0",
  }

  return (
    <div
      className={`absolute z-10 mt-2 w-56 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none ${
        alignClasses[align]
      } ${className}`}
    >
      <div className="py-1">{children}</div>
    </div>
  )
}

function DropdownMenuItem({ children, onClick, className = "" }) {
  return (
    <button
      className={`flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function DropdownMenuLabel({ children, className = "" }) {
  return <div className={`px-4 py-2 text-sm text-gray-700 ${className}`}>{children}</div>
}

function DropdownMenuSeparator({ className = "" }) {
  return <div className={`border-t border-gray-200 my-1 ${className}`}></div>
}

// Combined component with state management
function Dropdown({ trigger, items, align = "end" }) {
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

  return (
    <DropdownMenu>
      <div onClick={toggleDropdown} ref={dropdownRef}>
        {trigger}
      </div>
      {isOpen && (
        <DropdownMenuContent align={align}>
          {items.map((item, index) => {
            if (item.type === "separator") {
              return <DropdownMenuSeparator key={index} />
            }

            if (item.type === "label") {
              return <DropdownMenuLabel key={index}>{item.label}</DropdownMenuLabel>
            }

            return (
              <DropdownMenuItem
                key={index}
                onClick={() => {
                  setIsOpen(false)
                  item.onClick && item.onClick()
                }}
              >
                {item.icon}
                {item.label}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  )
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  Dropdown,
}
