import { useState } from "react";
import TierList from "@/pages/tiers/FournisseursPage";

export default function TierPage() {
	const [editId, setEditId] = useState<number>(0);

	const handleEdit = (cbMarq: number) => {
		setEditId(cbMarq);
	};

	return <TierList onEdit={handleEdit} />;
}
