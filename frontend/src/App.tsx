import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";

// 挂载应用路由入口。
function App() {
  return <RouterProvider router={router} />;
}

export default App;
