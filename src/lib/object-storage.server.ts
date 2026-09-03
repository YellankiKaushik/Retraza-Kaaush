import type { SupabaseClient } from "@supabase/supabase-js";

export type ObjectStorageKind = "attachment" | "export" | "archive" | "document";

export interface StoredObjectReference {
    provider: "supabase";
    bucket: string;
    path: string;
    kind: ObjectStorageKind;
}

export interface ObjectStorage {
    put(input: {
        kind: ObjectStorageKind;
        ownerId: string;
        path: string;
        body: Blob | ArrayBuffer | Uint8Array;
        contentType: string;
    }): Promise<StoredObjectReference>;
    createSignedReadUrl(input: {
        bucket: string;
        path: string;
        expiresInSeconds?: number;
    }): Promise<string>;
    remove(input: { bucket: string; path: string }): Promise<void>;
}

function cleanPathSegment(value: string) {
    return value.replace(/[^a-zA-Z0-9._/-]/g, "_").replace(/^\/+/, "");
}

export class SupabaseObjectStorage implements ObjectStorage {
    constructor(
        private readonly supabase: SupabaseClient,
        private readonly bucket = process.env["SUPABASE_STORAGE_BUCKET"] ?? "reversepath-files",
    ) {}

    async put(input: {
        kind: ObjectStorageKind;
        ownerId: string;
        path: string;
        body: Blob | ArrayBuffer | Uint8Array;
        contentType: string;
    }) {
        const path = `${cleanPathSegment(input.ownerId)}/${input.kind}/${cleanPathSegment(input.path)}`;
        const { error } = await this.supabase.storage.from(this.bucket).upload(path, input.body, {
            contentType: input.contentType,
            upsert: false,
        });
        if (error) throw new Error(`Supabase storage upload failed: ${error.message}`);
        return { provider: "supabase" as const, bucket: this.bucket, path, kind: input.kind };
    }

    async createSignedReadUrl(input: { bucket: string; path: string; expiresInSeconds?: number }) {
        const { data, error } = await this.supabase.storage
            .from(input.bucket)
            .createSignedUrl(input.path, input.expiresInSeconds ?? 300);
        if (error) throw new Error(`Supabase storage signed URL failed: ${error.message}`);
        return data.signedUrl;
    }

    async remove(input: { bucket: string; path: string }) {
        const { error } = await this.supabase.storage.from(input.bucket).remove([input.path]);
        if (error) throw new Error(`Supabase storage delete failed: ${error.message}`);
    }
}

export function createObjectStorage(supabase: SupabaseClient): ObjectStorage {
    const provider = process.env["OBJECT_STORAGE_PROVIDER"] ?? "supabase";
    if (provider !== "supabase") {
        throw new Error(
            "Only Supabase Storage is implemented for the MVP. Large-object adapters can be added later.",
        );
    }
    return new SupabaseObjectStorage(supabase);
}
