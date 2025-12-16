interface PackInfoProps {
  className?: string
  packTitle: string
  labels: {
    games: string
    teams: string
  }
}

export function PackInfo({ className, packTitle, labels }: PackInfoProps) {
  return (
    <div className={className}>
      <h1 className="text-2xl font-bold mb-2">
        {packTitle}
      </h1>
      <div className="text-sm text-muted-foreground">{labels.games}</div>
      <div className="text-sm text-muted-foreground">{labels.teams}</div>
    </div>
  )
}
