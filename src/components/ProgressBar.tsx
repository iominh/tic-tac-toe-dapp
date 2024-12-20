import { createPortal } from "react-dom";

interface ProgressBarProps {
  isLoading: boolean;
}

export function ProgressBar({ isLoading }: ProgressBarProps) {
  if (!isLoading) return null;

  return createPortal(
    <div
      className="fixed top-0 left-0 right-0 h-[2px] overflow-hidden"
      style={{ zIndex: 9999 }}
    >
      <div className="progress-bar" />
    </div>,
    document.body,
  );
}
