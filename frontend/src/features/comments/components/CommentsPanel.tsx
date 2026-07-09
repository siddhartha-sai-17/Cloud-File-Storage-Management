import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Send, Reply, Pencil, Trash2, Loader2, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/utils';
import { commentService } from '@/features/comments/services/commentService';
import type { CommentDto } from '@/features/comments/services/commentService';
import { useAuth } from '@/contexts/AuthProvider';

interface CommentsPanelProps {
  fileId: number;
  className?: string;
}

function CommentItem({
  comment,
  fileId,
  depth = 0,
}: {
  comment: CommentDto;
  fileId: number;
  depth?: number;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [editContent, setEditContent] = useState(comment.content);
  const [showReplies, setShowReplies] = useState(true);

  const isOwner = user?.username === comment.username;

  const replyMutation = useMutation({
    mutationFn: () =>
      commentService.addComment(fileId, { content: replyContent, parentCommentId: comment.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', fileId] });
      toast.success('Reply added.');
      setReplyContent('');
      setIsReplying(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to add reply.'),
  });

  const editMutation = useMutation({
    mutationFn: () => commentService.editComment(comment.id, { content: editContent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', fileId] });
      toast.success('Comment updated.');
      setIsEditing(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to edit comment.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => commentService.deleteComment(comment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', fileId] });
      toast.success('Comment deleted.');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete comment.'),
  });

  return (
    <div className={cn('space-y-2', depth > 0 && 'ml-6 pl-3 border-l border-muted')}>
      <div className={cn('rounded-lg p-3', depth === 0 ? 'bg-muted/20' : 'bg-transparent')}>
        {/* Header */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase">
              {comment.username.substring(0, 2)}
            </span>
            <span className="text-xs font-semibold">{comment.username}</span>
            {comment.edited && (
              <span className="text-[9px] text-muted-foreground italic">(edited)</span>
            )}
            <span className="text-[10px] text-muted-foreground">
              {new Date(comment.createdAt).toLocaleString()}
            </span>
          </div>

          {!comment.deleted && isOwner && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setIsEditing((p) => !p); setEditContent(comment.content); }}
                aria-label="Edit comment"
                className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted transition-colors"
              >
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </button>
              <button
                onClick={() => { if (confirm('Delete this comment?')) deleteMutation.mutate(); }}
                aria-label="Delete comment"
                className="h-6 w-6 flex items-center justify-center rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full rounded border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              rows={3}
              aria-label="Edit comment text"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => editMutation.mutate()}
                disabled={!editContent.trim() || editMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white h-7 text-xs"
              >
                {editMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="h-7 text-xs">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className={cn('text-sm', comment.deleted && 'text-muted-foreground italic')}>
            {comment.deleted ? '[This comment was deleted]' : comment.content}
          </p>
        )}

        {/* Reply link */}
        {!comment.deleted && depth < 3 && (
          <button
            onClick={() => setIsReplying((p) => !p)}
            className="mt-1.5 flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-700 font-medium focus:outline-none"
          >
            <Reply className="h-3 w-3" />
            Reply
          </button>
        )}

        {/* Reply composer */}
        {isReplying && (
          <div className="mt-2 space-y-2">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={`Reply to ${comment.username}...`}
              className="w-full rounded border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              rows={2}
              aria-label="Reply text"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => replyMutation.mutate()}
                disabled={!replyContent.trim() || replyMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white h-7 text-xs"
              >
                {replyMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                <Send className="h-3 w-3 mr-1" />
                Send
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsReplying(false)} className="h-7 text-xs">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div>
          <button
            onClick={() => setShowReplies((p) => !p)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground mb-1 focus:outline-none"
          >
            {showReplies ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showReplies ? 'Hide' : 'Show'} {comment.replies.length} repl{comment.replies.length === 1 ? 'y' : 'ies'}
          </button>

          {showReplies && comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} fileId={fileId} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentsPanel({ fileId, className }: CommentsPanelProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [newComment, setNewComment] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['comments', fileId, page],
    queryFn: () => commentService.getFileComments(fileId, page, 20),
    enabled: !!fileId,
  });

  const comments = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  const addCommentMutation = useMutation({
    mutationFn: () => commentService.addComment(fileId, { content: newComment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', fileId] });
      toast.success('Comment posted!');
      setNewComment('');
      textareaRef.current?.focus();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to post comment.'),
  });

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Title */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-indigo-600" />
        <h3 className="text-sm font-bold">
          Comments {data && <span className="text-muted-foreground font-normal">({data.totalElements})</span>}
        </h3>
      </div>

      {/* New comment composer */}
      <div className="space-y-2">
        <textarea
          ref={textareaRef}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment…"
          aria-label="New comment"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && newComment.trim()) {
              addCommentMutation.mutate();
            }
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Ctrl+Enter to submit</span>
          <Button
            size="sm"
            onClick={() => addCommentMutation.mutate()}
            disabled={!newComment.trim() || addCommentMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs"
          >
            {addCommentMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
            Post Comment
          </Button>
        </div>
      </div>

      {/* Comment list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
          <MessageSquare className="h-8 w-8 opacity-30" />
          <p className="text-sm">No comments yet. Start the conversation!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} fileId={fileId} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="h-7 text-xs"
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="h-7 text-xs"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
