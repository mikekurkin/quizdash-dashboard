import { useMemo } from "react";
import { Skeleton } from "./skeleton";
import { TableCell, TableRow } from "./table";

interface TableSkeletonRowProps {
  columns: number;
  className?: string;
  dataSentinel?: boolean;
  index?: number;
}

function getRandomWidth(seed: number) {
  // Use a seeded random number generator
  const x = Math.sin(seed) * 10000;
  const random = x - Math.floor(x);
  // Returns a random width between 60% and 90%
  return `${Math.floor(random * 30) + 60}%`;
}

export function TableSkeletonRow({
  columns,
  className,
  dataSentinel,
  index = 0
}: TableSkeletonRowProps) {
  // Generate consistent widths using useMemo and index as seed
  const widths = useMemo(() =>
    Array.from({ length: columns }, (_, i) =>
      getRandomWidth(index * columns + i)
    ),
    [columns, index]
  );

  return (
    <TableRow className={className} data-sentinel={dataSentinel}>
      {widths.map((width, i) => (
        <TableCell key={i}>
          <Skeleton className="h-6" style={{ width }} />
        </TableCell>
      ))}
    </TableRow>
  );
}
