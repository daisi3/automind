import { Bot, BookOpen, FileText, SearchCheck } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "../components/ui/sidebar";
import { useSidebar } from "../components/ui/sidebar-context";
import { cn } from "../lib/utils";

const navigationItems = [
  { to: "/chat", label: "Agent 对话", icon: Bot },
  { to: "/knowledge", label: "知识库", icon: BookOpen },
  { to: "/documents", label: "文档管理", icon: FileText },
  { to: "/retrieval", label: "检索调试", icon: SearchCheck },
];

// 渲染工作台主导航，并根据 Sidebar 状态收起文字内容。
function WorkspaceSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const showLabels = isMobile || state === "expanded";

  return (
    <Sidebar aria-label="工作区导航">
      <SidebarHeader
        className={cn(
          "h-18 items-center gap-2 p-4",
          !showLabels && "justify-center px-3",
        )}
      >
        {showLabels && (
          <div className="min-w-0 flex-1 overflow-hidden">
            <BrandLogo />
          </div>
        )}
        <SidebarTrigger />
      </SidebarHeader>

      <SidebarContent className="px-4 pt-4">
        <nav className="grid gap-1">
          {navigationItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              className={({ isActive }) =>
                cn(
                  "flex h-11 items-center rounded-lg text-lg transition-colors",
                  showLabels ? "gap-4 px-3" : "justify-center px-0",
                  isActive
                    ? "bg-zinc-100 font-medium text-zinc-950"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950",
                )
              }
              key={to}
              to={to}
              title={!showLabels ? label : undefined}
              onClick={() => {
                if (isMobile) setOpenMobile(false);
              }}
            >
              <Icon className="size-6 shrink-0" strokeWidth={1.8} />
              {showLabels && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>
      </SidebarContent>

      {showLabels && (
        <SidebarFooter className="m-4 border-t border-zinc-100 px-3 pt-4 text-xs leading-5 text-zinc-500">
          <p className="font-medium text-zinc-700">AutoMind Workspace</p>
          <p className="mt-1">React · FastAPI · SSE</p>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}

// 提供所有工作页面共享的响应式导航和主内容容器。
function AppLayout() {
  return (
    <SidebarProvider className="notranslate text-zinc-900" translate="no">
      <WorkspaceSidebar />

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-5 md:hidden">
          <BrandLogo />
          <SidebarTrigger />
        </header>

        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}

export default AppLayout;
