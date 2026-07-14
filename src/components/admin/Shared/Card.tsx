interface CardProps {
  children: React.ReactNode;
}

export default function Card({
  children,
}: CardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      {children}
    </div>
  );
}