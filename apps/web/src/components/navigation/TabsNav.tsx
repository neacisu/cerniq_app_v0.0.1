import { Button } from "@/components/ui/button.js";

type TabsNavProps = {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (tab: string) => void;
};

export function TabsNav({ tabs, active, onChange }: TabsNavProps) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Button
          key={tab.key}
          size="sm"
          variant={active === tab.key ? "primary" : "outline"}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}
