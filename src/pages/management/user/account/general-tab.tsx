import { Icon } from "@/components/icon";
import { accountService } from "@/services/accountService";
import { useUserInfo } from "@/store/userStore";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Textarea } from "@/ui/textarea";
import { Text } from "@/ui/typography";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ─── Labels rôles ─────────────────────────────────────────────────────────────
const ROLE_COLORS: Record<number, string> = {
	0: "bg-purple-100 text-purple-700",
	1: "bg-blue-100 text-blue-700",
	2: "bg-cyan-100 text-cyan-700",
	3: "bg-green-100 text-green-700",
	4: "bg-orange-100 text-orange-700",
};
const ROLE_LABELS: Record<number, string> = {
	0: "Administrateur",
	1: "Approbateur",
	2: "Back office",
	3: "Demandeur",
	4: "Acheteur",
};

// ─── Composant champ formulaire ───────────────────────────────────────────────
function Field({
	label,
	required,
	icon,
	children,
}: {
	label: string;
	required?: boolean;
	icon?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="space-y-1.5">
			<Label className="flex items-center gap-1.5 text-sm font-medium text-foreground/80">
				{icon && <Icon icon={icon} size={14} className="text-muted-foreground" />}
				{label}
				{required && <span className="text-destructive ml-0.5">*</span>}
			</Label>
			{children}
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────

export default function GeneralTab() {
	const userInfo = useUserInfo();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [form, setForm] = useState({
		userName:        "",
		us_UserIntitule: "",
		email:           "",
		phoneNumber:     "",
		bio:             "",
	});
	const [avatarFile,    setAvatarFile]    = useState<File | null>(null);
	const [avatarPreview, setAvatarPreview] = useState("");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		const u = userInfo as Record<string, unknown>;
		setForm({
			userName:        String(u.username ?? u.userName ?? ""),
			us_UserIntitule: String(u.us_UserIntitule ?? u.username ?? ""),
			email:           String(u.email ?? ""),
			phoneNumber:     String(u.phoneNumber ?? ""),
			bio:             String(u.bio ?? ""),
		});
		const pic = String(u.us_Image ?? u.avatar ?? "");
		if (pic) setAvatarPreview(pic);
	}, [userInfo]);

	const initials = (() => {
		const n = (form.us_UserIntitule || form.userName || "?").trim().split(" ");
		return n.length >= 2 ? `${n[0][0]}${n[1][0]}`.toUpperCase() : (n[0] ?? "?").slice(0, 2).toUpperCase();
	})();

	const roleNo    = Number((userInfo as Record<string, unknown>).us_TypeCompte ?? -1);
	const roleLabel = ROLE_LABELS[roleNo] ?? "";
	const roleColor = ROLE_COLORS[roleNo] ?? "bg-gray-100 text-gray-600";

	const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const f = e.target.files?.[0];
		if (!f) return;
		setAvatarFile(f);
		setAvatarPreview(URL.createObjectURL(f));
	};

	const handleSave = async () => {
		if (!form.userName.trim()) { toast.error("Le nom d'utilisateur est obligatoire."); return; }
		if (!form.email.trim())    { toast.error("L'email est obligatoire."); return; }
		setSaving(true);
		try {
			const res = await accountService.updateProfile({
				id:              String((userInfo as Record<string, unknown>).id ?? ""),
				userName:        form.userName,
				us_UserIntitule: form.us_UserIntitule,
				email:           form.email,
				phoneNumber:     form.phoneNumber,
				bio:             form.bio,
				profilePic:      avatarFile,
			});
			if ((res as Record<string, unknown>)?.isValid === false) {
				toast.error(String((res as Record<string, unknown>).Message ?? "Erreur."));
			} else {
				toast.success("Profil mis à jour avec succès !");
				setAvatarFile(null);
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Erreur réseau.");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

			{/* ── Carte identité (gauche) ──────────────────────────────────── */}
			<div className="lg:col-span-1">
				<Card className="gap-0 overflow-hidden py-0">
					{/* Bandeau gradient */}
					<div className="h-28 bg-linear-to-br from-primary/90 via-primary to-primary/70" />

					{/* Avatar + infos */}
					<div className="flex flex-col items-center px-6 pb-6">
						{/* Avatar positionné sur la limite bandeau/contenu */}
						<div className="relative -mt-12 mb-3">
							{avatarPreview ? (
								<img
									src={avatarPreview}
									alt="avatar"
									className="h-24 w-24 rounded-full border-4 border-card object-cover shadow-md"
								/>
							) : (
								<div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-card bg-linear-to-br from-primary/80 to-primary text-2xl font-bold text-white shadow-md">
									{initials}
								</div>
							)}

							{/* Bouton photo */}
							<button
								type="button"
								onClick={() => fileInputRef.current?.click()}
								className="absolute bottom-0.5 right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow ring-1 ring-border transition hover:bg-muted"
								title="Changer la photo"
							>
								<Icon icon="solar:camera-bold" size={14} className="text-primary" />
							</button>
							<input
								ref={fileInputRef}
								type="file"
								hidden
								accept=".jpg,.jpeg,.png"
								onChange={handleAvatarChange}
							/>
						</div>

						{/* Nom + rôle */}
						<p className="text-center text-base font-semibold">
							{form.us_UserIntitule || form.userName || "—"}
						</p>
						{roleLabel && (
							<span className={`mt-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleColor}`}>
								{roleLabel}
							</span>
						)}

						<div className="mt-4 w-full space-y-2.5 text-sm text-muted-foreground">
							{form.email && (
								<div className="flex items-center gap-2">
									<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
										<Icon icon="solar:letter-bold" size={15} className="text-primary" />
									</div>
									<span className="truncate">{form.email}</span>
								</div>
							)}
							{form.phoneNumber && (
								<div className="flex items-center gap-2">
									<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
										<Icon icon="solar:phone-bold" size={15} className="text-primary" />
									</div>
									<span>{form.phoneNumber}</span>
								</div>
							)}
						</div>

						{/* Fichier sélectionné */}
						{avatarFile && (
							<div className="mt-3 flex w-full items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs">
								<Icon icon="solar:document-bold" size={14} className="text-green-600 shrink-0" />
								<span className="flex-1 truncate font-medium text-green-700">{avatarFile.name}</span>
								<button
									type="button"
									className="text-red-400 hover:text-red-600"
									onClick={() => {
										setAvatarFile(null);
										setAvatarPreview(String((userInfo as Record<string, unknown>).us_Image ?? ""));
									}}
								>
									<Icon icon="solar:close-circle-bold" size={14} />
								</button>
							</div>
						)}
					</div>
				</Card>
			</div>

			{/* ── Formulaire (droite) ─────────────────────────────────────── */}
			<div className="lg:col-span-2 space-y-4">

				{/* Section Informations générales */}
				<Card className="py-0 gap-0">
					<div className="border-b px-6 py-4">
						<div className="flex items-center gap-2">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
								<Icon icon="solar:user-id-bold" size={16} className="text-primary" />
							</div>
							<div>
								<p className="text-sm font-semibold">Informations générales</p>
								<Text variant="caption" color="secondary">Modifiez vos informations personnelles</Text>
							</div>
						</div>
					</div>

					<CardContent className="py-5">
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<Field label="Nom d'utilisateur" required icon="solar:user-bold">
								<Input
									value={form.userName}
									onChange={(e) => setForm((p) => ({ ...p, userName: e.target.value }))}
									placeholder="Votre nom"
								/>
							</Field>

							<Field label="Nom d'affichage" icon="solar:user-speak-bold">
								<Input
									value={form.us_UserIntitule}
									onChange={(e) => setForm((p) => ({ ...p, us_UserIntitule: e.target.value }))}
									placeholder="Votre pseudo"
								/>
							</Field>

							<Field label="Email" required icon="solar:letter-bold">
								<Input
									type="email"
									value={form.email}
									onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
									placeholder="votre@email.com"
								/>
							</Field>

							<Field label="Numéro de téléphone" icon="solar:phone-bold">
								<Input
									value={form.phoneNumber}
									onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
									placeholder="+216 11 123 456"
								/>
							</Field>

							<div className="sm:col-span-2">
								<Field label="Biographie" icon="solar:document-text-bold">
									<Textarea
										value={form.bio}
										onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
										placeholder="Parlez de vous..."
										rows={4}
										className="resize-none"
									/>
								</Field>
							</div>
						</div>
					</CardContent>

					<div className="flex justify-end gap-2 border-t px-6 py-4">
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								const u = userInfo as Record<string, unknown>;
								setForm({
									userName:        String(u.username ?? u.userName ?? ""),
									us_UserIntitule: String(u.us_UserIntitule ?? ""),
									email:           String(u.email ?? ""),
									phoneNumber:     String(u.phoneNumber ?? ""),
									bio:             String(u.bio ?? ""),
								});
							}}
						>
							Annuler
						</Button>
						<Button
							size="sm"
							disabled={saving}
							onClick={() => void handleSave()}
							className="gap-2 bg-primary hover:bg-primary/90"
						>
							{saving
								? <><Icon icon="solar:refresh-bold" size={14} className="animate-spin" />Enregistrement...</>
								: <><Icon icon="solar:check-circle-bold" size={14} />Enregistrer</>}
						</Button>
					</div>
				</Card>
			</div>
		</div>
	);
}
