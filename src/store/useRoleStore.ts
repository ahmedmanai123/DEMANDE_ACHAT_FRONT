import { create } from "zustand";
import { roleService } from "../api/services/roleService";
import { DroitAccess, type Role, type RoleDto, type UserRole } from "../types/role";

interface RoleState {
	roles: Role[];
	actifRoles: Role[];
	selectedRole: Role | null;
	loading: boolean;
	error: string | null;

	// Matrix Access
	droitAccess: any[]; // You can map to a specific type

	// Users
	users: UserRole[];

	fetchRoles: (filter?: RoleDto) => Promise<void>;
	fetchActifRoles: () => Promise<void>;
	setSelectedRole: (role: Role | null) => void;
	createRole: (role: Role) => Promise<boolean>;
	updateRole: (role: Role) => Promise<boolean>;
	deleteRole: (id: number) => Promise<boolean>;

	fetchRoleAccess: (ro_No: number) => Promise<void>;
	fetchRoleUsers: (ro_No: number) => Promise<void>;
	addOrUpdateDroitAcces: (access: any) => Promise<boolean>;

	// Additional methods
	checkAdminRole: (ro_No: number) => Promise<boolean>;
	heriterRole: (idRoleSrc: number, idRoleDest: number) => Promise<boolean>;
	addOrUpdateUsersRole: (idRole: number, idUser: string, ecraser?: boolean) => Promise<boolean>;
	getMaxCodeRole: () => Promise<string>;
	isAdminRole: (role: any) => boolean;
}

