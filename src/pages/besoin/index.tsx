// src/pages/besoin/index.tsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import BesoinAffectationPage from "@/pages/besoin/BesoinAffectationPage";
import BesoinForm from "@/pages/besoin/BesoinForm";
import BesoinGestionDemandesPage from "@/pages/besoin/BesoinGestionDemandesPage";
import BesoinList from "@/pages/besoin/BesoinList";
import BesoinValidationPage from "@/pages/besoin/BesoinValidationPage";

export default function BesoinPage() {
	const [searchParams, setSearchParams] = useSearchParams();

	const mode             = searchParams.get("mode");
	const affectationId    = Number(searchParams.get("id")   || 0);
	const validationBesoinId = Number(searchParams.get("b_No") || 0);
	// 0 = type non fourni explicitement → auto-détecté depuis les données de la demande
	const typeParam        = searchParams.get("type");
	const affectationType  = typeParam !== null ? Number(typeParam) : 0;

	const [view,   setView]   = useState<"list" | "form">("list");
	const [editId, setEditId] = useState<number>(0);

	// ── Reset au clic sidebar ──────────────────────────────────────────────────
	// Quand l'URL revient à /besoins (mode null) depuis n'importe quel sous-état,
	// on force le retour à la liste.
	useEffect(() => {
		if (!mode) {
			setView("list");
			setEditId(0);
		}
	}, [mode]);

	// ── Navigation helpers ────────────────────────────────────────────────────

	const goToForm = (b_No: number) => {
		setEditId(b_No);
		setView("form");
	};

	const goToList = () => {
		setView("list");
		setEditId(0);
		// Nettoyer les params URL sans recharger la page
		setSearchParams({}, { replace: true });
	};

	// ── Modes URL ─────────────────────────────────────────────────────────────

	// Affectation (depuis gestion demandes ou bon de commande acheteur)
	if (mode === "affectation" && affectationId > 0) {
		return (
			<BesoinAffectationPage
				besoinId={affectationId}
				tpNo={affectationType}
				onBack={goToList}
			/>
		);
	}

	// Validation directe via URL
	if (mode === "validation" && affectationId > 0 && validationBesoinId > 0) {
		return (
			<BesoinValidationPage
				validationId={affectationId}
				besoinId={validationBesoinId}
				onBack={goToList}
			/>
		);
	}

	// Gestion des demandes (acheteur)
	if (mode === "gestion-demandes") {
		return (
			<BesoinGestionDemandesPage
				onOpenDetail={(bNo, tpNo) => {
					setSearchParams(
						{ mode: "affectation", id: String(bNo), type: String(tpNo) },
						{ replace: false },
					);
				}}
			/>
		);
	}

	// ── Défaut : liste ou formulaire ──────────────────────────────────────────
	return view === "list" ? (
		<BesoinList
			onEdit={goToForm}
			onNew={() => goToForm(0)}
			onView={goToForm}
		/>
	) : (
		<BesoinForm b_No={editId} onBack={goToList} />
	);
}
