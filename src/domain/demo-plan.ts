import type { GraphEdge, GraphNode } from "./types";

export const DEMO_GOAL =
    "I want to become a product manager in six months. I work full-time, have no formal PM experience, and can dedicate 10 hours every week.";
export const DEMO_STORAGE_KEY = "reversepath:prepared-demo:v1";

const tasks = [
    [
        "baseline",
        "Month 1 · Choose your target",
        "Compare three associate PM job descriptions",
        "Spend 45 minutes collecting three associate PM roles. List repeated skills and score your evidence for each skill from 0 to 2.",
        "Three saved job descriptions and a skills gap table.",
        45,
    ],
    [
        "research",
        "Month 1 · Learn from users",
        "Interview three users about one product problem",
        "Choose a familiar product and schedule three 20-minute conversations. Ask about the last time the problem happened, then summarize patterns.",
        "Three interview notes and one evidence-backed problem statement.",
        90,
    ],
    [
        "case-study",
        "Months 2–3 · Build evidence",
        "Write a product case study from your research",
        "Draft the problem, target user, proposed change, alternatives, success metric, and trade-offs. Reserve two hours per week for four weeks.",
        "One case study with user evidence, a prioritized solution, and a measurable outcome.",
        480,
    ],
    [
        "feedback",
        "Month 4 · Get feedback",
        "Ask two working PMs to review your case study",
        "Send your case study to two PMs and ask what evidence or reasoning is missing. Revise the weakest section using their feedback.",
        "Two feedback conversations and a revised case study.",
        120,
    ],
    [
        "interviews",
        "Month 5 · Practice",
        "Complete two mock product interviews",
        "Practice product sense and prioritization with a peer. Record one session and write down three improvements before the second session.",
        "Two practice sessions and a short improvement log.",
        120,
    ],
    [
        "applications",
        "Month 6 · Apply and learn",
        "Submit five tailored associate PM applications",
        "Match your portfolio evidence to five relevant roles. Track each application and schedule a weekly review of responses and skill gaps.",
        "Five tailored applications with a dated follow-up tracker.",
        180,
    ],
] as const;

export const DEMO_NODES: GraphNode[] = tasks.map(
    ([id, phase, title, description, criteria, minutes], index) => ({
        id,
        node_type: "ACTION",
        title,
        description,
        status: "PENDING",
        priority_score: null,
        depth: index + 1,
        strategy_id: null,
        metadata: {
            phase,
            completionCriteria: criteria,
            estimatedMinutes: minutes,
            impact: 4,
            urgency: 4,
            effortCost: 2,
            successLikelihood: 0.75,
        },
    }),
);

export const DEMO_EDGES: GraphEdge[] = DEMO_NODES.slice(1).map((node, index) => ({
    id: `dependency-${index}`,
    from_node_id: DEMO_NODES[index]!.id,
    to_node_id: node.id,
    edge_type: "PRECEDES",
    hard_dependency: true,
    rationale: "Use the evidence from the previous step before starting this one.",
}));

export function restoreDemoProgress(raw: string | null): { loaded: boolean; completed: string[] } {
    if (!raw) return { loaded: false, completed: [] };
    try {
        const parsed: unknown = JSON.parse(raw);
        if (
            !parsed ||
            typeof parsed !== "object" ||
            !("completed" in parsed) ||
            !Array.isArray(parsed.completed)
        ) {
            return { loaded: false, completed: [] };
        }
        const ids = new Set(parsed.completed.filter((id): id is string => typeof id === "string"));
        // Only restore a valid completed prefix of the dependency chain.
        const completed: string[] = [];
        for (const node of DEMO_NODES) {
            if (!ids.has(node.id)) break;
            completed.push(node.id);
        }
        return { loaded: "loaded" in parsed && parsed.loaded === true, completed };
    } catch {
        return { loaded: false, completed: [] };
    }
}
