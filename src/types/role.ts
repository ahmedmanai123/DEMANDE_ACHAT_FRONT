export interface Role {
	rO_No: number;
	rO_Code: string;
	rO_Intitule: string;
	rO_TypeRole: number;
	rO_Archiver: boolean;
	rO_AdminBySystem: boolean;
	rO_ValTypeRole?: string;
	rO_CreateurName?: string;
	rO_DateCreation?: Date;
	rO_UpdatedName?: string;
	rO_DateModification?: Date;
}

export interface RoleDto {
	RO_No?: number;
	RO_Code?: string;
	RO_Intitule?: string;
	RO_TypeRole?: number;
	RO_Archiver?: boolean | string;
	Page?: number;
	PageSize?: number;
}

export interface DroitAccess {
	DA_No: string;
	DA_Autoriser: boolean | string;
	DA_Type_Acces: number;
	DA_ValType_Acces: string;
	Group: string;
	IdGroup: string;
	IdGroup_Parent: string;
}

export interface UserRole {
	Id: string;
	UserName: string;
	Email: string;
	LockoutEnd?: Date;
	LockoutEnabled: boolean;
	Picture?: string;
	EI_CreateurName?: string;
	EI_DateCreation?: Date;
	EI_UpdatedName?: string;
	EI_DateModification?: Date;
}
