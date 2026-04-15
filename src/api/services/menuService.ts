import apiClient from "../apiClient";

import type { Menu } from "#/entity";

export enum MenuApi {
	Menu = "/menu",
}

const getMenuList = () => apiClient.get<Menu[]>(MenuApi.Menu, {});

export default {
	getMenuList,
};
