type EmptyStateProps = {
  title?: string;
  message?: string;
};

export default function EmptyState({
  title = "No Data Found",
  message = "Nothing to display.",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-10">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-gray-500 mt-2">{message}</p>
    </div>
  );
}