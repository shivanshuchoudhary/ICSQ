"use client"

import { createContext, useContext, useState } from "react"

const TabsContext = createContext(null)

function Tabs({ defaultValue, value, onValueChange, children, className = "" }) {
  const [internalActiveTab, setInternalActiveTab] = useState(defaultValue);

  // Use controlled value if provided, otherwise use internal state
  const activeTab = value !== undefined ? value : internalActiveTab;
  const setActiveTab = (tab) => {
    if (onValueChange) onValueChange(tab);
    if (value === undefined) setInternalActiveTab(tab);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

function TabsList({ children, className = "" }) {
  return <div className={`flex space-x-1 border-b border-gray-200 ${className}`}>{children}</div>
}

function TabsTrigger({ value, children, className = "" }) {
  const { activeTab, setActiveTab } = useContext(TabsContext)
  const isActive = activeTab === value

  return (
    <button
      className={className}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  )
}

function TabsContent({ value, children, className = "" }) {
  const { activeTab } = useContext(TabsContext)

  if (activeTab !== value) return null

  return <div className={`py-4 ${className}`}>{children}</div>
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
