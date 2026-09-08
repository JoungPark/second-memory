import type { ReactNode } from 'react';

type SettingsSectionProps = {
  title: string;
  children: ReactNode;
};

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3">{children}</div>
    </section>
  );
}
