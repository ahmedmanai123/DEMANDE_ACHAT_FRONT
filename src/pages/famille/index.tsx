import { useState } from "react";
import FamilleForm from "./FamilleFormPage";
import FamillesPage from "./FamillesPage";

export default function FamillePage() {
	const [view, setView] = useState<"list" | "form">("list");
	const [editId, setEditId] = useState<number>(0);

	const handleEdit = (cbMarq: number) => {
		setEditId(cbMarq);
		setView("form");
	};

	const handleBack = () => {
		setEditId(0);
		setView("list");
	};

	return view === "list" ? <FamillesPage onEdit={handleEdit} /> : <FamilleForm cbMarq={editId} onBack={handleBack} />;
}
