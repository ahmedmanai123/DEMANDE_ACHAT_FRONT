import ArticleForm from "@/pages/article/ArticleForm";
import ArticleList from "@/pages/article/ArticleList";
import { useState } from "react";

export default function ArticlePage() {
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

	return view === "list" ? (
		<ArticleList onEdit={handleEdit} onNew={() => handleEdit(0)} />
	) : (
		<ArticleForm cbMarq={editId} onBack={handleBack} />
	);
}
