import { Badge } from '@/components/ui/badge';

/** Stock level with semantic color: red = out, amber = at/below reorder. */
export function StockBadge({ stock, minStockLevel }: { stock: number; minStockLevel: number }) {
  const variant = stock <= 0 ? 'destructive' : stock <= minStockLevel ? 'warning' : 'success';
  return (
    <Badge variant={variant}>
      {stock} {stock <= 0 ? 'out' : stock <= minStockLevel ? 'low' : 'in stock'}
    </Badge>
  );
}
