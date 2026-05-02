import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import BesoinForm from "./BesoinForm";
import BesoinList from "./BesoinList";

export default function BesoinPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const viewParam = searchParams.get("view");
	const idParam = searchParams.get("id");

	const [view, setView] = useState<"list" | "form">(viewParam === "details" ? "form" : "list");
	const [editId, setEditId] = useState<number>(idParam ? Number(idParam) : 0);

	useEffect(() => {
		if (viewParam === "details" && idParam) {
			setEditId(Number(idParam));
			setView("form");
		}
	}, [viewParam, idParam]);

	const handleEdit = (b_No: number) => {
		setEditId(b_No);
		setView("form");
		setSearchParams({ view: "details", id: String(b_No) });
	};

	const handleView = (b_No: number) => {
		// Mode consultation (réutilise le mode edit pour l'instant)
		handleEdit(b_No);
	};

	const handleNew = () => {
		setEditId(0); // 0 = Création
		setView("form");
		setSearchParams({});
	};

	const handleBack = () => {
		setEditId(0);
		setView("list");
		setSearchParams({});
	};

	return view === "list" ? (
		<BesoinList onEdit={handleEdit} onView={handleView} onNew={handleNew} />
	) : (
		<BesoinForm b_No={editId} onBack={handleBack} />
	);
}
