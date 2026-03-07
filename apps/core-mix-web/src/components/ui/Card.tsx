export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-card-bg border border-card-border rounded-xl p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  accent = false,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted uppercase tracking-wider">{label}</p>
          <p
            className={`text-2xl font-bold mt-1 ${
              accent ? "text-accent" : "text-foreground"
            }`}
          >
            {value}
          </p>
        </div>
        {icon && <div className="text-muted">{icon}</div>}
      </div>
    </Card>
  );
}
