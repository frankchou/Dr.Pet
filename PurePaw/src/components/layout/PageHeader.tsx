import Link from 'next/link'

interface PageHeaderProps {
  title: string
  backHref?: string
  rightElement?: React.ReactNode
}

export default function PageHeader({ title, backHref, rightElement }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3">
      <div className="flex items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 text-gray-600"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
        )}
        <h1 className="flex-1 text-lg font-semibold text-[#1a1a2e]">{title}</h1>
        {rightElement && <div>{rightElement}</div>}
      </div>
    </header>
  )
}
