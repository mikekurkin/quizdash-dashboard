import { cn } from '~/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/mobile-tooltip'
import { PackMetrics } from '~/schemas/pack'

interface ComplexityGradeProps {
  className?: string
  metrics: PackMetrics
  inTooltip?: boolean
  labels?: {
    sumComplexity?: string
    roundsComplexity?: string
    roundComplexityTooltip?: string
    sumTopNAvg?: string
    roundTopNAvg?: string
  }
}

function getComplexityColor(grade: number): string {
  // Color classes based on complexity grade (1-10)
  const colors = {
    1: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-800/70 dark:text-emerald-200',
    2: 'bg-green-200 text-green-800 dark:bg-green-800/80 dark:text-green-200',
    3: 'bg-lime-200 text-lime-800 dark:bg-lime-800/80 dark:text-lime-200',
    4: 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800/80 dark:text-yellow-200',
    5: 'bg-amber-200 text-amber-800 dark:bg-yellow-700/80 dark:text-yellow-200',
    6: 'bg-amber-300 text-amber-800 dark:bg-amber-700/80 dark:text-amber-200',
    7: 'bg-orange-200 text-orange-800 dark:bg-orange-700/80 dark:text-orange-200',
    8: 'bg-red-200 text-red-800 dark:bg-red-800/80 dark:text-red-200',
    9: 'bg-red-300 text-red-800 dark:bg-red-700/80 dark:text-red-200',
    10: 'bg-red-400 text-red-900 dark:bg-red-700/90 dark:text-red-200',
  }

  const normalizedGrade = Math.max(1, Math.min(10, Math.round(grade)))
  return colors[normalizedGrade as keyof typeof colors] || colors[5]
}

export function ComplexityGrade({
  className,
  metrics,
  inTooltip = false,
  labels
}: ComplexityGradeProps) {
  const {sum, rounds} = metrics.complexityGrade

  return (
    <div className={cn('space-y-3', inTooltip ? '' : '', className)}>
      <div className="space-y-1.5">
        {!inTooltip && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{labels?.sumComplexity}</span>
            <span className="font-medium">{`${sum}\u00A0/\u00A010`}</span>
          </div>
        )}
        <div className="h-2 w-full rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full transition-all', getComplexityColor(sum ?? 0))}
            style={{ width: `${((sum ?? 0) / 10) * 100}%` }}
          />
        </div>
      </div>
      {!inTooltip && metrics.topNAvg.n > 0 && (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{labels?.sumTopNAvg}</span>
          <span className="font-medium">{`${metrics.topNAvg.sum?.toFixed(0)}`}</span>
        </div>
      </div>)}

      {rounds.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-sm text-muted-foreground">{labels?.roundsComplexity}</div>
          <div className="flex gap-1.5 flex-wrap">
            <TooltipProvider>
              {rounds.map((complexity, index) => (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'relative h-8 w-8 rounded-md flex items-center justify-center text-xs font-bold dark:text-primary-foreground transition-colors',
                        getComplexityColor(complexity)
                      )}
                    >
                      <div className="h-full w-full flex items-center justify-center">{index + 1}</div>
                    </div>
                  </TooltipTrigger>
                  {!inTooltip && labels?.roundComplexityTooltip && (
                    <TooltipContent className="bg-card text-card-foreground border">
                      <p>{`${labels?.roundComplexityTooltip} ${index + 1}: ${complexity}\u00A0/\u00A010`}</p>
                      <p>{`${labels?.roundTopNAvg}: ${metrics.topNAvg.rounds[index].toFixed(1)}`}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>
        </div>
      )}
    </div>
  )
}
