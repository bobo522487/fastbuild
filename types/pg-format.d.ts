declare module 'pg-format' {
  export function format(fmt: string, ...args: any[]): string;
  export function formatWithArray(fmt: string, args: any[]): string;
  export function ident(name: string): string;
  export function literal(value: any): string;
  export function string(str: string): string;
  export function dollar(value: any): string;
}