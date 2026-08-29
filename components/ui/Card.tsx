import { HTMLAttributes } from "react";

// Border-only, no shadow by default — an institutional data product reads
// as flat and calm; shadows on every content block is the "SaaS template"
// tell. Elevated/floating elements (menus, modals) opt into a shadow
// explicitly via className instead of getting one by default here.
export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-lg border border-border bg-surface ${className}`} {...props} />;
}

export function CardBody({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-5 ${className}`} {...props} />;
}
