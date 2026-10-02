import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { JsonSchemaNode } from "./JsonSchemaForm";

export interface PluginSetup {
  instructions: string[];
  links: Array<{ label: string; url: string }>;
  callbackRoute: string;
  originField: string;
  credentialFields: string[];
  continueLabel: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isHttpsLink(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch { return false; }
}

/** Manifest hints are display data, never HTML or executable templates. */
export function getPluginSetup(schema: JsonSchemaNode): PluginSetup | null {
  const value = schema["x-paperclip-setup"];
  if (!isRecord(value) || !Array.isArray(value.instructions) || !value.instructions.every((item) => typeof item === "string")) return null;
  if (!Array.isArray(value.links) || !value.links.every((item) => isRecord(item) && typeof item.label === "string" && isHttpsLink(item.url))) return null;
  if (typeof value.callbackRoute !== "string" || !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(value.callbackRoute)) return null;
  if (typeof value.originField !== "string" || typeof value.continueLabel !== "string") return null;
  if (!Array.isArray(value.credentialFields) || !value.credentialFields.length || !value.credentialFields.every((field) => typeof field === "string" && schema.properties?.[field]?.format === "secret-ref")) return null;
  return value as unknown as PluginSetup;
}

export function setupCallbackUrl(setup: PluginSetup, values: Record<string, unknown>, companyPrefix: string | null, currentOrigin: string): string | null {
  if (!companyPrefix) return null;
  const configured = values[setup.originField];
  const origin = typeof configured === "string" && configured.trim() ? configured.trim() : currentOrigin;
  try {
    const url = new URL(origin);
    const local = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
    if ((!local && url.protocol !== "https:") || url.origin !== origin.replace(/\/$/, "")) return null;
    return new URL(`/${encodeURIComponent(companyPrefix)}/${setup.callbackRoute}`, url.origin).toString();
  } catch { return null; }
}

export function countSetupCredentials(setup: PluginSetup, values: Record<string, unknown>): number {
  return setup.credentialFields.filter((field) => {
    const value = values[field];
    return isRecord(value) && value.type === "secret_ref" && typeof value.secretId === "string" && value.secretId.trim();
  }).length;
}

export function PluginSetupGuide({ setup, callbackUrl, savedCredentialCount }: {
  setup: PluginSetup;
  callbackUrl: string | null;
  savedCredentialCount: number;
}) {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground" role="status">{savedCredentialCount} of {setup.credentialFields.length} credentials saved</p>
      <section className="space-y-4" aria-label="Create your OAuth client">
        <h3 className="text-base font-semibold">1. Create your OAuth client</h3>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {setup.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}
        </ul>
        <div className="flex flex-wrap gap-3">
          {setup.links.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm underline underline-offset-4">{link.label}<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a>)}
        </div>
        <div className="space-y-2 rounded-md border border-border bg-muted/20 p-4">
          <p className="text-sm font-medium">Authorized redirect URI</p>
          {callbackUrl ? <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <code className="min-w-0 break-all font-mono text-xs select-all">{callbackUrl}</code>
            <Button type="button" variant="outline" size="sm" className="shrink-0 self-start" onClick={async () => {
              try { await navigator.clipboard.writeText(callbackUrl); setCopiedUrl(callbackUrl); setCopyError(false); }
              catch { setCopyError(true); }
            }}>{copiedUrl === callbackUrl ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copiedUrl === callbackUrl ? "Copied" : "Copy URI"}</Button>
          </div> : <p className="text-sm text-destructive">Choose an organization and enter a valid Paperclip origin in Optional settings to show the redirect URI.</p>}
          <p className="text-xs text-muted-foreground">Copy this exact company URL into your OAuth client. It uses your public Paperclip origin when configured, or this browser’s address for local setup.</p>
          {copyError ? <p className="text-xs text-destructive" role="alert">Copy failed. Select and copy the URL above.</p> : null}
        </div>
      </section>
      <section className="space-y-1" aria-label="Add your credentials">
        <h3 className="text-base font-semibold">2. Add your credentials</h3>
        <p className="text-sm text-muted-foreground">Create a secret for each credential below, or select an existing one. The names are filled in for you.</p>
      </section>
    </div>
  );
}
