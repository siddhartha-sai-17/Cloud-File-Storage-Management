import { HardHat } from 'lucide-react';
import { motion } from 'framer-motion';

interface ComingSoonProps {
  title?: string;
  phase?: number;
}

export function ComingSoonPage({ title = "Feature Under Construction", phase = 2 }: ComingSoonProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center space-y-6 max-w-sm"
      >
        <div className="flex justify-center">
          <motion.div 
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="flex h-16 w-16 items-center justify-center rounded-[16px] bg-[#6366F1]/10 border border-[#6366F1]/20 shadow-vault-sm"
          >
            <HardHat className="h-8 w-8 text-[#818CF8]" />
          </motion.div>
        </div>

        <div className="space-y-2">
          <p className="label-caps">Roadmap Phase {phase}</p>
          <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
          <p className="text-[13px] text-[#94A3B8] leading-relaxed">
            This module is scheduled for implementation in Phase {phase} of the enterprise workspace roll-out.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
export default ComingSoonPage;
