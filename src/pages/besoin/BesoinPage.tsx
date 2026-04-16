import { useState } from "react";
import BesoinForm from "./BesoinForm";
import BesoinList from "./BesoinList";

export default function BesoinPage() {
	const [view, setView] = useState<"list" | "form">("list");
	const [editId, setEditId] = useState<number>(0);

	const handleEdit = (b_No: number) => {
		setEditId(b_No);
		setView("form");
	};

	const handleView = (b_No: number) => {
		// Mode consultation (réutilise le mode edit pour l'instant)
		handleEdit(b_No);
	};

	const handleNew = () => {
		setEditId(0); // 0 = Création
		setView("form");
	};

	const handleBack = () => {
		setEditId(0);
		setView("list");
	};

	return view === "list" ? (
		<BesoinList onEdit={handleEdit} onView={handleView} onNew={handleNew} />
	) : (
		<BesoinForm b_No={editId} onBack={handleBack} />
	);
} // src/router/index.ts
