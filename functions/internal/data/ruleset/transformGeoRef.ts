export type headlessRuleSet = {
    type: "remote",
    tag: string,
    url: string,
    format: "binary" | "source",
}


export function transformGeoRef (
    type: string, 
    payload: string, 
    EdgeSubInstanceBaseURL,
    AccessToken?: string
): { 
    headlessRule: any, 
    headlessRuleSet: headlessRuleSet | null
} {
    const RuleSetTag = `${type}-${payload.toLowerCase()}`;

    if (RuleSetTag === "geoip-lan") {
        return {
            headlessRule: {
                ip_is_private: true,
        
            },
            headlessRuleSet: null
        }
    }

    // let edge-sub preprocess the rule-set
    // construct url
        let RuleSetURLObject = new URL(EdgeSubInstanceBaseURL);
            RuleSetURLObject.pathname = "/ruleset/proxy";
            RuleSetURLObject.search = "";
            const geoRepoBase = type === "geosite"
                ? "https://raw.githubusercontent.com/euv7duv/EdgeSub/main/rules/sing-geosite"
                : "https://raw.githubusercontent.com/SagerNet/sing-geoip/rule-set";
            RuleSetURLObject.searchParams.append("target", `${geoRepoBase}/${RuleSetTag}.srs`);
            if (AccessToken) { RuleSetURLObject.searchParams.append("token", AccessToken); }
    const RuleSetURL = RuleSetURLObject.toString();

    return {
        headlessRule: {
            rule_set: RuleSetTag,
        },
        headlessRuleSet: {
            type: "remote",
            tag: RuleSetTag,
            format: "binary",
            url: RuleSetURL,
        }
    }
}