import { fetchCached } from "../internal/utils/fetchCached.js";

// 白名单: 只允许抓自己仓库的规则文件
const ALLOWED_HOST = "raw.githubusercontent.com";
const ALLOWED_PATH_PREFIX = "/euv7duv/";

export async function onRequest (context) {
    const { request } = context;
    const URLObject = new URL(request.url);

    const targetURL = URLObject.searchParams.get("target") as unknown as string;

    if (!targetURL) {
        return new Response("400 Bad Request. 'target' required.", {
            status: 400,
            headers: {
                "Content-Type": "text/plain; charset=utf-8"
            }
        })
    }

    let target;
    try {
        target = new URL(targetURL);
    } catch {
        return new Response("400 Bad Request. Invalid URL.", {
            status: 400,
            headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
    }

    // 只允许 http/https
    if (target.protocol !== "http:" && target.protocol !== "https:") {
        return new Response("403 Forbidden. Protocol not allowed.", {
            status: 403,
            headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
    }

    // 白名单: 域名 + 路径前缀
    if (target.hostname !== ALLOWED_HOST || !target.pathname.startsWith(ALLOWED_PATH_PREFIX)) {
        return new Response("403 Forbidden. Host not allowed.", {
            status: 403,
            headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
    }

    let RawData = await fetch(targetURL);
    return new Response(RawData.body, {
        status: 200,
        headers: RawData.headers
    })
}
