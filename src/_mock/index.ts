import { setupWorker } from "msw/browser";
import { mockTokenExpired } from "./handlers/_demo";
import { menuList } from "./handlers/_menu";
import { signIn, userList } from "./handlers/_user";

const enableAuthMock = import.meta.env.VITE_APP_ENABLE_AUTH_MOCK === "true";

const handlers = [userList, mockTokenExpired, menuList, ...(enableAuthMock ? [signIn] : [])];
const worker = setupWorker(...handlers);

export { worker };
