type NoticeModalProps = {
  open?: boolean;
  onClose?: () => void;
};

export default function NoticeModal({
  open = false,
  onClose,
}: NoticeModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white rounded-lg p-6 w-[500px]">
        <h2 className="text-xl font-bold mb-4">Create Notice</h2>

        <p className="text-gray-500">
          Notice form will be added here.
        </p>

        <button
          onClick={onClose}
          className="mt-6 px-4 py-2 bg-red-500 text-white rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
}