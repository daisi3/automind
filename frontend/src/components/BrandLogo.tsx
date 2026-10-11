import { Link } from "react-router-dom";
import { Car } from "lucide-react";

// 展示返回对话主页的 AutoMind 品牌入口。
function BrandLogo() {
  return (
    <Link
      className="flex items-center gap-2.5 text-zinc-950 no-underline"
      to="/chat"
    >
      <span className="grid size-10 place-items-center rounded-lg bg-zinc-950 text-sm font-semibold text-white">
        <Car />
      </span>
      <span className="text-[24px] font-semibold tracking-tight">AutoMind</span>
    </Link>
  );
}

export default BrandLogo;
