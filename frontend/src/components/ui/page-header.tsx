import { cn } from "@/utils/utils";
import { motion } from 'framer-motion';

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: React.ReactNode;
  category?: string;
}

export function PageHeader({
  title,
  description,
  action,
  category = "Workspace",
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 pb-6 md:flex-row md:items-center md:justify-between border-b border-white/[0.05]",
        className
      )}
      {...props}
    >
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-1"
      >
        <p className="label-caps font-bold">{category}</p>
        <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
        {description && (
          <p className="text-sm text-[#64748B] mt-1">{description}</p>
        )}
      </motion.div>
      {action && (
        <div className="flex items-center gap-2 mt-4 md:mt-0 shrink-0">{action}</div>
      )}
    </div>
  );
}
export default PageHeader;
