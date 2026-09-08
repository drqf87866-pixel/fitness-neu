import { Badge } from "@/components/ui/badge";

export function PrBadge({ isPr }: { isPr: boolean }) {
  if (!isPr) return null;
  return <Badge variant="success">PR</Badge>;
}
