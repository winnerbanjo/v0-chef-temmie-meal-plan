import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

export function StarRating({
  rating,
  className,
  size = 16,
}: {
  rating: number
  className?: string
  size?: number
}) {
  return (
    <div className={cn("flex items-center gap-0.5", className)} aria-label={`Rated ${rating} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i + 1 <= Math.round(rating)
        return (
          <Star
            key={i}
            style={{ width: size, height: size }}
            className={filled ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/40"}
          />
        )
      })}
    </div>
  )
}
