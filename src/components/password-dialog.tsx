// src/components/password-dialog.tsx
import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface PasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  correctPassword?: string;
  isConfirming?: boolean;
}

const DEFAULT_PASSWORD = process.env.NEXT_PUBLIC_ACTION_PASSWORD || 'haekal ganteng';

export function PasswordDialog({
  open,
  onOpenChange,
  onConfirm,
  correctPassword = DEFAULT_PASSWORD,
  isConfirming = false,
}: PasswordDialogProps) {
  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { toast } = useToast();

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEnteredPassword(e.target.value);
    setPasswordError('');
  };

  const handleConfirmClick = () => {
    if (isConfirming) return;

    if (enteredPassword === correctPassword) {
      onConfirm();
    } else {
      setPasswordError('Password salah. Silakan coba lagi.');
      toast({
        title: 'Gagal',
        description: 'Password salah.',
        variant: 'destructive',
      });
    }
  };

  const handleCancelClick = () => {
    if (isConfirming) return;
    setEnteredPassword('');
    setPasswordError('');
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirmClick();
    }
  };

  useEffect(() => {
    if (!open) {
      setEnteredPassword('');
      setPasswordError('');
    }
  }, [open]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-xl shadow-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Konfirmasi Aksi</AlertDialogTitle>
          <AlertDialogDescription>
            Untuk melanjutkan, masukkan password. Password default: haekal ganteng
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={enteredPassword}
            onChange={handlePasswordChange}
            onKeyDown={handleKeyDown}
            placeholder="Masukkan password..."
            className={cn(
              "rounded-lg shadow-sm",
              passwordError ? 'border-destructive focus-visible:ring-destructive' : ''
            )}
            disabled={isConfirming}
          />
          {passwordError && (
            <p className="text-sm text-destructive">{passwordError}</p>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={handleCancelClick} disabled={isConfirming} className="rounded-lg shadow-sm">
              Batal
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmClick}
            className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg shadow-md"
            disabled={isConfirming}
          >
            {isConfirming ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {isConfirming ? 'Mengkonfirmasi...' : 'Konfirmasi'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}