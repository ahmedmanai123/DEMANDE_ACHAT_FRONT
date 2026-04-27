import { setupWorker } from "msw/browser";
import { mockTokenExpired } from "./handlers/_demo";
import {
	createFamille,
	deleteFamille,
	familleList,
	getCatalogues,
	getFamilleById,
	getFamillesCentral,
	searchFamilles,
	updateFamille,
} from "./handlers/_familleData";
import { menuList } from "./handlers/_menu";
import { signIn, userList } from "./handlers/_user";

const enableAuthMock = import.meta.env.VITE_APP_ENABLE_AUTH_MOCK === "true";

const handlers = [
	userList,
	mockTokenExpired,
	menuList,
	familleList,
	getFamilleById,
	createFamille,
	updateFamille,
	deleteFamille,
	getCatalogues,
	getFamillesCentral,
	searchFamilles,
	...(enableAuthMock ? [signIn] : []),
];
const worker = setupWorker(...handlers);

export { worker };
