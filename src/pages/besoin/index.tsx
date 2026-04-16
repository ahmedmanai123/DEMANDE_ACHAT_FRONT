// src/pages/besoin/index.tsx
import { useState } from "react";
import BesoinList from "@/pages/besoin/BesoinList";
import BesoinForm from "@/pages/besoin/BesoinForm";

export default function BesoinPage() {
	const [view, setView] = useState<"list" | "form">("list");
	const [editId, setEditId] = useState<number>(0);

	const handleEdit = (b_No: number) => {
		setEditId(b_No);
		setView("form");
	};

	const handleBack = () => {
		setEditId(0);
		setView("list");
	};

	return view === "list" ? (
		<BesoinList
			onEdit={handleEdit}
			onNew={() => handleEdit(0)}
			onView={function (b_No: number): void {
				throw new Error("Function not implemented.");
			}}
		/>
	) : (
		<BesoinForm b_No={editId} onBack={handleBack} />
	);
}
