interface Props {
  icon: string
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="text-center py-14 px-4">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="font-serif text-base text-ink-2 mb-1">{title}</div>
      {description && <div className="text-sm text-ink-3 mb-5">{description}</div>}
      {action && (
        <button
          onClick={action.onClick}
          className="bg-accent hover:bg-accent-dark text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
