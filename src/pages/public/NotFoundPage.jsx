import { Link } from 'react-router-dom'
import { ArrowLeft, Zap } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mb-6">
        <Zap className="w-8 h-8 text-primary-600" />
      </div>
      <h1 className="text-7xl font-black text-gray-200 mb-2">404</h1>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">Page Not Found</h2>
      <p className="text-gray-500 max-w-sm mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="btn-primary gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>
    </div>
  )
}
