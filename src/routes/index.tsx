export const routes = [
	{
		order: 10,
		path: "/articles",
		component: () => import("@/pages/article/index"),
	},
	{
		order: 11,
		path: "/besoins",
		component: () => import("@/pages/besoin/index"),
	},
	{
		order: 12,
		path: "/document",
		component: () => import("@/pages/document/index"),
	},
	//
];
