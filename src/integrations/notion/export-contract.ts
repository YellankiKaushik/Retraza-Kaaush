export interface NotionPlanExportInput {
    userId: string;
    planId: string;
    versionId: string;
    title: string;
    summary: string | null;
    sections: Array<{
        heading: string;
        body: string;
    }>;
}

export interface NotionPlanExportResult {
    provider: "notion";
    pageId: string;
    url: string;
}

export interface NotionPlanExporter {
    exportPlan(input: NotionPlanExportInput): Promise<NotionPlanExportResult>;
}

export class NotionExportUnavailable implements NotionPlanExporter {
    async exportPlan(): Promise<NotionPlanExportResult> {
        throw new Error("Export Plan to Notion is not implemented in the MVP.");
    }
}

export function createNotionPlanExporter(): NotionPlanExporter {
    return new NotionExportUnavailable();
}
