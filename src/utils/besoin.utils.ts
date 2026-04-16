// ============================================================
// utils/besoin.utils.ts
// Utilitaires : labels enums, couleurs badges, formatage dates
// Remplace GetEnumDescription(), createBadge() des vues Razor
// ============================================================

import {
	Etat_Besoin,
	Statut,
	Role_Validateur,
	Etat_Affectation_Acheteur,
	TypeSage,
	Type_Validation,
} from "../types/besoin";

// ── Labels (miroir de GetEnumDescription C#) ────────────────

export const ETAT_BESOIN_LABELS: Record<number, string> = {
	[-1]: "Tous",
	0: "Brouillon",
	1: "Demande clôturée",
	2: "En cours de validation",
	3: "Pris en charge",
	4: "Achetée",
	5: "Refusée",
	6: "Validée",
	7: "En attente de validation",
	8: "Rectification du demande",
	9: "Demande clôturée pour rectifier",
	10: "Non pris en charge",
};

export const STATUT_LABELS: Record<number, string> = {
	[-1]: "Tous",
	0: "En Attente",
	1: "Rejeté",
	3: "Validé",
	4: "En Attente d'achat",
	5: "Achetée",
	6: "Rectification du demande",
};

export const ROLE_VALIDATEUR_LABELS: Record<number, string> = {
	[-1]: "Tous",
	1: "Demandeur",
	2: "Responsable hiérarchique",
	3: "Validateur",
	4: "Acheteur",
};

export const ETAT_AFFECTATION_LABELS: Record<number, string> = {
	[-1]: "Tous",
	0: "Brouillon",
	1: "Encours",
	2: "Générer demande",
	3: "Achetée",
	4: "Validée",
};

export const TYPE_DOCUMENT_LABELS: Record<number, string> = {
	1: "Demande d'achat",
	2: "Bon de commande",
	3: "BC Achat",
};

// ── Couleurs badges (Bootstrap / Tailwind) ───────────────────

type BadgeVariant = {
	bg: string; // Tailwind bg
	text: string; // Tailwind text
	icon: string; // FontAwesome class
};

export function getEtatBesoinBadge(etat: Etat_Besoin): BadgeVariant {
	switch (etat) {
		case Etat_Besoin.Brouillon:
			return { bg: "bg-gray-100", text: "text-gray-600", icon: "fa-pencil" };
		case Etat_Besoin.Demande_Cloturer:
			return { bg: "bg-blue-100", text: "text-blue-700", icon: "fa-check" };
		case Etat_Besoin.Encours_Validation:
			return { bg: "bg-yellow-100", text: "text-yellow-700", icon: "fa-clock" };
		case Etat_Besoin.A_Acheter:
			return { bg: "bg-indigo-100", text: "text-indigo-700", icon: "fa-shopping-cart" };
		case Etat_Besoin.Acheter:
			return { bg: "bg-green-100", text: "text-green-700", icon: "fa-bag-shopping" };
		case Etat_Besoin.Refuser:
			return { bg: "bg-red-100", text: "text-red-700", icon: "fa-times-circle" };
		case Etat_Besoin.Valider:
			return { bg: "bg-green-200", text: "text-green-800", icon: "fa-circle-check" };
		case Etat_Besoin.Attente_Validation:
			return { bg: "bg-orange-100", text: "text-orange-700", icon: "fa-hourglass-half" };
		case Etat_Besoin.Rectifier_Demande:
			return { bg: "bg-purple-100", text: "text-purple-700", icon: "fa-rotate-left" };
		default:
			return { bg: "bg-gray-100", text: "text-gray-500", icon: "fa-circle" };
	}
}

export function getStatutBadge(statut: Statut): BadgeVariant {
	switch (statut) {
		case Statut.Valide:
			return { bg: "bg-green-100", text: "text-green-700", icon: "fa-check-circle" };
		case Statut.Rejete:
			return { bg: "bg-red-100", text: "text-red-700", icon: "fa-times-circle" };
		case Statut.EnAttente:
			return { bg: "bg-yellow-100", text: "text-yellow-700", icon: "fa-clock" };
		case Statut.Attente_Acheter:
			return { bg: "bg-blue-100", text: "text-blue-700", icon: "fa-shopping-cart" };
		case Statut.Rectifier_Demande:
			return { bg: "bg-purple-100", text: "text-purple-700", icon: "fa-pencil" };
		default:
			return { bg: "bg-gray-100", text: "text-gray-500", icon: "fa-circle" };
	}
}

export function getRoleBadge(role: Role_Validateur): BadgeVariant {
	switch (role) {
		case Role_Validateur.Demandeur:
			return { bg: "bg-gray-500", text: "text-white", icon: "fa-user" };
		case Role_Validateur.Responsable_Hierarchique:
			return { bg: "bg-cyan-500", text: "text-white", icon: "fa-user-tie" };
		case Role_Validateur.Validateur:
			return { bg: "bg-green-500", text: "text-white", icon: "fa-check-circle" };
		case Role_Validateur.Acheteur:
			return { bg: "bg-blue-500", text: "text-white", icon: "fa-shopping-cart" };
		default:
			return { bg: "bg-gray-400", text: "text-white", icon: "fa-circle" };
	}
}

// ── Avatar initiales (remplace getInitials JS) ───────────────

export function getInitials(fullName: string): string {
	if (!fullName) return "";
	const names = fullName.trim().split(" ");
	if (names.length === 1) return names[0].charAt(0).toUpperCase();
	return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
}

const AVATAR_COLORS = [
	"#007bff",
	"#28a745",
	"#ffc107",
	"#dc3545",
	"#17a2b8",
	"#6f42c1",
	"#fd7e14",
	"#20c997",
	"#6610f2",
	"#e83e8c",
];

export function getColorFromName(name: string): string {
	let hash = 0;
	for (let i = 0; i < name.length; i++) {
		hash = name.charCodeAt(i) + ((hash << 5) - hash);
	}
	return AVATAR_COLORS[Math.abs(hash % AVATAR_COLORS.length)];
}

// ── Formatage dates ──────────────────────────────────────────

export function formatDate(value?: string | null): string {
	if (!value) return "";
	const d = new Date(value);
	if (isNaN(d.getTime())) return "";
	return d.toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

export function formatDateTime(value?: string | null): string {
	if (!value) return "";
	const d = new Date(value);
	if (isNaN(d.getTime())) return "";
	return d.toLocaleString("fr-FR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

// ── Période par défaut (semaine en cours, remplace GetDatePeriodeSemaine) ─

export function getCurrentWeekRange(): { start: Date; end: Date } {
	const now = new Date();
	const day = now.getDay(); // 0=dim
	const diffToMonday = day === 0 ? -6 : 1 - day;
	const monday = new Date(now);
	monday.setDate(now.getDate() + diffToMonday);
	monday.setHours(0, 0, 0, 0);
	const sunday = new Date(monday);
	sunday.setDate(monday.getDate() + 6);
	sunday.setHours(23, 59, 59, 999);
	return { start: monday, end: sunday };
}

// ── Progression état (pour barre de progression) ─────────────

export function getProgressPercent(etat: Etat_Besoin): number {
	const map: Partial<Record<Etat_Besoin, number>> = {
		[Etat_Besoin.Brouillon]: 10,
		[Etat_Besoin.Demande_Cloturer]: 25,
		[Etat_Besoin.Encours_Validation]: 45,
		[Etat_Besoin.A_Acheter]: 65,
		[Etat_Besoin.Acheter]: 85,
		[Etat_Besoin.Valider]: 100,
		[Etat_Besoin.Refuser]: 0,
	};
	return map[etat] ?? 0;
}
