interface Props {
  title: string;
  subtitle?: string;
}

export default function PageTitle({
  title,
  subtitle,
}: Props) {
  return (
    <div className="mb-6">

      <h1 className="text-3xl font-bold text-white">
        {title}
      </h1>

      {subtitle && (
        <p className="text-slate-400 mt-2">
          {subtitle}
        </p>
      )}

    </div>
  );
}