import { createContext, useContext } from "react";

type SidebarState = "expanded" | "collapsed";

interface SidebarContextValue {
  state: SidebarState;
  isMobile: boolean;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

// 读取 Sidebar 展开状态与响应式控制方法。
function useSidebar() {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error("useSidebar 必须在 SidebarProvider 内使用");
  }

  return context;
}

export { SidebarContext, useSidebar };
export type { SidebarContextValue };
