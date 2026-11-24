import { KeyboardIcon } from 'lucide-react';
import { useId } from 'react';
import { Button } from '@/components/shadcn/button';
import { Kbd, KbdGroup } from '@/components/shadcn/kbd';
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/shadcn/select';

export function ScoreButton({ label, shortcut, increment, ...props }) {
  return (
    <Button
      type="button"
      variant={increment ? 'default' : 'outline'}
      size="sm"
      className="justify-between max-[38rem]:px-2.5"
      aria-label={label}
      aria-keyshortcuts={shortcut}
      {...props}
    >
      {increment ? '+1' : '−1'}
      <KbdGroup aria-hidden="true">
        <KeyboardIcon className="size-3.5" />
        <Kbd>{shortcut}</Kbd>
      </KbdGroup>
    </Button>
  );
}

export function OperatorSelect({ label, placeholder, children, ...props }) {
  const id = useId();

  return (
    <div className="flex flex-wrap items-center gap-2.5 text-sm">
      <label htmlFor={id}>{label}</label>
      <Select {...props}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent position="popper" align="start" className="box-border border-border">
          {children}
        </SelectContent>
      </Select>
    </div>
  );
}
