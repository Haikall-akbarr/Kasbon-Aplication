// src/components/password-dialog.tsx
import type React from 'react';
import { useState } from 'react';
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
import { Button } from './ui/button'; // Import Button
import { useToast } from '@/hooks/use-toast'; // Import useToast

interface PasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  correctPassword?: string; // Make password prop optional, default to env var
}

const DEFAULT_PASSWORD = process.env.NEXT_PUBLIC_ACTION_PASSWORD || 'haekal ganteng'; // Fallback

export function PasswordDialog({
  open,
  onOpenChange,
  onConfirm,
  correctPassword = DEFAULT_PASSWORD,
}: PasswordDialogProps) {
  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { toast } = useToast(); // Use toast hook

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEnteredPassword(e.target.value);
    setPasswordError(''); // Clear error when user types
  };

  const handleConfirmClick = () => {
    if (enteredPassword === correctPassword) {
      onConfirm(); // Execute the action
      setEnteredPassword(''); // Clear password field
      setPasswordError(''); // Clear error
      onOpenChange(false); // Close dialog
       toast({ title: 'Sukses', description: 'Aksi berhasil dikonfirmasi.' });
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
    setEnteredPassword(''); // Clear password field
    setPasswordError(''); // Clear error
    onOpenChange(false); // Close dialog
  };

  // Handle Enter key press in the input field
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent default form submission behavior
      handleConfirmClick();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Konfirmasi Aksi</AlertDialogTitle>
          <AlertDialogDescription>
            Untuk melanjutkan, masukkan password.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={enteredPassword}
            onChange={handlePasswordChange}
            onKeyDown={handleKeyDown} // Add key down handler
            placeholder="Masukkan password..."
            className={passwordError ? 'border-destructive' : ''}
          />
          {passwordError && (
            <p className="text-sm text-destructive">{passwordError}</p>
          )}
        </div>
        <AlertDialogFooter>
           {/* Use regular Button for cancel to match AlertDialog style */}
          <Button variant="outline" onClick={handleCancelClick}>Batal</Button>
          {/* Use AlertDialogAction for the primary confirm action */}
          <AlertDialogAction onClick={handleConfirmClick}>
            Konfirmasi
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
