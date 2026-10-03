async function AccessControl (context) {
    const url = new URL(context.request.url);
    const token = context.env.ACCESS_TOKEN;
    const protectedPath = url.pathname.startsWith("/sub/") || url.pathname.startsWith("/short/") || url.pathname.startsWith("/ruleset/");
    if (token && protectedPath && url.searchParams.get("token") !== token) {
        return new Response("Not Found", { status: 404 });
    }
    return await context.next();
}

async function RequestInfo (context) {
    const Path = (new URL(context.request.url)).pathname;
    console.info("[Main] Processing request...")
    console.info(`[Main] Request type: ${Path}`)

    return await context.next();
}

async function PerformanceCounting (context) {
    const __startTime = performance.now();

    const response = await context.next();
    
    console.info(`[PerformanceCounting] we've done this glory, totally wasting ${performance.now() - __startTime}ms.`)

    return response;
}

export const onRequest = [AccessControl, RequestInfo, PerformanceCounting];
