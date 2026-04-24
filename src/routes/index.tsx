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
		path: "/besoin-types",
		component: () => import("@/pages/besoin/components/BesoinTypePage"),
	},
	{
		order: 13,
		path: "/document",
		component: () => import("@/pages/document/index"),
	},
	// Account management routes
	{
		order: 20,
		path: "/account/users",
		component: () => import("@/pages/sys/account/UsersPage"),
	},
	{
		order: 21,
		path: "/account/users/new",
		component: () => import("@/pages/sys/account/UserForm"),
	},
	{
		order: 22,
		path: "/account/users/edit/:id",
		component: () => import("@/pages/sys/account/UserForm"),
	},
	//
];
