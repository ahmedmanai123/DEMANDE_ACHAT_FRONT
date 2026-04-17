import apiClient from "../apiClient";

import type { UserInfo, UserToken } from "#/entity";
import type { AxiosError, AxiosResponse } from "axios";

export interface SignInReq {
	username: string;
	password: string;
}

export interface SignUpReq extends SignInReq {
	email: string;
}
export type SignInRes = UserToken & { user: UserInfo };

export enum UserApi {
	SignIn = "/auth/signin",
	SignUp = "/auth/signup",
	Logout = "/auth/logout",
	Refresh = "/auth/refresh",
	User = "/user",
}

type RawRecord = Record<string, unknown>;

const API_BASE_URL = (import.meta.env.VITE_APP_API_BASE_URL as string | undefined) || "/api";

const normalizeApiBase = (baseUrl: string) => baseUrl.replace(/\/+$/, "");

const buildApiUrl = (path: string) => {
	const normalizedBase = normalizeApiBase(API_BASE_URL);
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return `${normalizedBase}${normalizedPath}`;
};

const resolveAuthEndpoint = (rawEndpoint?: string) => {
	if (!rawEndpoint) return undefined;
	const endpoint = rawEndpoint.trim();
	if (!endpoint) return undefined;
	if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) return endpoint;
	if (endpoint.startsWith("/api/")) return endpoint;
	return endpoint.startsWith("/") ? buildApiUrl(endpoint) : buildApiUrl(`/${endpoint}`);
};

const SIGN_IN_ENDPOINTS = Array.from(
	new Set(
		[
			resolveAuthEndpoint(import.meta.env.VITE_APP_AUTH_LOGIN_ENDPOINT as string | undefined),
			buildApiUrl("/account/login"),
			buildApiUrl("/auth/login"),
			buildApiUrl(UserApi.SignIn),
		].filter((endpoint): endpoint is string => Boolean(endpoint)),
	),
);

const toRecord = (value: unknown): RawRecord => {
	if (value && typeof value === "object" && !Array.isArray(value)) return value as RawRecord;
	return {};
};

const toStringValue = (value: unknown): string | undefined => {
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed ? trimmed : undefined;
	}
	if (typeof value === "number") return String(value);
	return undefined;
};

const decodeJwtPayload = (token: string): RawRecord => {
	try {
		const payload = token.split(".")[1];
		if (!payload) return {};

		const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
		const paddedPayload = normalizedPayload + "=".repeat((4 - (normalizedPayload.length % 4)) % 4);
		const decoded = atob(paddedPayload);
		return toRecord(JSON.parse(decoded));
	} catch {
		return {};
	}
};

const normalizePermissions = (rawPermissions: unknown): UserInfo["permissions"] => {
	if (!Array.isArray(rawPermissions)) return [];

	return rawPermissions
		.map((permission) => {
			if (typeof permission === "string") {
				return {
					id: permission,
					name: permission,
					code: permission,
				};
			}

			const p = toRecord(permission);
			const code = toStringValue(p.code ?? p.Code ?? p.permission ?? p.Permission);
			const id = toStringValue(p.id ?? p.Id ?? code);
			const name = toStringValue(p.name ?? p.Name ?? code);

			if (!code) return undefined;
			return {
				id: id ?? code,
				name: name ?? code,
				code,
			};
		})
		.filter((permission): permission is NonNullable<typeof permission> => Boolean(permission));
};

const normalizeRoles = (rawRoles: unknown): UserInfo["roles"] => {
	if (!Array.isArray(rawRoles)) return [];

	return rawRoles
		.map((role) => {
			if (typeof role === "string") {
				return {
					id: role,
					name: role,
					code: role,
				};
			}

			const r = toRecord(role);
			const code = toStringValue(r.code ?? r.Code ?? r.role ?? r.Role ?? r.name ?? r.Name);
			const id = toStringValue(r.id ?? r.Id ?? code);
			const name = toStringValue(r.name ?? r.Name ?? code);

			if (!code) return undefined;
			return {
				id: id ?? code,
				name: name ?? code,
				code,
			};
		})
		.filter((role): role is NonNullable<typeof role> => Boolean(role));
};

