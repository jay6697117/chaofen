import { serveDir } from "https://deno.land/std@0.224.0/http/file_server.ts";

Deno.serve((req: Request) => {
  return serveDir(req, {
    // 静态文件根目录就是项目根目录
    fsRoot: ".",
    // 自动查找 index.html
    showIndex: true,
  });
});
