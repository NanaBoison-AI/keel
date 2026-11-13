import { createHashRouter, RouterProvider } from "react-router";
import { ToastProvider } from "../components/Toast";
import { Layout } from "./Layout";
import { Today } from "./Today";
import { Journey } from "./Journey";
import { Deck } from "./Deck";
import { Library } from "./Library";
import { Notebook } from "./Notebook";
import { Settings } from "./Settings";

export const routes = [
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Today /> },
      { path: "/journey", element: <Journey /> },
      { path: "/deck/:packId", element: <Deck /> },
      { path: "/library", element: <Library /> },
      { path: "/notebook", element: <Notebook /> },
      { path: "/settings", element: <Settings /> },
    ],
  },
];

const router = createHashRouter(routes);

export function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  );
}
