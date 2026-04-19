// src/pages/besoin/index.tsx
import { useState } from "react";
import BesoinList from "@/pages/besoin/BesoinList";
import BesoinAffectationPage from "@/pages/besoin/BesoinAffectationPage";
import BesoinForm from "@/pages/besoin/BesoinForm";
import BesoinGestionDemandesPage from "@/pages/besoin/BesoinGestionDemandesPage";

export default function BesoinPage() {
	const params = new URLSearchParams(window.location.search);
	const mode = params.get("mode");
	const affectationId = Number(params.get("id") || 0);
	const affectationType = Number(params.get("type") || 1);
	const [view, setView] = useState<"list" | "form">("list");
	const [editId, setEditId] = useState<number>(0);

	const handleEdit = (b_No: number) => {
		setEditId(b_No);
		setView("form");
	};

	const handleView = (b_No: number) => {
		setEditId(b_No);
		setView("form");
	};

	const handleBack = () => {
		setEditId(0);
		setView("list");
	};

	// Mode affectation (depuis gestion demandes)
	if (mode === "affectation" && affectationId > 0) {
		return <BesoinAffectationPage besoinId={affectationId} tpNo={affectationType} onBack={handleBack} />;
	}

	// Mode gestion des demandes
	if (mode === "gestion-demandes") {
		return (
			<BesoinGestionDemandesPage
				onOpenDetail={(bNo, tpNo) => {
					// Redirection vers le mode affectation avec les paramètres corrects
					window.location.search = `?mode=affectation&id=${bNo}&type=${tpNo}`;
				}}
			/>
		);
	}

	// Mode besoin affectation (direct) - À DÉFINIR SI NÉCESSAIRE
	// if (mode === "besoin-affectation") {
	// 	return <BesoinAffectationPage besoinId={affectationId} tpNo={affectationType} onBack={handleBack} />;
	// }

	// Mode besoin form (direct) - À DÉFINIR SI NÉCESSAIRE
	// if (mode === "besoin" && affectationId > 0) {
	// 	return <BesoinForm b_No={affectationId} onBack={handleBack} />;
	// }

	// Mode liste par défaut
	return view === "list" ? (
		<BesoinList onEdit={handleEdit} onNew={() => handleEdit(0)} onView={handleView} />
	) : (
		<BesoinForm b_No={editId} onBack={handleBack} />
	);
}