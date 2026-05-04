function Card({ children, className = "" }) {
  return <div className={`backdrop-brightness-75 rounded-lg shadow-sm ${className}`}>{children}</div>
}

function CardHeader({ children, className = "" }) {
  return <div className={`p-4 ${className}`}>{children}</div>
}

function CardTitle({ children, className = "" }) {
  return <h3 className={`text-lg font-semibold text-gray-200 ${className}`}>{children}</h3>
}

function CardDescription({ children, className = "" }) {
  return <p className={`text-sm text-gray-500 mt-1 ${className}`}>{children}</p>
}

function CardContent({ children, className = "" }) {
  return <div className={`p-4 ${className}`}>{children}</div>
}

function CardFooter({ children, className = "" }) {
  return <div className={`p-4 ${className}`}>{children}</div>
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
