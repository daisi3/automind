import { Navigate, createBrowserRouter } from "react-router-dom";
import AppLayout from "../layouts/AppLayout";
import ChatPage from "../pages/chat/ChatPage";
import ComingSoonPage from "../pages/ComingSoonPage";
import KnowledgePage from "../pages/knowledge/KnowledgePage";

// 集中维护页面路径，页面内部不负责路由跳转结构。
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/chat" replace /> },
      { path: "/chat", element: <ChatPage /> },
      { path: "/knowledge", element: <KnowledgePage /> },
      { path: "/documents", element: <ComingSoonPage title="Documents" /> },
      {
        path: "/retrieval",
        element: <ComingSoonPage title="Retrieval Debug" />,
      },
      { path: "*", element: <Navigate to="/chat" replace /> },
    ],
  },
]);
