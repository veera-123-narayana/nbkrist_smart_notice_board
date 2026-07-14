export default function Header() {
  return (
    <header className="flex items-center justify-between bg-white shadow px-6 py-4">
      <div>
        <h1 className="text-xl font-bold">
          NBKRIST Smart Digital Notice Board
        </h1>
        <p className="text-sm text-gray-500">
          Admin Control Panel
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">
          Welcome, Admin
        </span>

        <button className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
          Logout
        </button>
      </div>
    </header>
  );
}