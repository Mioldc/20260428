import { type ReactElement, useState, useCallback, type FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PasswordDialogProps {
  open: boolean;
  onSuccess: () => void;
  storedPassword: string;
}

export function PasswordDialog({
  open,
  onSuccess,
  storedPassword,
}: PasswordDialogProps): ReactElement {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (password === storedPassword) {
        setError('');
        onSuccess();
      } else {
        setError('密码错误，请重试');
        setPassword('');
      }
    },
    [password, storedPassword, onSuccess],
  );

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-sm"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>输入密码</DialogTitle>
          <DialogDescription>请输入启动密码以访问系统</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                autoFocus
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full">
              确认
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
