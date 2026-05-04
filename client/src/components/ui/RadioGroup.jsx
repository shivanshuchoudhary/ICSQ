"use client"

import { createContext, useContext } from "react"

const RadioContext = createContext(null)

function RadioGroup({ value, onValueChange, children, className = "" }) {
  return (
    <RadioContext.Provider value={{ value, onValueChange }}>
      <div className={`flex flex-col space-y-2 ${className}`}>{children}</div>
    </RadioContext.Provider>
  )
}

function RadioItem({ value, id, children, className = "" }) {
  const context = useContext(RadioContext)

  if (!context) {
    throw new Error("RadioItem must be used within a RadioGroup")
  }

  const { value: selectedValue, onValueChange } = context
  const checked = selectedValue === value

  return (
    <div className={`flex items-center ${className}`}>
      <input
        type="radio"
        id={id}
        value={value}
        checked={checked}
        onChange={() => onValueChange(value)}
        className="h-4 w-4 text-[#83725E] border-gray-300 focus:ring-[#a48d6e]"
      />
      <label htmlFor={id} className="ml-2 block text-sm text-gray-700">
        {children}
      </label>
    </div>
  )
}

export { RadioGroup, RadioItem }
