import { type DroitAccess, type Role, type RoleDto, UserRole } from "../../types/role";
import apiClient from "../apiClient";

export const roleService = {
	getRoles: async (filter?: RoleDto) => {
		const response = await apiClient.get("/api/Role", { params: filter });
		return response.data;
	},

	getActifRoles: async () => {
		const response = await apiClient.get("/api/Role/actifs");
		return response.data;
	},

	getRole: async (id: number) => {
		const response = await apiClient.get(`/api/Role/${id}`);
		return response.data;
	},

	getMaxCodeRole: async () => {
		const response = await apiClient.get("/api/Role/next-code");
		return response.data;
	},

	getByTypeCompte: async (filter: number, role: number = 0) => {
		const response = await apiClient.get("/api/Role/by-type-compte", { params: { filter, role } });
		return response.data;
	},

	addOrUpdateRole: async (role: Role) => {
		const response = await apiClient.post("/api/Role", role);
		return response.data;
	},

	deleteRole: async (id: number) => {
		const response = await apiClient.delete(`/api/Role/${id}`);
		return response.data;
	},

	getUserAccess: async (ro_No: number) => {
		const response = await apiClient.get(`/api/Role/${ro_No}/access`);
		return response.data;
	},

	checkAdminSystem: async (ro_No: number) => {
		const response = await apiClient.get(`/api/Role/${ro_No}/is-admin`);
		return response.data;
	},

	addOrUpdateDroitAcces: async (access: DroitAccess) => {
		try {
			const response = await apiClient.post("/api/Role/access", null, { params: access });
			return response.data;
		} catch (error: any) {
			console.error("Backend error:", error.response?.data);
			console.error("Validation errors:", error.response?.data?.errors);
			console.error("Error status:", error.response?.status);
			console.error("Error message:", error.message);
			throw error;
		}
	},

	heriterRole: async (idRoleSrc: number, idRoleDest: number) => {
		const response = await apiClient.post("/api/Role/heriter", null, { params: { idRoleSrc, idRoleDest } });
		return response.data;
	},

	getUserRolesId: async (reno: number) => {
		const response = await apiClient.get(`/api/Role/${reno}/users-ids`);
		return response.data;
	},

	getUsersTypeCompte: async (ro_No: number) => {
		const response = await apiClient.get(`/api/Role/${ro_No}/users`);
		return response.data;
	},

	addOrUpdateUsersRole: async (idRole: number, idUser: string, ecraser: boolean = false) => {
		const response = await apiClient.post("/api/Role/affect-user", null, { params: { idRole, idUser, ecraser } });
		return response.data;
	},

	affectUserRoles: async (reno: number, idUsers: string[]) => {
		const response = await apiClient.post(`/api/Role/${reno}/affect-users`, idUsers);
		return response.data;
	},
};
