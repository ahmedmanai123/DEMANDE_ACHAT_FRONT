// ============================================================
// hooks/usePermissions.ts
// ============================================================

import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export function usePermissions() {
	const { user, loading } = useContext(AuthContext);

	/**
	 * Vérifie si l'utilisateur a une permission donnée.
	 * Remplace : AuthorizationService.HavePermission(User, Type_Autorisation, Type_Acces)
	 *
	 * Exemples :
	 *   can("Demande_Besoin", "Creer")
	 *   can("Gestion_Demandes", "Consulter")
	 */
	const can = (autorisation: string, acces: string): boolean => {
		if (!user) return false;
		// Administrateur a tous les droits (comme votre logique C#)
		if (user.typeCompte === "Administrateur") return true;

		return user.permissions.some((p) => p.autorisation === autorisation && p.acces === acces);
	};

	/** Raccourci : l'utilisateur est-il administrateur ? */
	const isAdmin = user?.typeCompte === "Administrateur";

	/** Raccourci : l'utilisateur est-il acheteur ? */
	const isAcheteur = user?.typeCompte === "Acheteur";

	return { can, user, isAdmin, isAcheteur, loading };
}
