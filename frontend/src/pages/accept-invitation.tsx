import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { workspaceService } from '@/features/workspaces/services/workspaceService';
import { Button } from '@/components/ui/button';

export function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const { mutate: acceptInvitation } = useMutation({
    mutationFn: () => workspaceService.acceptInvitation(token || ''),
    onSuccess: () => {
      setStatus('success');
    },
    onError: (err: any) => {
      setStatus('error');
      setErrorMessage(err.response?.data?.message || 'The invitation token is invalid or expired.');
    },
  });

  useEffect(() => {
    if (token) {
      acceptInvitation();
    } else {
      setStatus('error');
      setErrorMessage('Missing invitation token.');
    }
  }, [token, acceptInvitation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md p-8 border rounded-2xl bg-card shadow-lg text-center space-y-6">
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
            <h2 className="text-xl font-bold">Accepting Workspace Invitation...</h2>
            <p className="text-muted-foreground text-sm">Please wait while we add you to the workspace.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <CheckCircle2 className="h-16 w-16 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-extrabold text-foreground">Invitation Accepted!</h2>
            <p className="text-muted-foreground text-sm">
              You are now a member of the workspace. You can switch to it from the workspace manager or the sidebar.
            </p>
            <div className="pt-4">
              <Button
                onClick={() => navigate('/workspaces')}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              >
                Go to Workspaces
              </Button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <XCircle className="h-16 w-16 text-destructive" />
            </div>
            <h2 className="text-2xl font-extrabold text-foreground">Acceptance Failed</h2>
            <p className="text-destructive text-sm font-semibold">{errorMessage}</p>
            <p className="text-muted-foreground text-xs">
              Please contact the workspace administrator to resend a new invitation link.
            </p>
            <div className="pt-4">
              <Button
                onClick={() => navigate('/dashboard')}
                variant="outline"
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AcceptInvitationPage;
