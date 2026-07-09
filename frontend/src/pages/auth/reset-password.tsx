import { motion } from 'framer-motion';
import { Link } from 'react-router';
import { Lock, AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export function ResetPasswordPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="shadow-xl border-border/50">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription>Create a new password for your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Backend Notice Banner */}
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <strong>Coming Soon:</strong> Password recovery is not yet available in the current backend version. This feature will be enabled in a future release.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-password">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="reset-password" type="password" placeholder="••••••••" className="pl-9" disabled />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-confirm-password">Confirm New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="reset-confirm-password" type="password" placeholder="••••••••" className="pl-9" disabled />
            </div>
          </div>

          <Button id="reset-submit" className="w-full" disabled>
            Reset Password (Coming Soon)
          </Button>
        </CardContent>
        <CardFooter className="border-t pt-4">
          <p className="text-sm text-muted-foreground w-full text-center">
            <Link to="/login" className="font-medium text-primary hover:underline">
              Back to Sign In
            </Link>
          </p>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
