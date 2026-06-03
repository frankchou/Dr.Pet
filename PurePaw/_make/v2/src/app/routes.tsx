import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Home } from "./components/Home";
import { DietRecord } from "./components/DietRecord";
import { Diary } from "./components/Diary";
import { Settings } from "./components/Settings";
import { Snapshot } from "./components/Snapshot";
import { News } from "./components/News";
import { Nutritionist } from "./components/Nutritionist";
import { Login } from "./components/Login";

export const router = createBrowserRouter([
  { path: "/login", Component: Login },
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "nutritionist", Component: Nutritionist },
      { path: "diary", Component: Diary },
      { path: "settings", Component: Settings },
      { path: "snapshot", Component: Snapshot },
      { path: "news", Component: News },
    ],
  },
]);
