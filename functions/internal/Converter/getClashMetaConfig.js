import { TrulyAssign } from "../utils/TrulyAssign";
import { parseYAML } from "confbox";
import ClashMetaDumper from "../Dumpers/clash-meta.js";

const BasicConfig = {
    isUDP: true,
    isSSUoT: false,
    isInsecure: true,
    RuleProvider: "https://raw.githubusercontent.com/euv7duv/EdgeSub/main/rules/ACL4SSR/ACL4SSR_Online_Full.ini",
    RuleProvidersProxy: false,
    BaseConfig: "https://raw.githubusercontent.com/euv7duv/EdgeSub/main/public/basic-config/mihomo.yaml",
    // BaseConfig: "https://raw.githubusercontent.com/kobe-koto/EdgeSub/main/public/basic-config/mihomo.yaml",
    isForcedRefresh: false
}

import { RuleProviderReader } from "../RuleProviderReader/main.js";

export async function getClashMetaConfig (
    Proxies,
    EdgeSubDB,
    PassedConfig = {},
) {
    const Config = TrulyAssign(BasicConfig, PassedConfig);
    console.log(`[getClashMetaConfig] fetching base config from remote (${Config.BaseConfig})`)
    const ClashConfig = parseYAML(await fetch(Config.BaseConfig).then(res => res.text()));
    console.log("[getClashMetaConfig] fetched base config", ClashConfig)
    let RuleProvider = await (new RuleProviderReader(Config.RuleProvider)).Process(EdgeSubDB, Config.isForcedRefresh)
    let Dumper = new ClashMetaDumper(Config.isUDP, Config.isSSUoT, Config.isInsecure)
    Proxies = Proxies.map(i => {
        if (Dumper.__validate(i)) {
            i.Hostname = i.Hostname.replace(/(^\[|\]$)/g, "");
            return i;
        }
    }).filter(i => !!i);
    ClashConfig.proxies = Proxies.map(i => Dumper[i.__Type](i));
    ClashConfig["proxy-groups"] = []
    for (let i of RuleProvider.ProxyGroup) {
        let MatchedProxies = [];
        for (let t of i.RegExps) {
            MatchedProxies = [ ...MatchedProxies, ...Proxies.filter( loc => loc.__Remark.match(new RegExp(t)) ) ]
        }
        MatchedProxies = Array.from(new Set(MatchedProxies));
        let GroupProxies = [];
        for (let t of i.GroupSelectors) {
            GroupProxies.push(t.replace(/^\[\]/, ""))
        }
        for (let t of MatchedProxies) {
            GroupProxies.push(t.__Remark)
        }
        if (MatchedProxies.length + i.GroupSelectors.length === 0) {
            GroupProxies.push("DIRECT")
            GroupProxies.push("REJECT")
        }
        let ProxyGroup = {}
        ProxyGroup.name = i.name;
        ProxyGroup.type = i.type;
        if (i.type === "url-test" || i.type === "load-balance" || i.type === "fallback") {
            ProxyGroup.url = i.TestConfig.TestURL;
            ProxyGroup.interval = i.TestConfig.Interval;
        }
        if (i.type === "url-test") {
            ProxyGroup.tolerance = i.TestConfig.Tolerance;
        }
        ProxyGroup.proxies = GroupProxies;
        ClashConfig["proxy-groups"].push(ProxyGroup)
    }
    ClashConfig["rule-providers"] = {};
    let RuleProvidersMapping = {};
    for (let i in RuleProvider.RuleProviders) {
        for (let t in RuleProvider.RuleProviders[i]) {
            const RuleProviderPayload = RuleProvider.RuleProviders[i][t];
            const RuleProviderID = `${i}__${t}`;
            RuleProvidersMapping[RuleProviderPayload] = RuleProviderID;
            let RuleProviderURL;
            if (Config.RuleProvidersProxy) {
                let RuleProviderURLObject = new URL(Config.RuleProvidersProxy);
                RuleProviderURLObject.pathname = "/ruleset/proxy"
                RuleProviderURLObject.search = ""
                RuleProviderURLObject.searchParams.append("target", RuleProviderPayload)
                if (Config.AccessToken) { RuleProviderURLObject.searchParams.append("token", Config.AccessToken); }
                RuleProviderURL = RuleProviderURLObject.toString()
            } else {
                RuleProviderURL = RuleProviderPayload;
            }
            ClashConfig["rule-providers"][RuleProviderID] = {
                type: "http",
                behavior: "classical",
                url: RuleProviderURL,
                format: (RuleProviderPayload.endsWith(".yaml") || RuleProviderPayload.endsWith(".yml")) ? "yaml" : "text",
                interval: 21600
            }
        }
    }
    ClashConfig.rules = []
    for (let i of RuleProvider.Rules) {
        const rulesetBreakdown = i.split(",")
        const id = rulesetBreakdown[0];
        let payload = rulesetBreakdown.slice(1).join(",");
        if (payload.startsWith("http://") || payload.startsWith("https://")) {
            payload = `RULE-SET,${RuleProvidersMapping[payload]}`;
        }
        ClashConfig.rules.push(`${payload},${id}`)
    }
    return ClashConfig;
}
