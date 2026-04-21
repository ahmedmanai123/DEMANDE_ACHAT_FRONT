import { useLocation, useSearchParams } from "react-router";
import { TypeSage } from "@/types/besoin";
import DocumentDetailPage from "./DocumentDetailPage";
import DocumentListPage from "./DocumentListPage";

export default function DocumentPage() {
	const [searchParams] = useSearchParams();
	const location = useLocation();
	const epNumero = searchParams.get("epNumero");

	// If epNumero is provided, show detail page
	if (epNumero !== null) {
		return <DocumentDetailPage />;
	}

	// Otherwise, determine which list to show based on path
	const path = location.pathname;
	if (path.includes("bons-commande")) {
		return <DocumentListPage tpNo={TypeSage.BC_Achat} />;
	}

	// Default to Demandes des prix
	return <DocumentListPage tpNo={TypeSage.Demande_Achat} />;
}
