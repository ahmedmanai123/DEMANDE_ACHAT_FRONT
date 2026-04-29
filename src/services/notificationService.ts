import apiClient from "@/api/apiClient";

type ApiEnvelope<T> = {
	data?: T;
	Data?: T;
	message?: string;
	Message?: string;
};

export interface UserNotification {
	NU_Id?: number;
	nU_Id?: number;
	NU_UserName?: string;
	nU_UserName?: string;
	NU_Description?: string;
	nU_Description?: string;
	NU_DateTime?: string | Date;
	nU_DateTime?: string | Date;
	NU_TypeNotification?: number;
	nU_TypeNotification?: number;
	V_Id?: number;
	v_Id?: number;
	B_No?: number;
	b_No?: number;
	v_Status?: number;
	V_Status?: number;
	[key: string]: unknown;
}

const getPayload = <T>(raw: T | ApiEnvelope<T>): T => {
	const envelope = raw as ApiEnvelope<T>;
	return (envelope.Data ?? envelope.data ?? raw) as T;
};

const getErrorMessage = (error: unknown) => {
	const maybe = error as { response?: { data?: unknown }; message?: string };
	const data = maybe.response?.data as ApiEnvelope<unknown> | string | undefined;
	if (typeof data === "string" && data.trim()) return data;
	if (data && typeof data === "object") {
		const message = data.Message ?? data.message;
		if (typeof message === "string" && message.trim()) return message;
	}
	return maybe.message || "Impossible de charger les notifications.";
};

const requestWithFallback = async <T>(urls: string[]): Promise<T> => {
	let lastError: unknown;
	for (const url of urls) {
		try {
			const response = await apiClient.get<T | ApiEnvelope<T>>(url);
			return getPayload<T>(response.data);
		} catch (error) {
			lastError = error;
			const status = (error as { response?: { status?: number } }).response?.status;
			if (status === 404 || status === 405) continue;
			throw new Error(getErrorMessage(error));
		}
	}
	throw new Error(getErrorMessage(lastError));
};

export const getNotificationCount = async (): Promise<number> => {
	const payload = await requestWithFallback<number | string>([
		"/api/account/notifications/count",
		"/api/Account/notifications/count",
		"/Account/GetCount_Notification",
	]);
	const count = Number(payload);
	return Number.isFinite(count) ? count : 0;
};

export const getUserNotifications = async (): Promise<UserNotification[]> => {
	const payload = await requestWithFallback<UserNotification[]>([
		"/api/account/notifications",
		"/api/Account/notifications",
		"/Account/GetNotifications_User",
	]);
	return Array.isArray(payload) ? payload : [];
};

export const notificationService = {
	getCount: getNotificationCount,
	getUserNotifications,
};
