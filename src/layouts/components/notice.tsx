import { type CSSProperties, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import CyanBlur from "@/assets/images/background/cyan-blur.png";
import RedBlur from "@/assets/images/background/red-blur.png";
import { Icon } from "@/components/icon";
import { notificationService, type UserNotification } from "@/services/notificationService";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { ScrollArea } from "@/ui/scroll-area";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/ui/sheet";
import { Text } from "@/ui/typography";
import { formatDateTime, getInitials } from "@/utils/besoin.utils";

const getNumber = (item: UserNotification, ...keys: string[]) => {
	for (const key of keys) {
		const value = item[key];
		const numberValue = Number(value);
		if (Number.isFinite(numberValue) && numberValue > 0) return numberValue;
	}
	return 0;
};

const getString = (item: UserNotification, ...keys: string[]) => {
	for (const key of keys) {
		const value = item[key];
		if (typeof value === "string" && value.trim()) return value;
	}
	return "";
};

const getStatusUi = (status: number) => {
	if (status === 3) return { icon: "solar:check-circle-bold", variant: "success" as const };
	if (status === 1) return { icon: "solar:close-circle-bold", variant: "destructive" as const };
	return { icon: "solar:clock-circle-bold-duotone", variant: "info" as const };
};

export default function NoticeButton() {
	const navigate = useNavigate();
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [count, setCount] = useState(0);
	const [notifications, setNotifications] = useState<UserNotification[]>([]);

	const style: CSSProperties = {
		backdropFilter: "blur(20px)",
		backgroundImage: `url("${CyanBlur}"), url("${RedBlur}")`,
		backgroundRepeat: "no-repeat, no-repeat",
		backgroundPosition: "right top, left bottom",
		backgroundSize: "50%, 50%",
	};

	const unreadCount = count || notifications.length;

	const loadCount = useCallback(async () => {
		try {
			setCount(await notificationService.getCount());
		} catch {
			setCount(0);
		}
	}, []);

	const loadNotifications = useCallback(async () => {
		setLoading(true);
		setError("");
		try {
			const rows = await notificationService.getUserNotifications();
			setNotifications(rows);
			setCount(rows.length);
		} catch (requestError) {
			setNotifications([]);
			setError(requestError instanceof Error ? requestError.message : "Impossible de charger les notifications.");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadCount();
	}, [loadCount]);

	useEffect(() => {
		if (drawerOpen) void loadNotifications();
	}, [drawerOpen, loadNotifications]);

	const handleOpenNotification = (notification: UserNotification) => {
		const validationId = getNumber(notification, "V_Id", "v_Id");
		const besoinId = getNumber(notification, "B_No", "b_No");
		if (!validationId || !besoinId) return;
		setDrawerOpen(false);
		navigate(`/besoins?mode=validation&id=${validationId}&b_No=${besoinId}`);
	};

	const title = useMemo(() => {
		if (loading) return "Chargement des notifications";
		if (unreadCount > 0) return `Vous avez ${unreadCount} notification(s)`;
		return "Aucune nouvelle notification";
	}, [loading, unreadCount]);

	return (
		<>
			<div className="relative">
				<Button variant="ghost" size="icon" className="rounded-full" onClick={() => setDrawerOpen(true)}>
					<Icon icon="solar:bell-bing-bold-duotone" size={24} />
				</Button>
				{unreadCount > 0 && (
					<Badge variant="destructive" shape="circle" className="absolute -right-2 -top-2">
						{unreadCount}
					</Badge>
				)}
			</div>
			<Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
				<SheetContent side="right" className="sm:max-w-md p-0 [&>button]:hidden flex flex-col" style={style}>
					<SheetHeader className="flex flex-row items-center justify-between p-4 h-16 shrink-0">
						<SheetTitle>Notifications</SheetTitle>
						<Button
							variant="ghost"
							size="icon"
							className="rounded-full text-primary"
							onClick={() => void loadNotifications()}
						>
							<Icon icon="solar:refresh-bold" size={20} />
						</Button>
					</SheetHeader>

					<div className="px-4 pb-3">
						<Text variant="subTitle2">{title}</Text>
					</div>

					<div className="px-4 flex-1 overflow-hidden">
						<ScrollArea className="h-full">
							{loading && <NotificationState icon="solar:refresh-bold" text="Chargement..." />}
							{!loading && error && <NotificationState icon="solar:danger-triangle-bold" text={error} />}
							{!loading && !error && notifications.length === 0 && (
								<NotificationState icon="solar:bell-off-bold-duotone" text="Aucune demande en attente." />
							)}
							{!loading &&
								!error &&
								notifications.map((notification, index) => (
									<NotificationItem
										key={`${getNumber(notification, "NU_Id", "nU_Id") || index}-${getNumber(notification, "V_Id", "v_Id")}`}
										notification={notification}
										onOpen={handleOpenNotification}
									/>
								))}
						</ScrollArea>
					</div>

					<SheetFooter className="flex flex-row h-16 w-full items-center justify-between p-4 shrink-0">
						<Button variant="outline" className="flex-1" onClick={() => navigate("/besoins?mode=gestion-demandes")}>
							Voir les demandes
						</Button>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		</>
	);
}

function NotificationItem({
	notification,
	onOpen,
}: {
	notification: UserNotification;
	onOpen: (notification: UserNotification) => void;
}) {
	const validationId = getNumber(notification, "V_Id", "v_Id");
	const besoinId = getNumber(notification, "B_No", "b_No");
	const userName = getString(notification, "NU_UserName", "nU_UserName") || "Système";
	const description =
		getString(notification, "NU_Description", "nU_Description") ||
		(validationId && besoinId ? `Demande d'achat ${besoinId} à traiter.` : "Notification");
	const status = getNumber(notification, "V_Status", "v_Status");
	const statusUi = getStatusUi(status);
	const date = getString(notification, "NU_DateTime", "nU_DateTime");
	const canOpen = validationId > 0 && besoinId > 0;

	return (
		<button
			type="button"
			disabled={!canOpen}
			onClick={() => onOpen(notification)}
			className="w-full text-left flex items-start gap-3 py-4 border-b border-border last:border-b-0 disabled:cursor-default"
		>
			<div className="relative shrink-0">
				<div className="w-10 h-10 rounded-full bg-bg-neutral flex items-center justify-center text-sm font-medium">
					{getInitials(userName) || "DA"}
				</div>
				<Badge shape="circle" variant={statusUi.variant} className="absolute -bottom-1 -right-1 h-5 w-5 p-0">
					<Icon icon={statusUi.icon} size={14} />
				</Badge>
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex items-center justify-between gap-3">
					<Text variant="subTitle2" className="truncate">
						{userName}
					</Text>
					{canOpen && <Icon icon="solar:alt-arrow-right-linear" size={18} className="shrink-0 text-text-secondary" />}
				</div>
				<Text variant="caption" color="secondary" className="mt-1 block">
					{description}
				</Text>
				<div className="mt-2 flex items-center gap-2">
					{besoinId > 0 && <Badge variant="default">DA #{besoinId}</Badge>}
					{validationId > 0 && <Badge variant="info">Validation #{validationId}</Badge>}
				</div>
				{date && (
					<Text variant="caption" color="secondary" className="mt-2 block">
						{formatDateTime(date)}
					</Text>
				)}
			</div>
		</button>
	);
}

function NotificationState({ icon, text }: { icon: string; text: string }) {
	return (
		<div className="h-48 flex flex-col items-center justify-center gap-3 text-center">
			<Icon icon={icon} size={28} className="text-text-secondary" />
			<Text variant="caption" color="secondary">
				{text}
			</Text>
		</div>
	);
}
