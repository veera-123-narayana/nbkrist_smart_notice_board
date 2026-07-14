interface AppButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
}

export default function AppButton({
  children,
  onClick,
  type = "button",
  className = "",
}: AppButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition ${className}`}
    >
      {children}
    </button>
  );
}