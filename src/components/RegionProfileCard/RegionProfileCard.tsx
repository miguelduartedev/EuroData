import { Building2Icon, UsersRoundIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CountryFlag } from "@/components/CountryFlag/CountryFlag";
import type { Region } from "@/types/region";

interface RegionProfileCardProps {
  slotLabel: "Region A" | "Region B";
  region: Region;
  color: string;
}

interface ProfileDetailProps {
  icon: typeof UsersRoundIcon;
  label: string;
}

function ProfileDetail({ icon: Icon, label }: ProfileDetailProps) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon aria-hidden="true" className="size-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">Coming soon</p>
      </div>
    </div>
  );
}

export function RegionProfileCard({ slotLabel, region, color }: RegionProfileCardProps) {
  return (
    <Card
      aria-label={`${slotLabel}: ${region.name}`}
      className="gap-0 overflow-hidden border-t-4 shadow-sm"
      style={{ borderTopColor: color }}
    >
      <CardContent className="p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="size-11 shrink-0 overflow-hidden rounded-full ring-1 ring-border">
            <CountryFlag countryCode={region.countryCode} countryName={region.countryName} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">{slotLabel}</p>
            <h2 className="mt-0.5 truncate text-xl font-semibold tracking-[-0.02em]">{region.name}</h2>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{region.countryName} · {region.id}</p>
          </div>
        </div>
        <div data-slot="region-profile-divider" aria-hidden="true" className="my-4 h-px bg-border" />
        <div className="grid gap-3 min-[430px]:grid-cols-2">
          <ProfileDetail icon={UsersRoundIcon} label="Population" />
          <ProfileDetail icon={Building2Icon} label="Largest city" />
        </div>
      </CardContent>
    </Card>
  );
}

interface RegionProfileRowProps {
  regionA?: Region;
  regionB?: Region;
  regionAColor: string;
  regionBColor: string;
}

export function RegionProfileRow({
  regionA,
  regionB,
  regionAColor,
  regionBColor,
}: RegionProfileRowProps) {
  const selectedProfiles = [
    regionA ? { slotLabel: "Region A" as const, region: regionA, color: regionAColor } : undefined,
    regionB ? { slotLabel: "Region B" as const, region: regionB, color: regionBColor } : undefined,
  ].filter((profile): profile is NonNullable<typeof profile> => profile !== undefined);

  if (selectedProfiles.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Selected regions"
      className={selectedProfiles.length === 1 ? "grid gap-4" : "grid gap-4 sm:grid-cols-2"}
    >
      {selectedProfiles.map((profile) => (
        <RegionProfileCard key={profile.slotLabel} {...profile} />
      ))}
    </section>
  );
}
