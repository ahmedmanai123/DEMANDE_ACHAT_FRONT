import { Icon } from "@/components/icon";
import { useUserInfo } from "@/store/userStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { Text, Title } from "@/ui/typography";
import GeneralTab from "./general-tab";
import SecurityTab from "./security-tab";

const TABS = [
	{
		value:   "profile",
		icon:    "solar:user-id-bold-duotone",
		label:   "Profil",
		content: <GeneralTab />,
	},
	{
		value:   "security",
		icon:    "solar:lock-keyhole-bold-duotone",
		label:   "Sécurité",
		content: <SecurityTab />,
	},
] as const;

export default function UserAccount() {
	const userInfo = useUserInfo();
	const u = userInfo as Record<string, unknown>;
	const displayName = String(u.us_UserIntitule ?? u.username ?? u.userName ?? "Mon compte");

	return (
		<div className="space-y-6">
			{/* ── En-tête de page ─────────────────────────────────────────── */}
			<div className="flex items-center gap-3">
				<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
					<Icon icon="solar:user-bold-duotone" size={22} className="text-primary" />
				</div>
				<div>
					<Title as="h4">Mon profil</Title>
					<Text variant="caption" color="secondary">{displayName}</Text>
				</div>
			</div>

			{/* ── Onglets ─────────────────────────────────────────────────── */}
			<Tabs defaultValue="profile">
				<TabsList className="h-auto gap-1 rounded-xl bg-muted/60 p-1">
					{TABS.map((tab) => (
						<TabsTrigger
							key={tab.value}
							value={tab.value}
							className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
						>
							<Icon icon={tab.icon} size={17} />
							{tab.label}
						</TabsTrigger>
					))}
				</TabsList>

				{TABS.map((tab) => (
					<TabsContent key={tab.value} value={tab.value} className="mt-6">
						{tab.content}
					</TabsContent>
				))}
			</Tabs>
		</div>
	);
}
