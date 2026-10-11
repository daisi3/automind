import { useCallback, useEffect, useMemo, useState, type ComponentProps } from "react";
import { PanelLeft } from "lucide-react";
import { useIsMobile } from "../../hooks/use-mobile";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import {
  SidebarContext,
  useSidebar,
  type SidebarContextValue,
} from "./sidebar-context";

// 统一维护桌面折叠状态和移动端抽屉状态。
function SidebarProvider({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(true);
  const [openMobile, setOpenMobile] = useState(false);

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setOpenMobile((currentOpen) => !currentOpen);
      return;
    }

    setOpen((currentOpen) => !currentOpen);
  }, [isMobile]);

  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcut);
    return () => window.removeEventListener("keydown", handleKeyboardShortcut);
  }, [toggleSidebar]);

  const value = useMemo<SidebarContextValue>(
    () => ({
      state: open ? "expanded" : "collapsed",
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [isMobile, open, openMobile, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={value}>
      <div
        className={cn(
          "flex min-h-[100dvh] w-full bg-[#fafafa] md:h-[100dvh] md:min-h-0 md:overflow-hidden",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

// 渲染桌面可折叠侧栏，并在移动端切换为遮罩抽屉。
function Sidebar({ className, children, ...props }: ComponentProps<"aside">) {
  const { state, isMobile, openMobile, setOpenMobile } = useSidebar();

  useEffect(() => {
    if (!openMobile) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMobile(false);
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [openMobile, setOpenMobile]);

  return (
    <>
      {openMobile && (
        <button
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] md:hidden"
          type="button"
          aria-label="关闭导航抽屉"
          onClick={() => setOpenMobile(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(18rem,calc(100vw-3rem))] shrink-0 flex-col border-r border-zinc-200 bg-white transition-[width,transform] duration-200 ease-out",
          openMobile ? "translate-x-0" : "-translate-x-full",
          "md:static md:z-auto md:translate-x-0",
          state === "collapsed" ? "md:w-[72px]" : "md:w-[300px]",
          className,
        )}
        data-mobile={isMobile || undefined}
        data-state={state}
        aria-hidden={isMobile && !openMobile}
        inert={isMobile && !openMobile ? true : undefined}
        {...props}
      >
        {children}
      </aside>
    </>
  );
}

function SidebarHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex shrink-0", className)} {...props} />;
}

function SidebarContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("min-h-0 flex-1 overflow-y-auto", className)}
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("shrink-0", className)} {...props} />;
}

// 提供带可访问状态描述的 Sidebar 开关按钮。
function SidebarTrigger({ className, ...props }: ComponentProps<typeof Button>) {
  const { state, isMobile, openMobile, toggleSidebar } = useSidebar();
  const isOpen = isMobile ? openMobile : state === "expanded";
  const label = isOpen ? "收起导航栏" : "展开导航栏";

  return (
    <Button
      className={cn("shrink-0", className)}
      size="icon"
      variant="ghost"
      type="button"
      aria-label={label}
      aria-expanded={isOpen}
      title={`${label}（Ctrl+B）`}
      onClick={toggleSidebar}
      {...props}
    >
      <PanelLeft className="size-5" aria-hidden="true" />
    </Button>
  );
}

function SidebarInset({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex min-h-0 min-w-0 flex-1 flex-col", className)}
      {...props}
    />
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
};
