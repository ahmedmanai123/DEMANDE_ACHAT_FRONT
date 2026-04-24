// Account types for user management

export enum TypeCompte {
	Administrateur = 0,
	Approbateur = 1,
	Back_office = 2,
	Demandeur = 3,
	Acheteur = 4,
}

export interface UserDto {
	id?: string;
	userName: string;
	us_UserIntitule: string;
	email: string;
	password?: string;
	confirmPassword?: string;
	us_TypeCompte: TypeCompte;
	ro_No: number;
	us_Image?: string;
	idSalarie?: number | null;
	idResponsable?: string;
	us_Depots?: number[];
	profilePic?: File | null;
	picture?: string;
	phoneNumber?: string;
	lockoutEnd?: string | null;
	lockoutEnabled?: boolean;
}

export interface Role {
	ro_No: number;
	ro_Intitule: string;
	selected?: boolean;
}

export interface SelectOption {
	text: string;
	value: string | number;
	selected?: boolean;
}

export interface UserFilter {
	pageIndex?: number;
	pageSize?: number;
	search?: string;
	us_TypeCompte?: TypeCompte | -1;
	ro_No?: number;
}

export interface GridResponse<T> {
	data: T[];
	total?: number; // For frontend compatibility
	itemsCount?: number; // Backend C# property name
	pageIndex: number;
	pageSize: number;
}

export interface ChangePasswordModel {
	id: string;
	email: string;
	oldPassword: string;
	newPassword: string;
	confirmPassword: string;
}
