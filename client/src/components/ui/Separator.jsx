function Separator({ orientation = "horizontal", className = "" }) {
  return orientation === "horizontal" ? (
    <div className={`h-px w-full bg-gray-200 ${className}`}></div>
  ) : (
    <div className={`w-px h-full bg-gray-200 ${className}`}></div>
  )
}

export default Separator
