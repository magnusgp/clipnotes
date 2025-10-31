import { vi } from "vitest";

import type { ClipRegistration, ClipAnalysis } from "../../src/hooks/useAnalyze";
import type { ClipListItem } from "../../src/hooks/useClips";

interface MockAnalyzeContext {
  removeClip: (clipId: string) => void;
}

type ExtraHandler = (
  url: string,
  init: RequestInit | undefined,
  context: MockAnalyzeContext,
) => Promise<Response | undefined> | Response | undefined;

export interface MockAnalyzeFlow {
  registration: ClipRegistration;
  analysis: ClipAnalysis;
  assetId?: string;
}

function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
}

export function setupAnalyzeFlowMock(
  flows: MockAnalyzeFlow[],
  extraHandler?: ExtraHandler,
) {
  const pending = new Map<string, MockAnalyzeFlow>();
  const clipList: ClipListItem[] = [];
  const flowQueue = [...flows];

  const context: MockAnalyzeContext = {
    removeClip: (clipId) => {
      const index = clipList.findIndex((item) => item.clip_id === clipId);
      if (index >= 0) {
        clipList.splice(index, 1);
      }
    },
  };

  return vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
    const method = (init?.method ?? "GET").toUpperCase();
    const url = getRequestUrl(input);

    if (url.endsWith("/api/clips") && method === "GET") {
      return new Response(JSON.stringify({ items: clipList }), { status: 200 });
    }

    if (url.endsWith("/api/clips") && method === "POST") {
      const nextFlow = flowQueue.shift();
      if (!nextFlow) {
        throw new Error("No mock clip registration available");
      }

      pending.set(nextFlow.registration.clip_id, nextFlow);

      const entry: ClipListItem = {
        clip_id: nextFlow.registration.clip_id,
        filename: nextFlow.registration.filename,
        status: nextFlow.registration.status,
        created_at: nextFlow.registration.created_at,
        last_analysis_at: nextFlow.registration.last_analysis_at,
        latency_ms: nextFlow.registration.latency_ms,
      };

      const existingIndex = clipList.findIndex((item) => item.clip_id === entry.clip_id);
      if (existingIndex >= 0) {
        clipList.splice(existingIndex, 1, entry);
      } else {
        clipList.unshift(entry);
      }

      return new Response(JSON.stringify(nextFlow.registration), { status: 201 });
    }

    if (url.includes("/api/clips/") && url.endsWith("/asset") && method === "POST") {
      const segments = url.split("/");
      const clipId = segments[segments.length - 2];
      const flow = pending.get(clipId);
      if (!flow) {
        throw new Error(`Unexpected asset upload request for ${clipId}`);
      }

      const assetId = flow.assetId ?? `asset-${clipId}`;
      flow.registration = {
        ...flow.registration,
        asset_id: assetId,
      };

      return new Response(JSON.stringify(flow.registration), { status: 202 });
    }

    if (url.includes("/api/analysis/") && method === "POST") {
      const clipId = url.split("/").pop() ?? "";
      const flow = pending.get(clipId);
      if (!flow) {
        throw new Error(`Unexpected analysis request for ${clipId}`);
      }

      const entry: ClipListItem = {
        clip_id: flow.registration.clip_id,
        filename: flow.registration.filename,
        status: "ready",
        created_at: flow.registration.created_at,
        last_analysis_at: flow.analysis.created_at,
        latency_ms: flow.analysis.latency_ms,
      };

      const existingIndex = clipList.findIndex((item) => item.clip_id === clipId);
      if (existingIndex >= 0) {
        clipList.splice(existingIndex, 1, entry);
      } else {
        clipList.unshift(entry);
      }

      return new Response(JSON.stringify(flow.analysis), { status: 202 });
    }

    if (extraHandler) {
      const result = await extraHandler(url, init, context);
      if (result) {
        return result;
      }
    }

    throw new Error(`Unexpected fetch call to ${url} with method ${method}`);
  });
}
