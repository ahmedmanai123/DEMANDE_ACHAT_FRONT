import { Icon } from "@/components/icon";
import { accountService } from "@/services/accountService";
import { useUserInfo } from "@/store/userStore";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Progress } from "@/ui/progress";
import { Text } from "@/ui/typography";
import { useState } from "react";
import { toast } from "sonner";

// ── Force mot de passe ────────────────────────────────────────────────────────
function getStrength(pwd: string) {
	if (!pwd) return { score: 0, label: "", color: "bg-border" };
	let s = 0;
	if (pwd.length >= 6)          s++;
	if (pwd.length >= 10)         s++;
	if (/[A-Z]/.test(pwd))        s++;
	if (/[0-9]/.test(pwd))        s++;
	if (/[^A-Za-z0-9]/.test(pwd)) s++;
	if (s <= 1) return { score: 20,  label: "Très faible", color: "bg-destructive" };
	if (s === 2) return { score: 40,  label: "Faible",      color: "bg-orange-500" };
	if (s === 3) return { score: 60,  label: "Moyen",       color: "bg-yellow-500" };
	if (s === 4) return { score: 80,  label: "Fort",        color: "bg-green-500"  };
	return              { score: 100, label: "Très fort",   color: "bg-primary"    };
}

// ── Champ mot de passe ────────────────────────────────────────────────────────
function PasswordField({
	label,
	value,
	show,
	onToggle,
	onChange,
	hint,
	required,
}: {
	label: string;
	value: string;
	show: boolean;
	onToggle: () => void;
	onChange: (v: string) => void;
	hint?: React.ReactNode;
	required?: boolean;
}) {
	return (
		<div className="space-y-1.5">
			<Label className="flex items-center gap-1 text-sm font-medium text-foreground/80">
				<Icon icon="solar:lock-bold" size={13} className="text-muted-foreground" />
				{label}
				{required && <span className="text-destructive">*</span>}
			</Label>
			<div className="relative">
				<Input
					type={show ? "text" : "password"}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder="minimum : 6 caractères"
					className="pr-10"
				/>
				<button
					type="button"
					onClick={onToggle}
					className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
				>
					<Icon
						icon={show ? "solar:eye-closed-bold" : "solar:eye-bold"}
						size={16}
					/>
				</button>
			</div>
			{hint}
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SecurityTab() {
	const userInfo = useUserInfo();

	const [form, setForm] = useState({ old: "", new: "", confirm: "" });
	const [show, setShow] = useState({ old: false, new: false, confirm: false });
	const [saving, setSaving] = useState(false);

	const strength = getStrength(form.new);
	const match    = form.confirm.length > 0 && form.new === form.confirm;
	const noMatch  = form.confirm.length > 0 && form.new !== form.confirm;

	const toggle = (k: keyof typeof show) => setShow((p) => ({ ...p, [k]: !p[k] }));
	const set    = (k: keyof typeof form)  => (v: string) => setForm((p) => ({ ...p, [k]: v }));

	const handleSubmit = async () => {
		if (!form.old)             { toast.error("Veuillez saisir l'ancien mot de passe."); return; }
		if (form.new.length < 6)   { toast.error("Le mot de passe doit contenir au moins 6 caractères."); return; }
		if (noMatch)               { toast.error("Les mots de passe ne correspondent pas."); return; }
		setSaving(true);
		try {
			await accountService.changePassword({
				id:              String((userInfo as Record<string, unknown>).id ?? ""),
				email:           String(userInfo.email ?? ""),
				oldPassword:     form.old,
				newPassword:     form.new,
				confirmPassword: form.confirm,
			});
			toast.success("Mot de passe modifié avec succès !");
			setForm({ old: "", new: "", confirm: "" });
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Erreur lors du changement.");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="mx-auto max-w-xl">
			<Card className="py-0 gap-0">
				{/* En-tête */}
				<div className="border-b px-6 py-4">
					<div className="flex items-center gap-3">
						<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
							<Icon icon="solar:lock-keyhole-bold-duotone" size={20} className="text-primary" />
						</div>
						<div>
							<p className="text-sm font-semibold">Modifier le mot de passe</p>
							<Text variant="caption" color="secondary">
								Choisissez un mot de passe fort pour sécuriser votre compte
							</Text>
						</div>
					</div>
				</div>

				<CardContent className="py-6 space-y-5">
					{/* Ancien mot de passe */}
					<PasswordField
						label="Ancien mot de passe"
						value={form.old}
						show={show.old}
						onToggle={() => toggle("old")}
						onChange={set("old")}
						required
					/>

					{/* Nouveau mot de passe + barre de force */}
					<PasswordField
						label="Nouveau mot de passe"
						value={form.new}
						show={show.new}
						onToggle={() => toggle("new")}
						onChange={set("new")}
						required
						hint={
							form.new ? (
								<div className="space-y-1 pt-1">
									<div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
										<div
											className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
											style={{ width: `${strength.score}%` }}
										/>
									</div>
									<p className={`text-xs font-medium ${
										strength.score <= 20 ? "text-destructive"
										: strength.score <= 40 ? "text-orange-500"
										: strength.score <= 60 ? "text-yellow-600"
										: "text-green-600"
									}`}>
										Force : {strength.label}
									</p>
								</div>
							) : null
						}
					/>

					{/* Confirmer mot de passe */}
					<PasswordField
						label="Confirmer le mot de passe"
						value={form.confirm}
						show={show.confirm}
						onToggle={() => toggle("confirm")}
						onChange={set("confirm")}
						required
						hint={
							<>
								{match  && <p className="mt-1 flex items-center gap-1 text-xs text-green-600"><Icon icon="solar:check-circle-bold" size={13} />Les mots de passe correspondent.</p>}
								{noMatch && <p className="mt-1 flex items-center gap-1 text-xs text-destructive"><Icon icon="solar:close-circle-bold" size={13} />Les mots de passe ne correspondent pas.</p>}
							</>
						}
					/>

					{/* Conseils sécurité */}
					<div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700 space-y-1">
						<p className="font-semibold flex items-center gap-1.5">
							<Icon icon="solar:shield-check-bold" size={14} />
							Conseils pour un mot de passe fort :
						</p>
						<ul className="ml-5 list-disc space-y-0.5 text-blue-600">
							<li>Au moins 10 caractères</li>
							<li>Majuscules et minuscules</li>
							<li>Chiffres et caractères spéciaux (!, @, #...)</li>
						</ul>
					</div>
				</CardContent>

				{/* Footer */}
				<div className="flex justify-end gap-2 border-t px-6 py-4">
					<Button
						variant="outline"
						size="sm"
						onClick={() => setForm({ old: "", new: "", confirm: "" })}
					>
						Annuler
					</Button>
					<Button
						size="sm"
						disabled={saving}
						onClick={() => void handleSubmit()}
						className="gap-2 bg-primary hover:bg-primary/90"
					>
						{saving
							? <><Icon icon="solar:refresh-bold" size={14} className="animate-spin" />Enregistrement...</>
							: <><Icon icon="solar:lock-keyhole-bold" size={14} />Changer le mot de passe</>}
					</Button>
				</div>
			</Card>
		</div>
	);
}
