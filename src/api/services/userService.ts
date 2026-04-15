import apiClient from "../apiClient";

import type { UserInfo, UserToken } from "#/entity";

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

const signin = (data: SignInReq) => apiClient.post<SignInRes>(UserApi.SignIn, data as any, {});
const signup = (data: SignUpReq) => apiClient.post<SignInRes>(UserApi.SignUp, data as any, {});
const logout = () => apiClient.get(UserApi.Logout, {});
const findById = (id: string) => apiClient.get<UserInfo[]>(`${UserApi.User}/${id}`, {});

export default {
	signin,
	signup,
	findById,
	logout,
};