const normalizeUser = (rawUserValue: unknown, accessToken: string): UserInfo => {
	const rawUser = toRecord(rawUserValue);
	const claims = decodeJwtPayload(accessToken);

	const id =
		toStringValue(rawUser.id ?? rawUser.Id ?? rawUser.userId ?? rawUser.UserId) ||
		toStringValue(claims.sub ?? claims.nameid ?? claims.NameIdentifier) ||
		"";

	const username =
		toStringValue(rawUser.username ?? rawUser.userName ?? rawUser.UserName ?? rawUser.unique_name) ||
		toStringValue(claims.unique_name ?? claims.name ?? claims.preferred_username ?? claims.email) ||
		"";

	const email = toStringValue(rawUser.email ?? rawUser.Email) || toStringValue(claims.email ?? claims.upn) || "";

	const avatar =
		toStringValue(rawUser.avatar ?? rawUser.Avatar ?? rawUser.picture ?? rawUser.Picture ?? rawUser.US_Image) || "";

	return {
		id,
		username: username || email || id,
		email,
		avatar,
		roles: normalizeRoles(rawUser.roles ?? rawUser.Roles),
		permissions: normalizePermissions(rawUser.permissions ?? rawUser.Permissions),
	};
};

const unwrapResponseBody = (rawBody: unknown): RawRecord => {
	if (typeof rawBody === "string") return { accessToken: rawBody };

	let current = toRecord(rawBody);

	for (let i = 0; i < 3; i += 1) {
		const hasToken = Boolean(
			toStringValue(
				current.accessToken ?? current.AccessToken ?? current.token ?? current.Token ?? current.jwt ?? current.Jwt,
			),
		);

		if (hasToken) return current;

		if (typeof current.data === "string") {
			return { accessToken: current.data };
		}

		const next = toRecord(current.data);
		if (Object.keys(next).length === 0) return current;
		current = next;
	}

	return current;
};

const normalizeSignInResponse = (rawResponse: unknown): SignInRes => {
	const body = unwrapResponseBody(rawResponse);

	const accessToken = toStringValue(
		body.accessToken ?? body.AccessToken ?? body.token ?? body.Token ?? body.jwt ?? body.Jwt,
	);
	const refreshToken = toStringValue(body.refreshToken ?? body.RefreshToken ?? body.refresh ?? body.Refresh);

	if (!accessToken) {
		throw new Error("Réponse de connexion invalide: token manquant.");
	}

	const rawUser = body.user ?? body.User ?? body.contact ?? body.Contact ?? {};
	const user = normalizeUser(rawUser, accessToken);

	return {
		accessToken,
		refreshToken,
		user,
	};
};

const extractAxiosMessage = (error: AxiosError<{ message?: string }>) => {
	const data = toRecord(error.response?.data);
	return toStringValue(data.message ?? data.Message) || error.message || "Connexion impossible.";
};

const signin = async (data: SignInReq): Promise<SignInRes> => {
	const payload = {
		username: data.username,
		userName: data.username,
		email: data.username,
		password: data.password,
	};

	let lastError: unknown;

	for (const endpoint of SIGN_IN_ENDPOINTS) {
		try {
			const response = await apiClient.post(endpoint, payload, {});
			return normalizeSignInResponse(response);
		} catch (error) {
			const axiosError = error as AxiosError<{ message?: string }>;
			const status = axiosError.response?.status;

			// Continuer uniquement si endpoint introuvable/non supporté
			if (status === 404 || status === 405) {
				lastError = error;
				continue;
			}

			throw new Error(extractAxiosMessage(axiosError));
		}
	}

	if (lastError) {
		const axiosError = lastError as AxiosError<{ message?: string }>;
		throw new Error(extractAxiosMessage(axiosError));
	}

	throw new Error("Aucun endpoint de connexion valide trouvé.");
};

const signup = async (data: SignUpReq): Promise<SignInRes> => {
	const response = await apiClient.post(buildApiUrl(UserApi.SignUp), data as unknown as Record<string, unknown>, {});
	return normalizeSignInResponse(response);
};

const logout = () => apiClient.get(buildApiUrl(UserApi.Logout), {});

const findById = async (id: string): Promise<UserInfo[]> => {
	const response = (await apiClient.get(buildApiUrl(`${UserApi.User}/${id}`), {})) as
		| AxiosResponse<UserInfo[]>
		| UserInfo[];
	if (Array.isArray(response)) return response;
	return (response.data as UserInfo[]) ?? [];
};

export default {
	signin,
	signup,
	findById,
	logout,
};
