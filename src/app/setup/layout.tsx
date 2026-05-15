export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--crm-neutral-50)] flex items-center justify-center p-4">
      {children}
    </div>
  );
}
