import React from "react"

function Avatar({ children, className = "" }) {
  return <div className={`relative h-10 w-10 rounded-full overflow-hidden ${className}`}>{children}</div>
}

function AvatarImage({ src, alt, className = "" }) {
  const [error, setError] = React.useState(false)

  return !error ? (
    <img
      src={src || "/placeholder.svg"}
      alt={alt}
      className={`h-full w-full object-cover ${className}`}
      onError={() => setError(true)}
    />
  ) : null
}

function AvatarFallback({ children, className = "" }) {
  return (
    <div
      className={`absolute inset-0 bg-gray-200 flex items-center justify-center text-gray-700 font-medium ${className}`}
    >
      {children}
    </div>
  )
}

export { Avatar, AvatarImage, AvatarFallback }
