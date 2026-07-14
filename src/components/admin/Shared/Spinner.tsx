export default function Spinner() {
  return (
    <div className="flex justify-center items-center h-full py-20">
      <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
    </div>
  );
}