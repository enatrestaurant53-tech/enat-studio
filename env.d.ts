declare module 'qz-tray';

// Fix: Define VercelRequest and VercelResponse as interfaces within the module to allow them to be used as types.
declare module '@vercel/node' {
  export interface VercelRequest {
    method?: string;
    query: { [key: string]: string | string[] | undefined };
    body: any;
  }
  export interface VercelResponse {
    status: (code: number) => VercelResponse;
    json: (body: any) => VercelResponse;
    end: (body?: any) => void;
    setHeader: (name: string, value: string) => VercelResponse;
  }
}
