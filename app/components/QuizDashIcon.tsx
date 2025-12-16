import { cn } from '~/lib/utils'

interface IconProps {
  className?: string
}

export function QuizDashIcon({ className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('quiz-dash-icon', className)}
    >
      <path
        d="M 7.892 4.992 C 14.056 1.83 21.663 6.664 20.989 13.446 C 20.315 20.228 14.261 23.328 8.798 21.387 M 3.651 16.318 C 3.024 14.58 2.51 12.05 3.992 8.892 L 1.992 2.992 L 7.892 4.992"
        style={{ stroke: 'currentColor' }}
        transform="matrix(-1, 0, 0, -1, 22.99268245697, 25.004382133484)"
      />
      <circle
        cx="11.025"
        cy="11.979"
        r="2"
        style={{ stroke: 'currentColor', transformOrigin: '11px 12px' }}
        transform="matrix(0.899764, 0, 0, 0.898861, -0.004457, -0.004681)"
      />
      <path d="M 12.281 10.724 L 17.319 5.69" style={{ stroke: 'currentColor', transformOrigin: '11px 11.983px' }} />
    </svg>
  )
}
