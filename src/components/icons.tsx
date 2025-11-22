import { Sprout } from 'lucide-react';
import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <Sprout className="h-6 w-6 text-primary" {...props} />
  );
}