export const useRoleStore = create<RoleState>((set, get) => ({
	roles: [],
	actifRoles: [],
	selectedRole: null,
	loading: false,
	error: null,
	droitAccess: [],
	users: [],

	fetchRoles: async (filter) => {
		set({ loading: true, error: null });
		try {
			const data = await roleService.getRoles(filter);
			console.log("API Response from getRoles:", data);

			// Handle different response formats
			let rolesData = [];
			if (Array.isArray(data)) {
				rolesData = data;
			} else if (data && Array.isArray(data.data)) {
				rolesData = data.data;
			} else if (data && Array.isArray(data.roles)) {
				rolesData = data.roles;
			} else if (data && typeof data === "object") {
				// Try to extract array from object
				const values = Object.values(data);
				rolesData = values.find(Array.isArray) || [];
			}

			console.log("Processed roles data for fetchRoles:", rolesData);
			set({ roles: rolesData, loading: false });
		} catch (error: any) {
			console.error("Error fetching roles:", error);
			set({ error: error.message || "Failed to fetch roles", loading: false });
		}
	},

	fetchActifRoles: async () => {
		set({ loading: true, error: null });
		try {
			const data = await roleService.getActifRoles();
			console.log("API Response from getActifRoles:", data);

			// Check if response is HTML (API routing issue)
			if (typeof data === "string" && data.includes("<!DOCTYPE html>")) {
				throw new Error(
					"API endpoint not found. Check if the backend server is running and proxy configuration is correct.",
				);
			}

			// Handle different response formats
			let rolesData = [];
			if (Array.isArray(data)) {
				rolesData = data;
			} else if (data && Array.isArray(data.data)) {
				rolesData = data.data;
			} else if (data && Array.isArray(data.roles)) {
				rolesData = data.roles;
			} else if (data && typeof data === "object") {
				// Try to extract array from object
				const values = Object.values(data);
				rolesData = values.find(Array.isArray) || [];
			}

			console.log("Processed roles data:", rolesData);

			// Auto-select admin role if no role is selected
			const adminRole = rolesData.find(
				(role: any) =>
					role.rO_Intitule?.toLowerCase().includes("administrateur") ||
					role.rO_Code?.toLowerCase().includes("admin") ||
					role.rO_TypeRole === 0,
			);

			if (adminRole && !get().selectedRole) {
				console.log("Auto-selecting admin role:", adminRole);
				set({ selectedRole: adminRole });
			}

			set({ actifRoles: rolesData, loading: false });
		} catch (error: any) {
			console.error("Error fetching actif roles:", error);
			set({ error: error.message || "Failed to fetch roles", actifRoles: [], loading: false });
		}
	},

	setSelectedRole: (role) => set({ selectedRole: role }),

	createRole: async (role) => {
		set({ loading: true, error: null });
		try {
			await roleService.addOrUpdateRole(role);
			await get().fetchActifRoles();
			set({ loading: false });
			return true;
		} catch (error: any) {
			set({ error: error.message, loading: false });
			return false;
		}
	},

	updateRole: async (role) => {
		set({ loading: true, error: null });
		try {
			// Check if trying to update admin role
			if (
				role &&
				(role.rO_Intitule?.toLowerCase().includes("administrateur") ||
					role.rO_Code?.toLowerCase().includes("admin") ||
					role.rO_TypeRole === 0)
			) {
				throw new Error("Le rôle administrateur ne peut pas être modifié");
			}

			await roleService.addOrUpdateRole(role);
			await get().fetchActifRoles();
			set({ loading: false });
			return true;
		} catch (error: any) {
			set({ error: error.message, loading: false });
			return false;
		}
	},

	deleteRole: async (id) => {
		set({ loading: true, error: null });
		try {
			// Check if trying to delete admin role
			const roleToDelete = get().actifRoles.find((role: any) => role.rO_No === id);
			if (
				roleToDelete &&
				(roleToDelete.rO_Intitule?.toLowerCase().includes("administrateur") ||
					roleToDelete.rO_Code?.toLowerCase().includes("admin") ||
					roleToDelete.rO_TypeRole === 0)
			) {
				throw new Error("Le rôle administrateur ne peut pas être supprimé");
			}

			await roleService.deleteRole(id);
			await get().fetchActifRoles();
			set({ loading: false });
			return true;
		} catch (error: any) {
			set({ error: error.message, loading: false });
			return false;
		}
	},

	fetchRoleAccess: async (ro_No: number) => {
		set({ loading: true, error: null });
		try {
			console.log("Fetching role access for RO_No:", ro_No);
			const data = await roleService.getUserAccess(ro_No);
			console.log("Role access data:", data);

			// Check if response is HTML (API routing issue)
			if (typeof data === "string" && data.includes("<!DOCTYPE html>")) {
				throw new Error("Role access endpoint not found. Check if the endpoint exists on the backend server.");
			}

			// Handle different response formats
			let accessData = [];
			if (Array.isArray(data)) {
				accessData = data;
			} else if (data && Array.isArray(data.data)) {
				accessData = data.data;
			} else if (data && Array.isArray(data.access)) {
				accessData = data.access;
			} else if (data && typeof data === "object") {
				// Try to extract array from object
				const values = Object.values(data);
				accessData = values.find(Array.isArray) || [];
			}

			console.log("Processed access data:", accessData);
			set({ droitAccess: accessData, loading: false });
		} catch (error: any) {
			console.error("Error fetching role access:", error);
			set({ error: error.message || "Failed to fetch role access", loading: false });
		}
	},

	fetchRoleUsers: async (ro_No) => {
		set({ loading: true, error: null });
		try {
			const data = await roleService.getUsersTypeCompte(ro_No);
			set({ users: data, loading: false });
		} catch (error: any) {
			set({ error: error.message, loading: false });
		}
	},

	checkAdminRole: async (ro_No: number) => {
		try {
			const data = await roleService.checkAdminSystem(ro_No);
			return data.isAdmin;
		} catch (error: any) {
			console.error("Error checking admin role:", error);
			return false;
		}
	},

	heriterRole: async (idRoleSrc: number, idRoleDest: number) => {
		set({ loading: true, error: null });
		try {
			await roleService.heriterRole(idRoleSrc, idRoleDest);
			// Refresh role access after inheritance
			if (get().selectedRole) {
				// biome-ignore lint/style/noNonNullAssertion: <explanation>
				await get().fetchRoleAccess(get().selectedRole!.rO_No);
			}
			set({ loading: false });
			return true;
		} catch (error: any) {
			set({ error: error.message, loading: false });
			return false;
		}
	},

	addOrUpdateUsersRole: async (idRole: number, idUser: string, ecraser = false) => {
		set({ loading: true, error: null });
		try {
			await roleService.addOrUpdateUsersRole(idRole, idUser, ecraser);
			// Refresh users list
			if (get().selectedRole) {
				// biome-ignore lint/style/noNonNullAssertion: <explanation>
				await get().fetchRoleUsers(get().selectedRole!.rO_No);
			}
			set({ loading: false });
			return true;
		} catch (error: any) {
			set({ error: error.message, loading: false });
			return false;
		}
	},

	getMaxCodeRole: async () => {
		try {
			const response = await roleService.getMaxCodeRole();
			return response?.code || "";
		} catch (error: any) {
			console.error("Error getting max code:", error);
			return "";
		}
	},

	addOrUpdateDroitAcces: async (access: any) => {
		set({ loading: true, error: null });
		try {
			await roleService.addOrUpdateDroitAcces(access);
			set({ loading: false });
			return true;
		} catch (error: any) {
			set({ error: error.message, loading: false });
			return false;
		}
	},

	isAdminRole: (role: any) => {
		return (
			role &&
			(role.rO_Intitule?.toLowerCase().includes("administrateur") ||
				role.rO_Code?.toLowerCase().includes("admin") ||
				role.rO_TypeRole === 0)
		);
	},
}));
