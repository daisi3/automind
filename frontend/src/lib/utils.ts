import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// 合并条件 className，并解决 Tailwind 工具类冲突。
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
